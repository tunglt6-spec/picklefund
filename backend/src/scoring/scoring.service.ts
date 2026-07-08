/**
 * ScoringService (Chấm điểm thành viên động — Phase 1: NỀN TẢNG).
 * Mỗi TV bắt đầu SCORE_BASELINE (100đ), cộng/trừ theo các event trong tháng,
 * clamp [0,100], xếp loại theo classifyScore. Quy tắc điểm seed per-club từ
 * DEFAULT_SCORING_RULES (CLB sửa được — phần "động"). Scope theo clubId.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_SCORING_RULES,
  SCORE_BASELINE,
  classifyScore,
} from './scoring-rules.constant';

@Injectable()
export class ScoringService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Seed quy tắc điểm mặc định cho 1 CLB. Idempotent theo (clubId, category, label):
   * chỉ tạo rule CHƯA có, không đè/nhân đôi rule CLB đã tự sửa/xóa.
   */
  async seedDefaultRules(
    clubId: string,
  ): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;
    for (const rule of DEFAULT_SCORING_RULES) {
      const existing = await this.prisma.scoringRule.findFirst({
        where: { clubId, category: rule.category, label: rule.label },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }
      await this.prisma.scoringRule.create({
        data: {
          clubId,
          category: rule.category,
          label: rule.label,
          delta: rule.delta,
          source: rule.source,
          sortOrder: rule.sortOrder,
        },
      });
      created++;
    }
    return { created, skipped };
  }

  /**
   * Backfill quy tắc mặc định cho TOÀN BỘ CLB đang hoạt động (status != 'deleted').
   * Idempotent per-club như seedDefaultRules — an toàn chạy lại nhiều lần.
   */
  async seedDefaultRulesForAllClubs(): Promise<{
    clubsProcessed: number;
    totalCreated: number;
    totalSkipped: number;
  }> {
    const clubs = await this.prisma.club.findMany({
      where: { status: { not: 'deleted' } },
      select: { id: true },
    });
    let totalCreated = 0;
    let totalSkipped = 0;
    for (const club of clubs) {
      const { created, skipped } = await this.seedDefaultRules(club.id);
      totalCreated += created;
      totalSkipped += skipped;
    }
    return { clubsProcessed: clubs.length, totalCreated, totalSkipped };
  }

  /**
   * Tính điểm 1 thành viên trong 1 tháng: baseline + tổng delta các event khớp
   * clubId+memberId+periodMonth, clamp [0,100], xếp loại.
   */
  async computeMemberScore(
    clubId: string,
    memberId: string,
    periodMonth: string,
  ): Promise<{ total: number; classification: string }> {
    const agg = await this.prisma.memberScoreEvent.aggregate({
      where: { clubId, memberId, periodMonth },
      _sum: { delta: true },
    });
    const total = this.clamp(SCORE_BASELINE + (agg._sum.delta ?? 0));
    return { total, classification: classifyScore(total) };
  }

  /**
   * Điểm tháng của mọi member active trong CLB. Aggregate delta theo memberId
   * bằng 1 query groupBy. Member chưa có event → baseline (100).
   */
  async getPeriodScores(
    clubId: string,
    periodMonth: string,
  ): Promise<
    Array<{
      memberId: string;
      memberName: string;
      total: number;
      classification: string;
    }>
  > {
    const members = await this.prisma.member.findMany({
      where: { clubId, status: 'active', isDeleted: false },
      select: { id: true, fullName: true },
    });

    const grouped = await this.prisma.memberScoreEvent.groupBy({
      by: ['memberId'],
      where: { clubId, periodMonth },
      _sum: { delta: true },
    });
    const deltaByMember = new Map<string, number>();
    for (const g of grouped) {
      deltaByMember.set(g.memberId, g._sum.delta ?? 0);
    }

    return members.map((m) => {
      const total = this.clamp(SCORE_BASELINE + (deltaByMember.get(m.id) ?? 0));
      return {
        memberId: m.id,
        memberName: m.fullName,
        total,
        classification: classifyScore(total),
      };
    });
  }

  /** Kỳ hiện tại 'YYYY-MM' theo thời điểm gọi (default cho API/job, KHÔNG hardcode). */
  currentPeriod(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${month}`;
  }

  /** Clamp điểm về [0, SCORE_BASELINE]. */
  private clamp(score: number): number {
    if (score < 0) return 0;
    if (score > SCORE_BASELINE) return SCORE_BASELINE;
    return score;
  }
}
