import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MaikaService } from './maika.service';

@Injectable()
export class MaikaScheduler {
  private readonly logger = new Logger(MaikaScheduler.name);

  constructor(
    private prisma: PrismaService,
    private maika: MaikaService,
  ) {}

  private async getActiveClubIds(): Promise<string[]> {
    const clubs = await this.prisma.club.findMany({
      where: { status: 'active' },
      select: { id: true },
    });
    return clubs.map((c) => c.id);
  }

  // Daily brief: every day at 8:00 AM
  @Cron('0 8 * * *', {
    name: 'maika_daily_brief',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async runDailyBrief() {
    this.logger.log('[Maika] Running daily brief...');
    const clubIds = await this.getActiveClubIds();
    for (const clubId of clubIds) {
      try {
        await this.maika.generateDailyBrief(clubId);
      } catch (err: any) {
        this.logger.error(
          `[Maika] Daily brief failed for ${clubId}: ${err.message}`,
        );
      }
    }
  }

  // Weekly report: every Sunday at 9:00 AM
  @Cron('0 9 * * 0', {
    name: 'maika_weekly_report',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async runWeeklyReport() {
    this.logger.log('[Maika] Running weekly report...');
    const clubIds = await this.getActiveClubIds();
    for (const clubId of clubIds) {
      try {
        await this.maika.generateWeeklyReport(clubId);
      } catch (err: any) {
        this.logger.error(
          `[Maika] Weekly report failed for ${clubId}: ${err.message}`,
        );
      }
    }
  }

  // Anomaly detection: every 6 hours
  @Cron('0 */6 * * *', {
    name: 'maika_anomaly_detection',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async runAnomalyDetection() {
    this.logger.log('[Maika] Running anomaly detection...');
    const clubIds = await this.getActiveClubIds();
    for (const clubId of clubIds) {
      try {
        await this.maika.detectAnomalies(clubId);
      } catch (err: any) {
        this.logger.error(
          `[Maika] Anomaly detection failed for ${clubId}: ${err.message}`,
        );
      }
    }
  }
}
