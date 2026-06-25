import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_CONFIGS, PlanTier, SubscriptionStatus } from './billing.types';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Get current subscription ─────────────────────────────────────────────

  async getSubscription(clubId: string): Promise<SubscriptionStatus> {
    const [tierSetting, expirySetting, memberCount] = await Promise.all([
      this.prisma.systemSetting.findUnique({
        where: { key: `subscription_tier_${clubId}` },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: `subscription_expiry_${clubId}` },
      }),
      this.prisma.member.count({ where: { clubId, isDeleted: false } }),
    ]);

    const tier = (tierSetting?.value as PlanTier) ?? 'FREE';
    const plan = PLAN_CONFIGS[tier] ?? PLAN_CONFIGS.FREE;
    const expiresAt = expirySetting?.value ?? null;

    let isActive = tier === 'FREE';
    let daysRemaining: number | null = null;

    if (expiresAt) {
      const expDate = new Date(expiresAt);
      const now = new Date();
      daysRemaining = Math.ceil((expDate.getTime() - now.getTime()) / 86400000);
      isActive = daysRemaining > 0;
    }

    return {
      clubId,
      tier,
      plan,
      expiresAt,
      isActive,
      daysRemaining,
      usage: { members: memberCount, clubs: 1 },
    };
  }

  // ─── Feature gate check ───────────────────────────────────────────────────

  async assertFeature(clubId: string, feature: 'aiFeatures' | 'telegramBot') {
    const sub = await this.getSubscription(clubId);
    if (!sub.isActive || !sub.plan[feature]) {
      throw new ForbiddenException(
        `Tính năng này yêu cầu gói ${feature === 'aiFeatures' ? 'Starter' : 'Pro'} trở lên.`,
      );
    }
  }

  async assertMemberLimit(clubId: string) {
    const sub = await this.getSubscription(clubId);
    if (sub.usage.members >= sub.plan.maxMembers) {
      throw new ForbiddenException(
        `Đã đạt giới hạn ${sub.plan.maxMembers} thành viên của gói ${sub.plan.name}.`,
      );
    }
  }

  // ─── Admin: upgrade subscription ─────────────────────────────────────────

  async upgradePlan(clubId: string, tier: PlanTier, months: number) {
    const plan = PLAN_CONFIGS[tier];
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + months);
    const expiryStr = expiry.toISOString();

    await Promise.all([
      this.prisma.systemSetting.upsert({
        where: { key: `subscription_tier_${clubId}` },
        create: { key: `subscription_tier_${clubId}`, value: tier },
        update: { value: tier },
      }),
      this.prisma.systemSetting.upsert({
        where: { key: `subscription_expiry_${clubId}` },
        create: { key: `subscription_expiry_${clubId}`, value: expiryStr },
        update: { value: expiryStr },
      }),
    ]);

    this.logger.log(
      `[Billing] Club ${clubId} upgraded to ${tier} until ${expiryStr}`,
    );
    return { clubId, tier, plan, expiresAt: expiryStr, months };
  }

  // ─── List all plans ───────────────────────────────────────────────────────

  getPlans() {
    return Object.values(PLAN_CONFIGS);
  }

  // ─── AI cost tracking ─────────────────────────────────────────────────────

  async trackAiCall(clubId: string, tokens: number) {
    const key = `ai_tokens_${clubId}_${new Date().toISOString().slice(0, 7)}`;
    const current = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    const newTotal = (parseInt(current?.value ?? '0', 10) + tokens).toString();
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: newTotal },
      update: { value: newTotal },
    });
  }

  async getAiUsage(
    clubId: string,
  ): Promise<{ month: string; tokens: number; estimatedCostVnd: number }[]> {
    const settings = await this.prisma.systemSetting.findMany({
      where: { key: { startsWith: `ai_tokens_${clubId}_` } },
      orderBy: { key: 'desc' },
      take: 12,
    });
    return settings.map((s) => {
      const month = s.key.replace(`ai_tokens_${clubId}_`, '');
      const tokens = parseInt(s.value, 10);
      // Gemini 1.5 Flash: ~$0.075/1M input tokens → ~1800 VNĐ/1M tokens
      const estimatedCostVnd = Math.round(tokens * 0.0018);
      return { month, tokens, estimatedCostVnd };
    });
  }
}
