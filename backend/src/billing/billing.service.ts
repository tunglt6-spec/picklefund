import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_CONFIGS, SubscriptionStatus } from './billing.types';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Get current subscription — nguồn thật `Club.plan`/`Club.planExpiresAt` ──
  // (trước đây đọc SystemSetting `subscription_tier_*` — hệ song song không liên
  // quan tới `Club.plan` thật mà PATCH /clubs/:id/plan + giới hạn thành viên dùng).

  async getSubscription(clubId: string): Promise<SubscriptionStatus> {
    const [club, memberCount] = await Promise.all([
      this.prisma.club.findUnique({
        where: { id: clubId },
        select: { plan: true, planExpiresAt: true },
      }),
      this.prisma.member.count({ where: { clubId, isDeleted: false } }),
    ]);
    if (!club) throw new NotFoundException('CLB không tồn tại');

    const tier = club.plan;
    const plan = PLAN_CONFIGS[tier];
    const expiresAt = club.planExpiresAt?.toISOString() ?? null;

    let isActive = true;
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
