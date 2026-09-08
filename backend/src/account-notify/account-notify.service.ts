import { Injectable, Logger } from '@nestjs/common';
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
  source: 'register' | 'super-club' | 'super-user';
}

/**
 * AccountNotifyService — khi CÓ tài khoản đăng nhập mới:
 *  1) Gửi email CHÀO MỪNG cho tài khoản mới (nếu có email thật + SMTP bật).
 *  2) Báo SUPER ADMIN qua email hỗ trợ (system-settings.supportEmail) khi bật
 *     "Thông báo email hệ thống" (emailNotifications) — khớp toggle ở /super/settings.
 *
 * Best-effort tuyệt đối: KHÔNG BAO GIỜ throw → không chặn việc tạo tài khoản. Gọi
 * fire-and-forget từ các service tạo tài khoản.
 */
@Injectable()
export class AccountNotifyService {
  private readonly logger = new Logger(AccountNotifyService.name);

  constructor(
    private readonly email: EmailService,
    private readonly settings: SystemSettingsService,
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

  async onNewAccount(info: NewAccountInfo): Promise<void> {
    try {
      // SMTP chưa cấu hình → cả 2 kênh đều là email nên bỏ qua (không lỗi).
      if (!this.email.isEnabled) return;

      // 1) Email chào mừng cho tài khoản mới.
      if (this.isRealEmail(info.email)) {
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

      // 2) Báo Super Admin (email hỗ trợ) nếu bật "Thông báo email hệ thống".
      const cfg = await this.settings.getAll();
      if ((cfg.emailNotifications ?? 'true') !== 'true') return;
      const supportEmail = cfg.supportEmail?.trim();
      if (!supportEmail || !supportEmail.includes('@')) return;

      const title = `Tài khoản mới vừa được lập: ${info.displayName}`;
      const body =
        `Một tài khoản mới vừa được lập thành công trên PickleFund.\n\n` +
        `Họ tên: ${info.displayName}\n` +
        `Tên đăng nhập: ${info.username}\n` +
        `Email: ${this.isRealEmail(info.email) ? info.email : '(không cung cấp)'}\n` +
        `Vai trò: ${this.roleLabel(info.role)}\n` +
        (info.clubName ? `CLB: ${info.clubName}\n` : '') +
        `Nguồn: ${this.sourceLabel(info.source)}`;
      await this.email.send(
        supportEmail,
        title,
        this.email.buildNotifHtml(title, body),
      );
    } catch (err) {
      this.logger.warn(
        `onNewAccount thất bại (bỏ qua, không ảnh hưởng tạo tài khoản): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
