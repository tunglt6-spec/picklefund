import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { PushService } from '../push/push.service';
import {
  HermesEvent,
  HermesChannel,
  ALL_CHANNELS,
  EVENT_PRIORITY,
  EVENT_RECIPIENTS,
} from './hermes.types';
import {
  pushCategoryOf,
  isQuietHoursNow,
  shouldPushNow,
  notifRouteForRole,
} from './push-policy';

@Injectable()
export class HermesService {
  private readonly logger = new Logger(HermesService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private config: ConfigService,
    private push: PushService,
  ) {}

  // ─── Main entry point ────────────────────────────────────────────────────────

  async dispatch(event: HermesEvent): Promise<{ dispatched: number }> {
    const priority = event.priority ?? EVENT_PRIORITY[event.eventType];
    const recipientRoles = EVENT_RECIPIENTS[event.eventType];

    const recipients = await this.resolveRecipients(
      event.clubId,
      recipientRoles,
      event.targetUserId,
    );

    // Prefetch pref của TẤT CẢ recipient trong 1 query (thay N findUnique trong vòng lặp).
    const prefRows = await this.prisma.notificationPreference.findMany({
      where: { userId: { in: recipients } },
    });
    const prefMap = new Map(prefRows.map((p) => [p.userId, p]));
    // Prefetch role → route push đúng (admin /notifications ≠ member /member/notifications).
    const userRows = await this.prisma.user.findMany({
      where: { id: { in: recipients } },
      select: { id: true, role: true },
    });
    const roleMap = new Map(userRows.map((u) => [u.id, u.role as string]));

    let dispatched = 0;
    for (const userId of recipients) {
      const pref = prefMap.get(userId) ?? null;
      // Mỗi channel xử lý ĐỘC LẬP: 1 channel fail KHÔNG làm fail các channel còn lại.
      const channels = await this.selectChannels(pref, priority, userId);
      if (channels.length === 0) continue;

      let userDelivered = 0;
      for (const channel of channels) {
        const startedAt = Date.now();
        let notificationId: string | null = null;
        try {
          const notif = await this.createNotification({
            userId,
            clubId: event.clubId,
            eventType: event.eventType,
            priority,
            channel,
            title: event.title,
            body: event.body,
            metadata: event.metadata,
          });
          notificationId = notif.id;

          // Deliver qua kênh ngoài (IN_APP = chỉ ghi DB, không cần gửi ngoài).
          await this.deliverExternal(channel, userId, event, pref);

          userDelivered++;
          this.logger.log(
            `[Hermes] notif=${notificationId} user=${userId} channel=${channel} ` +
              `event=${event.eventType} status=SUCCESS retry=0 tookMs=${Date.now() - startedAt}`,
          );
        } catch (err: any) {
          this.logger.error(
            `[Hermes] notif=${notificationId ?? 'n/a'} user=${userId} channel=${channel} ` +
              `event=${event.eventType} status=FAILED retry=0 tookMs=${Date.now() - startedAt} err=${err.message}`,
          );
          // Không throw — tiếp tục channel kế tiếp.
        }
      }
      if (userDelivered > 0) {
        dispatched++;
        // Web Push (PWA mobile): gửi 1 lần/người nhận cho MỌI thông báo mới (chỉ trừ quiet-hours/tắt).
        if (this.shouldPush(event.eventType, priority, pref)) {
          const link = (event.metadata as { link?: string } | undefined)?.link;
          void this.push.sendToUser(userId, {
            title: event.title,
            body: event.body,
            url: typeof link === 'string' ? link : notifRouteForRole(roleMap.get(userId)),
            tag: event.eventType,
          });
        }
      }
    }

    this.logger.log(
      `[Hermes] dispatched ${dispatched}/${recipients.length} recipients for ${event.eventType}`,
    );
    return { dispatched };
  }

  /**
   * Gửi thông báo qua kênh ngoài. IN_APP đã ghi DB ở createNotification (no-op ở đây).
   * EMAIL qua EmailService; TELEGRAM qua Telegram Bot API (HTTP trực tiếp — tránh
   * phụ thuộc TelegramModule để không tạo circular DI với Maika/Lisa).
   */
  private async deliverExternal(
    channel: HermesChannel,
    userId: string,
    event: HermesEvent,
    pref: { telegramChatId?: string | null } | null,
  ): Promise<void> {
    if (channel === 'IN_APP') return;

    if (channel === 'EMAIL') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (!user?.email) return; // không có email → bỏ qua kênh này (không lỗi)
      const sent = await this.email.send(
        user.email,
        event.title,
        this.email.buildNotifHtml(event.title, event.body),
      );
      // EmailService.send() nuốt lỗi SMTP và trả false thay vì throw — phải kiểm tra
      // kết quả để log FAILED chính xác (nếu không, dispatch() sẽ log nhầm SUCCESS).
      if (!sent) throw new Error('Email send failed');
      return;
    }

    if (channel === 'TELEGRAM') {
      if (!pref?.telegramChatId) return; // chưa liên kết chat → bỏ qua (không lỗi)
      await this.sendTelegram(
        pref.telegramChatId,
        `*${event.title}*\n${event.body}`,
      );
    }
  }

  /** Gửi tin nhắn qua Telegram Bot API (HTTP) — self-contained, không phụ thuộc TelegramModule. */
  private async sendTelegram(chatId: string, text: string): Promise<void> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) return; // bot chưa cấu hình → bỏ qua (không lỗi)
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
        }),
      },
    );
    if (!res.ok) {
      throw new Error(`Telegram API ${res.status}`);
    }
  }

  // ─── Recipient resolution ────────────────────────────────────────────────────

  private async resolveRecipients(
    clubId: string,
    roles: string[],
    targetUserId?: string,
  ): Promise<string[]> {
    if (roles.includes('SPECIFIC_USER') && targetUserId) {
      return [targetUserId];
    }

    if (roles.includes('ALL_MEMBERS')) {
      const users = await this.prisma.user.findMany({
        where: { clubId, isActive: true, notificationEnabled: true },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }

    const prismaRoles: string[] = [];
    if (roles.includes('CLUB_ADMIN')) prismaRoles.push('CLUB_ADMIN');
    if (roles.includes('CLUB_TREASURER')) prismaRoles.push('CLUB_TREASURER');

    if (prismaRoles.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: {
        clubId,
        isActive: true,
        notificationEnabled: true,
        role: { in: prismaRoles as any },
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  // ─── Channel selection ───────────────────────────────────────────────────────

  /**
   * Chọn DANH SÁCH kênh gửi cho 1 user (multi-channel).
   * Giữ nguyên nghiệp vụ cũ: enabled/quiet-hours/priority/rate-limit per-channel.
   *  - !enabled → [] (không gửi).
   *  - Quiet hours → chỉ IN_APP (chặn EMAIL/TELEGRAM ban đêm).
   *  - MEDIUM/LOW → chỉ IN_APP (chống notification fatigue) — KHÔNG đổi.
   *  - HIGH → tất cả kênh user bật; EMAIL/TELEGRAM bị bỏ nếu quá quota (per-channel);
   *           IN_APP luôn được giữ; nếu rỗng → fallback [IN_APP] (không để user im lặng).
   */
  private async selectChannels(
    pref: {
      enabled: boolean;
      quietHoursStart: number;
      quietHoursEnd: number;
      channels?: HermesChannel[] | null;
      preferredChannel?: HermesChannel | null;
      maxDailyEmail?: number | null;
      maxDailyTelegram?: number | null;
    } | null,
    priority: string,
    userId: string,
  ): Promise<HermesChannel[]> {
    if (pref && !pref.enabled) return [];

    if (pref && this.isQuietHours(pref.quietHoursStart, pref.quietHoursEnd)) {
      return ['IN_APP'];
    }

    if (priority !== 'HIGH') {
      return ['IN_APP'];
    }

    // HIGH: gửi tới ĐÚNG các kênh user đã bật (nguồn chân lý = channels; fallback
    // preferredChannel cho dữ liệu cũ chưa migrate). EMAIL/TELEGRAM lọc theo quota
    // per-channel (kênh vượt quota bị bỏ, KHÔNG ảnh hưởng kênh khác). IN_APP không giới hạn.
    const selected = this.resolveChannels(pref);
    const result: HermesChannel[] = [];
    for (const ch of selected) {
      if (ch === 'IN_APP') {
        result.push('IN_APP');
        continue;
      }
      if (await this.checkRateLimit(userId, ch, pref)) {
        result.push(ch);
      }
    }
    // Fallback: nếu tất cả kênh bị chặn (vượt quota) → vẫn giữ IN_APP để không im lặng.
    if (result.length === 0) return ['IN_APP'];
    return result;
  }

  /**
   * Danh sách kênh đã bật của user (multi). Nguồn chân lý = `channels`;
   * nếu rỗng/thiếu (dữ liệu cũ) → suy từ `preferredChannel` (backward-compat).
   * Lọc whitelist + khử trùng lặp.
   */
  private resolveChannels(pref: {
    channels?: HermesChannel[] | null;
    preferredChannel?: HermesChannel | null;
  } | null): HermesChannel[] {
    const raw =
      pref?.channels && pref.channels.length > 0
        ? pref.channels
        : [pref?.preferredChannel ?? 'IN_APP'];
    const valid = raw.filter((c): c is HermesChannel =>
      ALL_CHANNELS.includes(c as HermesChannel),
    );
    return Array.from(new Set(valid.length > 0 ? valid : ['IN_APP']));
  }

  // ─── Quiet hours check ───────────────────────────────────────────────────────

  private isQuietHours(start: number, end: number): boolean {
    return isQuietHoursNow(start, end);
  }

  /**
   * Nhóm push (member/admin tự tắt theo nhóm) — ĐỒNG BỘ với bộ lọc thông báo:
   *  - Member (MemberNotifications.catOf): community · finance · activity.
   *  - Admin (Notifications.catOf): "Thông báo" = {community,finance,activity} · system · ai.
   * 5 key gốc: community (cộng đồng + tìm kèo) · finance (quỹ/thanh toán) · system (bất thường/sức khỏe)
   * · ai (bản tin/báo cáo) · activity (còn lại). Check community/finance TRƯỚC để 'community_report'
   * (chứa 'report') không rơi nhầm vào 'ai'.
   */
  private pushCategory(eventType: string): string {
    return pushCategoryOf(eventType);
  }

  /**
   * Push THÔNG MINH theo giờ/loại (in-app notification VẪN ghi đủ; chỉ quyết định buzz push):
   *  - preference.enabled=false → tắt hẳn.
   *  - Quiet-hours (theo GIỜ user cấu hình) → không buzz ban đêm, trừ HIGH (việc gấp).
   *  - pushMutedCategories (theo LOẠI) → member tự tắt nhóm không muốn nhận.
   */
  private shouldPush(
    eventType: string,
    priority: string,
    pref: { enabled?: boolean; quietHoursStart: number; quietHoursEnd: number; pushMutedCategories?: string[] } | null,
  ): boolean {
    return shouldPushNow(eventType, priority, pref);
  }

  // ─── Rate limiter ────────────────────────────────────────────────────────────

  private async checkRateLimit(
    userId: string,
    channel: HermesChannel,
    pref: { maxDailyEmail?: number | null; maxDailyTelegram?: number | null } | null,
  ): Promise<boolean> {
    const maxMap: Record<HermesChannel, number> = {
      IN_APP: 99,
      EMAIL: pref?.maxDailyEmail ?? 1,
      TELEGRAM: pref?.maxDailyTelegram ?? 5,
    };

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const count = await this.prisma.notification.count({
      where: {
        userId,
        channel,
        createdAt: { gte: startOfDay },
        status: { in: ['SENT', 'READ'] },
      },
    });

    return count < maxMap[channel];
  }

  // ─── Create notification record ──────────────────────────────────────────────

  private async createNotification(data: {
    userId: string;
    clubId: string;
    eventType: string;
    priority: string;
    channel: HermesChannel;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        clubId: data.clubId,
        eventType: data.eventType,
        priority: data.priority as any,
        channel: data.channel,
        title: data.title,
        body: data.body,
        metadata: data.metadata
          ? JSON.parse(JSON.stringify(data.metadata))
          : undefined,
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }

  // ─── User-facing queries ─────────────────────────────────────────────────────

  async getNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({
        where: { userId, status: { in: ['SENT', 'PENDING'] } },
      }),
    ]);
    return { items, total, unreadCount, page, limit };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notif = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notif) throw new NotFoundException('Thông báo không tồn tại');

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'READ', readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, status: { in: ['SENT', 'PENDING'] } },
      data: { status: 'READ', readAt: new Date() },
    });
    return { updated: result.count };
  }

  // ─── Preferences ─────────────────────────────────────────────────────────────

  async getPreferences(userId: string) {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (!pref) {
      // Return defaults
      return {
        userId,
        channels: ['IN_APP'],
        preferredChannel: 'IN_APP',
        telegramChatId: null,
        quietHoursStart: 23,
        quietHoursEnd: 7,
        maxDailyPush: 3,
        maxDailyEmail: 1,
        maxDailyTelegram: 5,
        enabled: true,
        pushMutedCategories: [],
      };
    }
    // Backward-compat: dữ liệu cũ có channels rỗng → suy từ preferredChannel.
    if (!pref.channels || pref.channels.length === 0) {
      return { ...pref, channels: this.resolveChannels(pref) };
    }
    return pref;
  }

  // ─── Test email delivery ─────────────────────────────────────────────────────

  async testEmail(
    userId: string,
  ): Promise<{ sent: boolean; to: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const to = user?.email ?? null;
    if (!to) return { sent: false, to: null };

    const sent = await this.email.send(
      to,
      '[PickleFund] Test email — hệ thống thông báo đang hoạt động',
      this.email.buildNotifHtml(
        'Email test thành công ✓',
        'Nếu bạn nhận được email này, hệ thống gửi thông báo qua email đang hoạt động bình thường.',
      ),
    );
    return { sent, to };
  }

  async updatePreferences(
    userId: string,
    dto: {
      channels?: HermesChannel[];
      preferredChannel?: 'IN_APP' | 'EMAIL' | 'TELEGRAM';
      telegramChatId?: string;
      quietHoursStart?: number;
      quietHoursEnd?: number;
      maxDailyPush?: number;
      maxDailyEmail?: number;
      maxDailyTelegram?: number;
      enabled?: boolean;
      pushMutedCategories?: string[];
    },
  ) {
    // Chuẩn hoá channels: whitelist + khử trùng. Nếu client chỉ gửi preferredChannel
    // (client cũ) → suy channels từ đó. Đồng bộ preferredChannel = channels[0] (backward-compat).
    const data: Record<string, unknown> = { ...dto };
    let channels: HermesChannel[] | undefined;
    if (dto.channels !== undefined) {
      channels = Array.from(
        new Set(
          dto.channels.filter((c) => ALL_CHANNELS.includes(c as HermesChannel)),
        ),
      );
    } else if (dto.preferredChannel !== undefined) {
      channels = [dto.preferredChannel];
    }
    if (channels !== undefined) {
      data.channels = channels;
      // Giữ preferredChannel đồng bộ (kênh đầu tiên, mặc định IN_APP nếu rỗng).
      data.preferredChannel = channels[0] ?? 'IN_APP';
    }

    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...data } as any,
      update: data as any,
    });
  }
}
