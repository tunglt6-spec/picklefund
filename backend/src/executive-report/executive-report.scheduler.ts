import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ExecutiveReportService } from './executive-report.service';

/**
 * Cron gửi Báo cáo điều hành qua EMAIL đầu mỗi tháng cho các CLB đã bật opt-in
 * (Club.settings.autoMonthlyReport = true). 08:00 ngày 1 (giờ VN). Idempotent theo tháng
 * (monthlyReportClubIds đã loại CLB có lastSent = tháng hiện tại). Chỉ gửi thật khi SMTP
 * đã cấu hình (EmailService.isEnabled) — nếu chưa, sendMonthlyReportEmail trả sent=0.
 */
@Injectable()
export class ExecutiveReportScheduler {
  private readonly logger = new Logger(ExecutiveReportScheduler.name);
  constructor(private readonly report: ExecutiveReportService) {}

  @Cron('0 8 1 * *', {
    name: 'monthly-executive-report',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async sendMonthly() {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const ids = await this.report.monthlyReportClubIds(month);
    if (ids.length === 0) return;
    this.logger.log(
      `[ExecReport] Gửi báo cáo điều hành tháng ${month} cho ${ids.length} CLB`,
    );
    for (const clubId of ids) {
      try {
        // Claim tháng TRƯỚC khi gửi (chống trùng khi cron fire lại / đa-instance).
        const claimed = await this.report.claimMonthlySend(clubId, month);
        if (!claimed) continue;
        const r = await this.report.sendMonthlyReportEmail(clubId);
        this.logger.log(
          `[ExecReport] CLB ${clubId}: gửi ${r.sent} email (SMTP ${r.smtpReady ? 'ON' : 'OFF'})`,
        );
      } catch (err) {
        this.logger.warn(
          `[ExecReport] CLB ${clubId} lỗi gửi báo cáo: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}
