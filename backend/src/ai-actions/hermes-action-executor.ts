import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationRuntimeService } from '../notification-runtime/notification-runtime.service';
import type { ActionExecutor, ExecutableAction } from './action-executor';

type Recipient = { userId: string };

/** Kênh gửi hợp lệ cho executor (TELEGRAM vẫn DRY_RUN ở runtime → không đưa vào đây). */
const VALID_CHANNELS = ['IN_APP', 'EMAIL'];

/**
 * HermesActionExecutor — Execution Bridge THẬT cho Mít Đặc (Operations Executor).
 *
 * Thay NoOpExecutor: với action ĐÃ DUYỆT, tạo sản phẩm thật = fan-out thông báo.
 * Hỗ trợ:
 * - workflow:DEBT_ESCALATION → nhắc đóng quỹ tới member CHƯA đóng kỳ active + có tài khoản.
 * - workflow:EVENT_REMINDER  → nhắc buổi tập sắp tới tới TẤT CẢ member hoạt động có tài khoản.
 * - workflow:REPORT_DISPATCH → báo kỳ quỹ đã chốt tới TẤT CẢ member có tài khoản.
 * Member không có tài khoản (Member.userId=null) → không nhận (skipped).
 *
 * Kênh gửi: OPT-IN theo rule qua requestPayload.channels (mặc định ['IN_APP']).
 * EMAIL chỉ gửi được tới email THẬT — địa chỉ placeholder (.local) bị runtime chặn (DRY_RUN).
 *
 * Ranh giới an toàn:
 * - CHỈ chạy trên action đã duyệt (AiActionsService.execute gọi sau khi acquire EXECUTING).
 * - KHÔNG tính/kết luận/ghi tài chính: chỉ ĐỌC member/đóng quỹ/buổi tập/kỳ để chọn người nhận.
 * - Fan-out qua NotificationRuntime (idempotent theo action+user+channel) — không bypass hạ tầng.
 * - Action type chưa hỗ trợ → no-op (tài liệu hoá rõ, không giả lập kết quả).
 */
@Injectable()
export class HermesActionExecutor implements ActionExecutor {
  private readonly logger = new Logger(HermesActionExecutor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationRuntimeService,
  ) {}

  execute(action: ExecutableAction): Promise<Record<string, unknown>> {
    switch (action.actionType) {
      case 'workflow:DEBT_ESCALATION':
        return this.executeDebtEscalation(action);
      case 'workflow:EVENT_REMINDER':
        return this.executeEventReminder(action);
      case 'workflow:REPORT_DISPATCH':
        return this.executeReportDispatch(action);
      default:
        return Promise.resolve({
          ok: true,
          mode: 'no-op',
          executor: 'MIT_DAT',
          message: `Bridge no-op: chưa hỗ trợ executor thật cho '${action.actionType}'.`,
        });
    }
  }

  // ---------- Helpers dùng chung ----------

  /** Kênh gửi từ rule (requestPayload.channels) — lọc hợp lệ, mặc định IN_APP. */
  private resolveChannels(payload: unknown): string[] {
    const raw = (payload as { channels?: unknown } | null | undefined)
      ?.channels;
    if (Array.isArray(raw)) {
      const chosen = Array.from(
        new Set(
          raw
            .filter((c): c is string => typeof c === 'string')
            .map((c) => c.toUpperCase())
            .filter((c) => VALID_CHANNELS.includes(c)),
        ),
      );
      if (chosen.length) return chosen;
    }
    return ['IN_APP'];
  }

  /**
   * Fan-out tới từng recipient qua từng kênh; idempotent per action+user+channel.
   * Trả số job GỬI MỚI (READY, !duplicate) theo từng kênh, ví dụ { IN_APP: 8, EMAIL: 0 }.
   */
  private async fanOut(
    clubId: string,
    actionId: string,
    recipients: Recipient[],
    title: string,
    body: string,
    channels: string[],
  ): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const channel of channels) {
      let n = 0;
      for (const r of recipients) {
        const job = (await this.notifications.dispatch(clubId, {
          channel,
          targetType: 'USER',
          targetId: r.userId,
          title,
          bodySummary: body,
          idempotencyKey: `AI_ACTION:${actionId}:USER:${r.userId}`,
          aiActionId: actionId,
        })) as { status?: string; duplicate?: boolean } | null;
        if (job && job.status === 'READY' && !job.duplicate) n++;
      }
      counts[channel] = n;
    }
    return counts;
  }

  /** "IN_APP:8, EMAIL:0" — tóm tắt số đã gửi theo kênh cho message. */
  private countsStr(counts: Record<string, number>): string {
    return Object.entries(counts)
      .map(([c, n]) => `${c}:${n}`)
      .join(', ');
  }

  /** Thành viên đang hoạt động CÓ tài khoản đăng nhập (nhận được thông báo). */
  private async membersWithAccount(clubId: string): Promise<Recipient[]> {
    const members = await this.prisma.member.findMany({
      where: { clubId, isDeleted: false },
      select: { userId: true },
    });
    return members
      .filter((m): m is { userId: string } => !!m.userId)
      .map((m) => ({ userId: m.userId }));
  }

  /** dd/m/yyyy theo UTC (cột @db.Date lưu ngày trần — tránh lệch múi giờ). */
  private fmtDate(d: Date): string {
    return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
  }

  private liveResult(message: string): Record<string, unknown> {
    return { ok: true, mode: 'live', executor: 'MIT_DAT', message };
  }

  // ---------- Branch: DEBT_ESCALATION ----------

  /** Nhắc đóng quỹ tới member chưa đóng kỳ active có tài khoản. */
  private async executeDebtEscalation(
    action: ExecutableAction,
  ): Promise<Record<string, unknown>> {
    const clubId = action.clubId;

    const period = await this.prisma.fundPeriod.findFirst({
      where: { clubId, status: 'active' },
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true },
    });
    if (!period) {
      return this.liveResult(
        'Không có kỳ quỹ đang mở — không có thành viên nào để nhắc.',
      );
    }

    const [members, paidRows] = await Promise.all([
      this.prisma.member.findMany({
        where: { clubId, isDeleted: false },
        select: { id: true, userId: true },
      }),
      this.prisma.fundContribution.findMany({
        where: {
          clubId,
          fundPeriodId: period.id,
          fundSource: 'COMMON',
          isConfirmed: true,
          memberId: { not: null },
        },
        select: { memberId: true },
        distinct: ['memberId'],
      }),
    ]);

    const paid = new Set(paidRows.map((r) => r.memberId));
    const unpaid = members.filter((m) => !paid.has(m.id));
    const recipients: Recipient[] = unpaid
      .filter((m): m is { id: string; userId: string } => !!m.userId)
      .map((m) => ({ userId: m.userId }));
    const skippedNoAccount = unpaid.length - recipients.length;

    const channels = this.resolveChannels(action.requestPayload);
    const title = action.title || 'Nhắc đóng quỹ';
    const body =
      action.summary ||
      `Bạn chưa hoàn tất đóng quỹ kỳ "${period.name}". Vui lòng đóng quỹ sớm nhé.`;

    const counts = await this.fanOut(
      clubId,
      action.id,
      recipients,
      title,
      body,
      channels,
    );

    this.logger.log(
      `DEBT_ESCALATION ${action.id}: unpaid=${unpaid.length} skippedNoAccount=${skippedNoAccount} counts=${this.countsStr(counts)}`,
    );
    return this.liveResult(
      `Nhắc nợ kỳ "${period.name}": ${unpaid.length} thành viên chưa đóng (${skippedNoAccount} chưa có tài khoản). Đã gửi [${this.countsStr(counts)}].`,
    );
  }

  // ---------- Branch: EVENT_REMINDER ----------

  /** Nhắc buổi tập sắp tới (gần nhất) tới tất cả member hoạt động có tài khoản. */
  private async executeEventReminder(
    action: ExecutableAction,
  ): Promise<Record<string, unknown>> {
    const clubId = action.clubId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const session = await this.prisma.attendanceSession.findFirst({
      where: { clubId, sessionDate: { gte: today } },
      orderBy: { sessionDate: 'asc' },
      select: {
        sessionDate: true,
        startTime: true,
        endTime: true,
        courtName: true,
      },
    });
    if (!session) {
      return this.liveResult(
        'Không có buổi tập sắp tới — không có gì để nhắc.',
      );
    }

    const recipients = await this.membersWithAccount(clubId);
    const dateStr = this.fmtDate(session.sessionDate);
    const timeStr =
      session.startTime && session.endTime
        ? ` (${session.startTime}–${session.endTime})`
        : '';
    const court = session.courtName ? ` tại ${session.courtName}` : '';

    const channels = this.resolveChannels(action.requestPayload);
    const title = action.title || 'Nhắc lịch tập';
    const body =
      action.summary ||
      `Sắp có buổi tập ngày ${dateStr}${timeStr}${court}. Nhớ sắp xếp tham gia nhé.`;

    const counts = await this.fanOut(
      clubId,
      action.id,
      recipients,
      title,
      body,
      channels,
    );

    this.logger.log(
      `EVENT_REMINDER ${action.id}: recipients=${recipients.length} date=${dateStr} counts=${this.countsStr(counts)}`,
    );
    return this.liveResult(
      `Nhắc lịch tập ngày ${dateStr}: ${recipients.length} thành viên có tài khoản. Đã gửi [${this.countsStr(counts)}].`,
    );
  }

  // ---------- Branch: REPORT_DISPATCH ----------

  /** Báo kỳ quỹ đã chốt (finalized gần nhất) tới tất cả member có tài khoản. */
  private async executeReportDispatch(
    action: ExecutableAction,
  ): Promise<Record<string, unknown>> {
    const clubId = action.clubId;

    const period = await this.prisma.fundPeriod.findFirst({
      where: { clubId, status: 'finalized' },
      orderBy: { startDate: 'desc' },
      select: { name: true },
    });
    if (!period) {
      return this.liveResult(
        'Chưa có kỳ quỹ nào chốt — không có báo cáo để gửi.',
      );
    }

    const recipients = await this.membersWithAccount(clubId);
    const channels = this.resolveChannels(action.requestPayload);
    const title = action.title || 'Báo cáo kỳ quỹ';
    const body =
      action.summary ||
      `Báo cáo kỳ "${period.name}" đã chốt. Bạn có thể xem phiếu thu/quyết toán của mình trong app.`;

    const counts = await this.fanOut(
      clubId,
      action.id,
      recipients,
      title,
      body,
      channels,
    );

    this.logger.log(
      `REPORT_DISPATCH ${action.id}: recipients=${recipients.length} period=${period.name} counts=${this.countsStr(counts)}`,
    );
    return this.liveResult(
      `Gửi báo cáo kỳ "${period.name}": ${recipients.length} thành viên có tài khoản. Đã gửi [${this.countsStr(counts)}].`,
    );
  }
}
