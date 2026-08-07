/**
 * RetentionService — dọn dữ liệu theo chính sách lưu trữ:
 * - Notification: giữ 200 tin gần nhất/người dùng; phần dôi ra (rank > 200) VÀ cũ hơn 7 ngày → xóa.
 * - LisaMessage: giữ 50 tin gần nhất/thành viên; phần dôi ra (rank > 50) VÀ cũ hơn 7 ngày → xóa.
 * Chạy 04:15 hằng ngày. Dùng window function (PARTITION BY) — 1 câu DELETE, không lặp app-level.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(private prisma: PrismaService) {}

  @Cron('15 4 * * *')
  async runDaily() {
    await this.cleanup().catch((e) => this.logger.warn(`[Retention] lỗi: ${e?.message ?? e}`));
  }

  /** Chạy dọn (dùng chung cho cron + có thể gọi thủ công). Trả số dòng đã xóa. */
  async cleanup(): Promise<{ notifications: number; lisa: number }> {
    const notifications = await this.prisma.$executeRawUnsafe(`
      DELETE FROM notifications n
      USING (
        SELECT id FROM (
          SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
          FROM notifications
        ) t WHERE t.rn > 200
      ) d
      WHERE n.id = d.id AND n.created_at < NOW() - INTERVAL '7 days'
    `);
    const lisa = await this.prisma.$executeRawUnsafe(`
      DELETE FROM lisa_messages m
      USING (
        SELECT id FROM (
          SELECT id, row_number() OVER (PARTITION BY member_id ORDER BY created_at DESC) AS rn
          FROM lisa_messages
        ) t WHERE t.rn > 50
      ) d
      WHERE m.id = d.id AND m.created_at < NOW() - INTERVAL '7 days'
    `);
    this.logger.log(`[Retention] Xóa ${notifications} thông báo, ${lisa} tin Lisa (quá 7 ngày & ngoài hạn mức).`);
    return { notifications, lisa };
  }
}
