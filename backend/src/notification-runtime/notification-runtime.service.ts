import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  NotificationChannel,
  Role,
  type NotificationJob,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

/** Yêu cầu tạo job — payload CHỈ lưu nội bộ, không bao giờ trả ra API. */
export interface NotificationJobRequest {
  channel: string;
  targetType?: string; // USER (mặc định) — mở rộng MEMBER/ROLE sau
  targetId?: string | null;
  title: string;
  bodySummary?: string;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
  aiActionId?: string;
}

const VALID_CHANNELS: NotificationChannel[] = ['IN_APP', 'EMAIL', 'TELEGRAM'];

/**
 * Hermes Notification Runtime (Epic 8) — nền tảng gửi thông báo qua adapter
 * quanh HẠ TẦNG CÓ SẴN, không provider mới, không broker, không scheduler.
 *
 * Trạng thái job:
 * - READY: đã gửi thật qua hạ tầng có sẵn (in-app record / SMTP đã cấu hình).
 * - DRY_RUN: channel chưa sẵn sàng/chưa xác minh an toàn — ghi nhận, KHÔNG gửi.
 * - FAILED: adapter lỗi — errorMessage generic (chi tiết chỉ ở server log).
 *
 * Hợp đồng an toàn:
 * - dispatch() KHÔNG BAO GIỜ throw về caller nghiệp vụ (log-only) — business
 *   transaction đã commit trước đó không bị ảnh hưởng.
 * - Idempotent theo (clubId, channel, idempotencyKey) — guard service + unique index.
 * - Response luôn sanitize: payloadJson bị strip, chỉ trả payloadSummary metadata.
 */
@Injectable()
export class NotificationRuntimeService {
  private readonly logger = new Logger(NotificationRuntimeService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  // ---------- Sanitization ----------
  private summarizePayload(obj: unknown) {
    if (!obj || typeof obj !== 'object') {
      return { fieldNames: [] as string[], fieldCount: 0, approxSizeBytes: 0 };
    }
    const fieldNames = Object.keys(obj);
    return {
      fieldNames,
      fieldCount: fieldNames.length,
      approxSizeBytes: JSON.stringify(obj).length,
    };
  }

  /** Strip payloadJson thô — chỉ trả metadata. */
  private toJobResponse(job: Record<string, unknown>) {
    const { payloadJson, ...safe } = job;
    return { ...safe, payloadSummary: this.summarizePayload(payloadJson) };
  }

  private sanitizeError(e: unknown): string {
    const detail = e instanceof Error ? (e.stack ?? e.message) : String(e);
    this.logger.error(`Notification adapter lỗi: ${detail}`);
    return 'Gửi thông báo thất bại. Xem log máy chủ.';
  }

  private requireClub(clubId: string | null): string {
    if (!clubId)
      throw new ForbiddenException('Tài khoản chưa gắn với CLB nào.');
    return clubId;
  }

  /**
   * Email THẬT (gửi được): đúng dạng local@domain.tld và KHÔNG phải placeholder .local.
   * Tài khoản member tạo không kèm email được gán `${username}@<club>.picklefund.local`
   * — chặn để không gửi ra ngoài (bounce/uy tín domain).
   */
  private isRealEmail(email: string): boolean {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && !/\.local$/i.test(email);
  }

  /**
   * Sender "mang danh" CLB cho email: fromName = tên CLB, replyTo = email admin CLB
   * (ưu tiên CLB_ADMIN rồi SUPER_ADMIN, đang active, email thật). Không đổi FROM address
   * thực (Gmail chặn giả mạo). Thiếu dữ liệu → undefined (dùng SMTP_FROM mặc định).
   */
  private async resolveClubSender(
    clubId: string,
  ): Promise<{ replyTo?: string; fromName?: string }> {
    const [club, admins] = await Promise.all([
      this.prisma.club.findUnique({
        where: { id: clubId },
        select: { name: true },
      }),
      this.prisma.user.findMany({
        where: {
          clubId,
          isActive: true,
          role: { in: [Role.CLUB_ADMIN, Role.SUPER_ADMIN] },
        },
        select: { email: true, role: true },
      }),
    ]);
    // Ưu tiên tường minh CLB_ADMIN → SUPER_ADMIN (KHÔNG dựa thứ tự enum DB), email thật.
    const real = admins.filter((a) => a.email && this.isRealEmail(a.email));
    const chosen =
      real.find((a) => a.role === Role.CLUB_ADMIN) ??
      real.find((a) => a.role === Role.SUPER_ADMIN);
    return {
      replyTo: chosen?.email ?? undefined,
      fromName: club?.name ?? undefined,
    };
  }

  // ---------- Channel status (admin visibility) ----------
  channelStatus() {
    return {
      IN_APP: { available: true, mode: 'READY' },
      EMAIL: {
        available: this.email.isEnabled,
        mode: this.email.isEnabled ? 'READY' : 'DRY_RUN',
      },
      // Epic 8 foundation: Telegram adapter tồn tại nhưng CHƯA xác minh an toàn
      // production trong scope này → luôn DRY_RUN (không gửi thật).
      TELEGRAM: { available: false, mode: 'DRY_RUN' },
    };
  }

  // ---------- Job listing (admin, sanitized) ----------
  async listJobs(clubIdRaw: string | null, status?: string) {
    const clubId = this.requireClub(clubIdRaw);
    const jobs = await this.prisma.notificationJob.findMany({
      where: {
        clubId,
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return jobs.map((j) => this.toJobResponse(j));
  }

  // ---------- Runtime dispatch ----------
  /**
   * Tạo NotificationJob + chạy adapter. KHÔNG BAO GIỜ throw (trừ Forbidden
   * thiếu tenant khi gọi trực tiếp từ API) — lỗi adapter → job FAILED.
   * Trả về job đã sanitize, hoặc null nếu input không hợp lệ/duplicate lỗi.
   */
  async dispatch(clubIdRaw: string | null, req: NotificationJobRequest) {
    const clubId = this.requireClub(clubIdRaw);
    const channel = (req.channel ?? '').toUpperCase() as NotificationChannel;
    if (!VALID_CHANNELS.includes(channel)) {
      // Không throw về business flow — ghi nhận FAILED có kiểm soát.
      this.logger.warn(`Channel không hỗ trợ: ${String(req.channel)}`);
      return null;
    }
    const key = req.idempotencyKey?.trim() ? req.idempotencyKey.trim() : null;

    // Idempotency: key đã dùng cho (club, channel) → trả job cũ, KHÔNG gửi lại.
    if (key) {
      const existing = await this.prisma.notificationJob.findFirst({
        where: { clubId, channel, idempotencyKey: key },
      });
      if (existing) {
        return { ...this.toJobResponse(existing), duplicate: true };
      }
    }

    const job = await this.createJobRow(clubId, channel, key, req);
    if (!job) return null;

    // Chạy adapter — lỗi KHÔNG nổi lên caller.
    try {
      const result = await this.runAdapter(clubId, channel, job.id, req);
      const updated = await this.prisma.notificationJob.update({
        where: { id: job.id },
        data: {
          status: result.sent ? 'READY' : 'DRY_RUN',
          sentAt: result.sent ? new Date() : null,
        },
      });
      this.logger.log(
        `Notification job ${job.id} [${channel}] → ${result.sent ? 'READY' : 'DRY_RUN'} (${result.note})`,
      );
      return this.toJobResponse(updated);
    } catch (e) {
      const failed = await this.prisma.notificationJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', errorMessage: this.sanitizeError(e) },
      });
      return this.toJobResponse(failed);
    }
  }

  /** Tạo row job — race unique (P2002) coi là duplicate; lỗi khác log, không throw. */
  private async createJobRow(
    clubId: string,
    channel: NotificationChannel,
    key: string | null,
    req: NotificationJobRequest,
  ): Promise<NotificationJob | null> {
    try {
      return await this.prisma.notificationJob.create({
        data: {
          clubId,
          channel,
          targetType: req.targetType ?? 'USER',
          targetId: req.targetId ?? null,
          title: req.title,
          bodySummary: req.bodySummary?.slice(0, 300) ?? null,
          payloadJson: (req.payload ?? undefined) as Prisma.InputJsonValue,
          status: 'DRY_RUN',
          idempotencyKey: key,
          aiActionId: req.aiActionId ?? null,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        this.logger.log(`Job duplicate theo idempotencyKey (${key ?? ''}).`);
        return null;
      }
      this.sanitizeError(e);
      return null;
    }
  }

  // ---------- Adapters (chỉ quanh hạ tầng có sẵn) ----------
  private async runAdapter(
    clubId: string,
    channel: NotificationChannel,
    jobId: string,
    req: NotificationJobRequest,
  ): Promise<{ sent: boolean; note: string }> {
    if (channel === 'IN_APP') return this.inAppAdapter(clubId, req);
    if (channel === 'EMAIL') return this.emailAdapter(clubId, req);
    return this.telegramAdapter();
  }

  /** In-app: ghi record vào bảng notifications có sẵn (target USER cụ thể). */
  private async inAppAdapter(clubId: string, req: NotificationJobRequest) {
    if ((req.targetType ?? 'USER') !== 'USER' || !req.targetId) {
      return { sent: false, note: 'in-app cần targetType=USER + targetId' };
    }
    const user = await this.prisma.user.findFirst({
      where: { id: req.targetId, clubId },
      select: { id: true },
    });
    if (!user) {
      // Không cross-club: target ngoài club → DRY_RUN, không gửi.
      return { sent: false, note: 'target không thuộc club (chặn cross-club)' };
    }
    await this.prisma.notification.create({
      data: {
        userId: user.id,
        clubId,
        eventType: 'HERMES_RUNTIME',
        priority: 'MEDIUM',
        channel: 'IN_APP',
        title: req.title,
        body: req.bodySummary ?? req.title,
        status: 'SENT',
        sentAt: new Date(),
      },
    });
    return { sent: true, note: 'in-app record created' };
  }

  /** Email: dùng EmailService có sẵn — SMTP chưa cấu hình → DRY_RUN. */
  private async emailAdapter(clubId: string, req: NotificationJobRequest) {
    if (!this.email.isEnabled) {
      return { sent: false, note: 'SMTP chưa cấu hình — DRY_RUN' };
    }
    if (!req.targetId) {
      return { sent: false, note: 'email cần targetId' };
    }
    // Địa chỉ nhận theo targetType — MEMBER → email Liên hệ (Member.email, fallback email
    // tài khoản); USER → email tài khoản. Lookup scope clubId (chống cross-club), không
    // tiết lộ tồn tại. Địa chỉ được RESOLVE ở server (không tin email do caller truyền).
    const to = await this.resolveRecipientEmail(
      clubId,
      req.targetType ?? 'USER',
      req.targetId,
    );
    if (!to)
      return { sent: false, note: 'target không gửi được trong club này' };
    // Chặn email placeholder (.local) / không hợp lệ — không gửi để tránh bounce.
    if (!this.isRealEmail(to))
      return {
        sent: false,
        note: 'email placeholder/không hợp lệ — không gửi',
      };
    // Email "mang danh" CLB: tên hiển thị = tên CLB, Reply-To = email admin CLB.
    const sender = await this.resolveClubSender(clubId);
    const ok = await this.email.send(
      to,
      req.title,
      this.email.buildNotifHtml(req.title, req.bodySummary ?? req.title),
      { replyTo: sender.replyTo, fromName: sender.fromName },
    );
    return { sent: ok, note: ok ? 'email sent' : 'email service từ chối gửi' };
  }

  /**
   * Địa chỉ email nhận theo targetType (scope clubId, chống cross-club):
   * - MEMBER: Member.email (email Liên hệ) ưu tiên, fallback email tài khoản liên kết.
   * - USER:   email tài khoản đăng nhập.
   */
  private async resolveRecipientEmail(
    clubId: string,
    targetType: string,
    targetId: string,
  ): Promise<string | null> {
    if (targetType === 'MEMBER') {
      const m = await this.prisma.member.findFirst({
        where: { id: targetId, clubId, isDeleted: false },
        select: { email: true, user: { select: { email: true } } },
      });
      return m?.email ?? m?.user?.email ?? null;
    }
    const u = await this.prisma.user.findFirst({
      where: { id: targetId, clubId },
      select: { email: true },
    });
    return u?.email ?? null;
  }

  /** Telegram: foundation này CHƯA gửi thật — DRY_RUN only (tài liệu hoá). */
  private telegramAdapter(): Promise<{ sent: boolean; note: string }> {
    return Promise.resolve({
      sent: false,
      note: 'Telegram DRY_RUN — chưa bật gửi thật trong Epic 8 foundation',
    });
  }
}
