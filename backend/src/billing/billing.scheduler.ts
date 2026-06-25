import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';
import { HermesService } from '../hermes/hermes.service';

@Injectable()
export class BillingScheduler {
  private readonly logger = new Logger(BillingScheduler.name);

  constructor(
    private prisma: PrismaService,
    private billing: BillingService,
    private hermes: HermesService,
  ) {}

  // Daily at 07:00 VN — check subscriptions expiring soon or already expired
  @Cron('0 7 * * *', {
    name: 'billing_expiry_check',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async runExpiryCheck() {
    this.logger.log('[Billing] Running subscription expiry check...');

    const clubs = await this.prisma.club.findMany({
      where: { status: 'active' },
      select: { id: true, name: true },
    });

    for (const club of clubs) {
      try {
        await this.checkClubSubscription(club.id, club.name);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `[Billing] Expiry check failed for ${club.id}: ${msg}`,
        );
      }
    }
  }

  private async checkClubSubscription(clubId: string, clubName: string) {
    const sub = await this.billing.getSubscription(clubId);

    // FREE plan never expires
    if (sub.tier === 'FREE' || !sub.expiresAt) return;

    const daysLeft = sub.daysRemaining ?? 0;

    if (daysLeft <= 0) {
      // Expired — downgrade to FREE and notify
      await Promise.all([
        this.prisma.systemSetting.upsert({
          where: { key: `subscription_tier_${clubId}` },
          create: { key: `subscription_tier_${clubId}`, value: 'FREE' },
          update: { value: 'FREE' },
        }),
        this.hermes.dispatch({
          eventType: 'subscription_expired',
          clubId,
          title: 'Gói dịch vụ đã hết hạn',
          body: `CLB ${clubName} — gói ${sub.plan.name} đã hết hạn. Hệ thống đã chuyển về gói Miễn phí. Vui lòng gia hạn để tiếp tục sử dụng tính năng AI và Telegram Bot.`,
          metadata: { tier: sub.tier, expiredAt: sub.expiresAt },
        }),
      ]);
      this.logger.warn(
        `[Billing] Club ${clubId} subscription expired — downgraded to FREE`,
      );
      return;
    }

    // Notify at 7 days and 1 day before expiry
    if (daysLeft === 7 || daysLeft === 1) {
      await this.hermes.dispatch({
        eventType: 'subscription_expiring',
        clubId,
        title: `Gói dịch vụ sắp hết hạn trong ${daysLeft} ngày`,
        body: `CLB ${clubName} — gói ${sub.plan.name} sẽ hết hạn vào ${new Date(sub.expiresAt).toLocaleDateString('vi-VN')}. Vui lòng liên hệ admin để gia hạn.`,
        metadata: { tier: sub.tier, daysLeft, expiresAt: sub.expiresAt },
      });
      this.logger.log(
        `[Billing] Club ${clubId} expiry warning sent (${daysLeft} days left)`,
      );
    }
  }
}
