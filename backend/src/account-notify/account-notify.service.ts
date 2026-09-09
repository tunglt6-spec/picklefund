import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';

/** Thông tin tài khoản đăng nhập vừa được tạo (mọi luồng: đăng ký / super tạo). */
export interface NewAccountInfo {
  /** Email do người dùng cung cấp. Bỏ trống hoặc placeholder nội bộ → KHÔNG gửi welcome. */
  email?: string | null;
  /** Tên hiển thị (fullName nếu có, else username). */
  displayName: string;
  username: string;
  role: string;
  clubName?: string | null;
  /** CLB liên quan (để gắn Notification in-app cho super — Notification.clubId là non-null). */
  clubId?: string | null;
  source: 'register' | 'super-club' | 'super-user';
}

/**
 * AccountNotifyService — khi CÓ tài khoản đăng nhập mới:
 *  1) Gửi email CHÀO MỪNG cho tài khoản mới (nếu có email thật + SMTP bật).
 *  2) Báo SUPER ADMIN qua 3 kênh:
 *     - Email hỗ trợ (system-settings.supportEmail) khi bật "Thông báo email hệ thống".
 *     - In-app (chuông): tạo Notification cho MỌI SUPER_ADMIN (xem ở /notifications).
 *     - Telegram: gửi tới chat ops toàn cục (system-settings.superTelegramChatId) nếu đã đặt.
 *
 * Best-effort tuyệt đối: KHÔNG BAO GIỜ throw → không chặn việc tạo tài khoản. Mỗi kênh độc lập
 * (kênh này lỗi/tắt KHÔNG ảnh hưởng kênh khác). Gọi fire-and-forget từ service tạo tài khoản.
 */
@Injectable()
export class AccountNotifyService {
  private readonly logger = new Logger(AccountNotifyService.name);

  constructor(
    private readonly email: EmailService,
    private readonly settings: SystemSettingsService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private roleLabel(role: string): string {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'CLUB_ADMIN':
        return 'Quản trị CLB';
      case 'CLUB_TREASURER':
        return 'Thủ quỹ';
      case 'MEMBER_VIEW':
        return 'Thành viên';
      default:
        return role;
    }
  }

  private sourceLabel(source: NewAccountInfo['source']): string {
    switch (source) {
      case 'register':
        return 'Đăng ký CLB mới (tự phục vụ)';
      case 'super-club':
        return 'Super Admin tạo CLB';
      case 'super-user':
        return 'Super Admin tạo tài khoản';
    }
  }

  /** Email placeholder nội bộ (register tự sinh khi không nhập email) → không gửi welcome. */
  private isRealEmail(email?: string | null): email is string {
    if (!email) return false;
    const e = email.trim().toLowerCase();
    if (!e.includes('@')) return false;
    // auth.service.register fallback: `${username}@picklefund.vn`
    if (e.endsWith('@picklefund.vn')) return false;
    return true;
  }

  /** Nội dung báo Super Admin (dùng chung cho email + in-app + telegram). */
  private superText(info: NewAccountInfo): { title: string; body: string } {
    const title = `Tài khoản mới vừa được lập: ${info.displayName}`;
    const body =
      `Một tài khoản mới vừa được lập thành công trên PickleFund.\n\n` +
      `Họ tên: ${info.displayName}\n` +
      `Tên đăng nhập: ${info.username}\n` +
      `Email: ${this.isRealEmail(info.email) ? info.email : '(không cung cấp)'}\n` +
      `Vai trò: ${this.roleLabel(info.role)}\n` +
      (info.clubName ? `CLB: ${info.clubName}\n` : '') +
      `Nguồn: ${this.sourceLabel(info.source)}`;
    return { title, body };
  }

  /** Token bot cho thông báo Super Admin: ưu tiên bot RIÊNG (SUPER_TELEGRAM_BOT_TOKEN),
   *  fallback bot chung của app (TELEGRAM_BOT_TOKEN). */
  private superBotToken(): string | undefined {
    return (
      this.config.get<string>('SUPER_TELEGRAM_BOT_TOKEN')?.trim() ||
      this.config.get<string>('TELEGRAM_BOT_TOKEN')?.trim() ||
      undefined
    );
  }

  /** Gửi Telegram Bot API (HTTP) — self-contained, không phụ thuộc TelegramModule/Maika/Lisa. */
  private async sendTelegram(chatId: string, text: string): Promise<void> {
    const token = this.superBotToken();
    if (!token) return; // bot chưa cấu hình → bỏ qua (không lỗi)
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) throw new Error(`Telegram API ${res.status}`);
  }

  /**
   * Kiểm tra kết nối Telegram của Super Admin — gửi 1 tin THỬ tới superTelegramChatId.
   * Trả kết quả CHI TIẾT (kèm mô tả lỗi từ Telegram: "chat not found" / token sai…) để chẩn đoán.
   */
  async telegramSelfTest(): Promise<{
    configured: boolean;
    hasChatId: boolean;
    chatId: string | null;
    ok: boolean;
    error?: string;
  }> {
    const token = this.superBotToken();
    const cfg = await this.settings
      .getAll()
      .catch(() => ({}) as Record<string, string>);
    const chatId = cfg.superTelegramChatId?.trim() || null;
    if (!token) {
      return {
        configured: false,
        hasChatId: !!chatId,
        chatId,
        ok: false,
        error: 'Máy chủ chưa cấu hình TELEGRAM_BOT_TOKEN / SUPER_TELEGRAM_BOT_TOKEN.',
      };
    }
    if (!chatId) {
      return {
        configured: true,
        hasChatId: false,
        chatId: null,
        ok: false,
        error: 'Chưa nhập "Telegram Chat ID (Super Admin)" ở Cài đặt.',
      };
    }
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: 'PickleFund · Super Admin — ✅ Kiểm tra kết nối Telegram THÀNH CÔNG. Bạn sẽ nhận thông báo biến động hệ thống tại đây.',
          }),
        },
      );
      if (res.ok) return { configured: true, hasChatId: true, chatId, ok: true };
      const data = (await res.json().catch(() => ({}))) as {
        description?: string;
      };
      return {
        configured: true,
        hasChatId: true,
        chatId,
        ok: false,
        error: data?.description
          ? `${res.status}: ${data.description}`
          : `Telegram API ${res.status}`,
      };
    } catch (e) {
      return {
        configured: true,
        hasChatId: true,
        chatId,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async onNewAccount(info: NewAccountInfo): Promise<void> {
    // Mỗi kênh bọc try/catch RIÊNG để một kênh lỗi không chặn kênh khác, và không kênh nào
    // được ném ra ngoài (không ảnh hưởng việc tạo tài khoản).

    // 1) Email chào mừng cho tài khoản mới.
    try {
      if (this.email.isEnabled && this.isRealEmail(info.email)) {
        const title = 'Chào mừng bạn đến với PickleFund 🎉';
        const clubLine = info.clubName ? `\nCLB: ${info.clubName}` : '';
        const body =
          `Xin chào ${info.displayName},\n\n` +
          `Tài khoản của bạn đã được tạo thành công trên PickleFund.\n` +
          `Tên đăng nhập: ${info.username}${clubLine}\n\n` +
          `Bạn có thể đăng nhập và bắt đầu sử dụng ngay. Chúc bạn nhiều niềm vui trên sân! 🏓`;
        await this.email.send(
          info.email,
          title,
          this.email.buildNotifHtml(title, body),
        );
      }
    } catch (err) {
      this.warn('welcome-email', err);
    }

    const cfg = await this.settings.getAll().catch(() => ({}) as Record<string, string>);
    const { title, body } = this.superText(info);

    // 2a) Báo Super Admin qua EMAIL hỗ trợ (theo toggle "Thông báo email hệ thống").
    try {
      const supportEmail = cfg.supportEmail?.trim();
      if (
        this.email.isEnabled &&
        (cfg.emailNotifications ?? 'true') === 'true' &&
        supportEmail &&
        supportEmail.includes('@')
      ) {
        await this.email.send(
          supportEmail,
          title,
          this.email.buildNotifHtml(title, body),
        );
      }
    } catch (err) {
      this.warn('super-email', err);
    }

    // 2b) Báo Super Admin qua IN-APP (chuông) — tạo Notification cho mọi SUPER_ADMIN.
    // Cần clubId (Notification.clubId non-null) → gắn CLB liên quan; thiếu CLB thì bỏ qua in-app.
    try {
      if (info.clubId) {
        const supers = await this.prisma.user.findMany({
          where: { role: 'SUPER_ADMIN', isActive: true },
          select: { id: true },
        });
        if (supers.length) {
          await this.prisma.notification.createMany({
            data: supers.map((s) => ({
              userId: s.id,
              clubId: info.clubId as string,
              eventType: 'account_created',
              priority: 'MEDIUM' as const,
              channel: 'IN_APP' as const,
              title,
              body,
              status: 'SENT' as const,
              sentAt: new Date(),
            })),
          });
        }
      }
    } catch (err) {
      this.warn('super-inapp', err);
    }

    // 2c) Báo Super Admin qua TELEGRAM (chat ops toàn cục nếu đã cấu hình).
    try {
      const chatId = cfg.superTelegramChatId?.trim();
      if (chatId) await this.sendTelegram(chatId, `${title}\n\n${body}`);
    } catch (err) {
      this.warn('super-telegram', err);
    }
  }

  private warn(channel: string, err: unknown): void {
    this.logger.warn(
      `onNewAccount[${channel}] thất bại (bỏ qua, không ảnh hưởng tạo tài khoản): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}
