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

    // Không đặt hạn (planExpiresAt = null) → không bao giờ hết hạn, kể cả PRO/CLUB_PLUS.
    if (!sub.expiresAt) return;

    const daysLeft = sub.daysRemaining ?? 0;

    if (daysLeft <= 0) {
      // ÂN HẠN: đã quá hạn nhưng còn trong grace → GIỮ gói + dữ liệu, chỉ cảnh báo, CHƯA hạ.
      if (sub.inGrace) {
        await this.hermes.dispatch({
          eventType: 'subscription_grace',
          clubId,
          title: 'Gói đã hết hạn — đang trong thời gian ân hạn',
          body: `CLB ${clubName} — gói ${sub.plan.name} đã hết hạn. Đang trong thời gian ân hạn đến ${sub.graceUntil ? new Date(sub.graceUntil).toLocaleDateString('vi-VN') : ''}. Gia hạn ngay để không bị hạ về Starter.`,
          metadata: { tier: sub.tier, expiredAt: sub.expiresAt, graceUntil: sub.graceUntil },
        });
        this.logger.log(`[Billing] Club ${clubId} trong ân hạn — chưa hạ gói`);
        return;
      }
      // Quá ân hạn — hạ về STARTER (nguồn duy nhất = Club.plan/planExpiresAt) + đánh dấu sub EXPIRED.
      await Promise.all([
        this.prisma.club.update({
          where: { id: clubId },
          data: { plan: 'STARTER', planExpiresAt: null },
        }),
        this.prisma.subscription.updateMany({
          where: { clubId, status: { in: ['ACTIVE', 'CANCELLED'] } },
          data: { status: 'EXPIRED' },
        }),
        this.hermes.dispatch({
          eventType: 'subscription_expired',
          clubId,
          title: 'Gói dịch vụ đã hết hạn',
          body: `CLB ${clubName} — gói ${sub.plan.name} đã hết ân hạn. Hệ thống đã chuyển về gói Starter. Vui lòng gia hạn để tiếp tục dùng AI và Telegram Bot.`,
          metadata: { tier: sub.tier, expiredAt: sub.expiresAt },
        }),
      ]);
      this.logger.warn(
        `[Billing] Club ${clubId} hết ân hạn — hạ về STARTER`,
      );
      return;
    }

    // Nhắc trước hạn: 7 / 3 / 1 ngày
    if (daysLeft === 7 || daysLeft === 3 || daysLeft === 1) {
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
