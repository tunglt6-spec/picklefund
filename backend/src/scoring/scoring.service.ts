/**
 * ScoringService (Chấm điểm thành viên động — Phase 1: NỀN TẢNG).
 * Mỗi TV bắt đầu SCORE_BASELINE (100đ), cộng/trừ theo các event trong tháng,
 * clamp [0,100], xếp loại theo classifyScore. Quy tắc điểm seed per-club từ
 * DEFAULT_SCORING_RULES (CLB sửa được — phần "động"). Scope theo clubId.
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, ScoringCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_SCORING_RULES,
  SCORE_BASELINE,
  classifyScore,
} from './scoring-rules.constant';

/** Danh mục chấm điểm hợp lệ (whitelist chống inject). */
const SCORING_CATEGORIES: ScoringCategory[] = [
  'PARTICIPATION',
  'CONDUCT',
  'CONTRIBUTION',
  'DISCIPLINE',
  'FINANCE',
  'BONUS',
];

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

  // ── Quản lý thang điểm (ScoringRule CRUD, scope clubId) ────────────────

  /** Mọi quy tắc điểm của CLB, sắp theo sortOrder tăng dần. */
  async listRules(clubId: string) {
    return this.prisma.scoringRule.findMany({
      where: { clubId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** Tạo quy tắc điểm mới (MANUAL mặc định, active). Validate category + delta. */
  async createRule(
    clubId: string,
    dto: {
      category: ScoringCategory;
      label: string;
      delta: number;
      source?: 'AUTO_ATTENDANCE' | 'AUTO_FINANCE' | 'MANUAL';
      sortOrder?: number;
    },
  ) {
    this.assertCategory(dto.category);
    this.assertDelta(dto.delta);
    const label = (dto.label ?? '').trim();
    if (!label) throw new BadRequestException('Tên quy tắc không được rỗng');
    return this.prisma.scoringRule.create({
      data: {
        clubId,
        category: dto.category,
        label,
        delta: dto.delta,
        source: dto.source ?? 'MANUAL',
        active: true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  /**
   * Cập nhật quy tắc (chỉ label/delta/active/sortOrder). KHÔNG cho đổi clubId.
   * findFirst scope clubId → cross-club không tìm thấy → NotFound.
   */
  async updateRule(
    clubId: string,
    ruleId: string,
    dto: {
      label?: string;
      delta?: number;
      active?: boolean;
      sortOrder?: number;
    },
  ) {
    const existing = await this.prisma.scoringRule.findFirst({
      where: { id: ruleId, clubId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Quy tắc điểm không tồn tại');

    const data: Prisma.ScoringRuleUpdateInput = {};
    if (dto.label !== undefined) {
      const label = dto.label.trim();
      if (!label) throw new BadRequestException('Tên quy tắc không được rỗng');
      data.label = label;
    }
    if (dto.delta !== undefined) {
      this.assertDelta(dto.delta);
      data.delta = dto.delta;
    }
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    return this.prisma.scoringRule.update({ where: { id: ruleId }, data });
  }

  /** Xóa quy tắc (scope clubId). Event.ruleId sẽ SET NULL theo FK. */
  async deleteRule(clubId: string, ruleId: string) {
    const existing = await this.prisma.scoringRule.findFirst({
      where: { id: ruleId, clubId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Quy tắc điểm không tồn tại');
    await this.prisma.scoringRule.delete({ where: { id: ruleId } });
    return { deleted: true };
  }

  // ── Sự kiện điểm thủ công ──────────────────────────────────────────────

  /**
   * Thêm 1 event cộng/trừ điểm thủ công. Nếu có ruleId → ưu tiên category/label/delta
   * từ rule khi dto không truyền. source luôn MANUAL, refId=null (cho phép lặp).
   */
  async addManualEvent(
    clubId: string,
    dto: {
      memberId: string;
      ruleId?: string;
      category?: ScoringCategory;
      label?: string;
      delta?: number;
      periodMonth?: string;
      note?: string;
    },
    createdById: string,
  ) {
    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, clubId },
      select: { id: true },
    });
    if (!member)
      throw new BadRequestException('Thành viên không thuộc CLB này');

    let category = dto.category;
    let label = dto.label;
    let delta = dto.delta;

    if (dto.ruleId) {
      const rule = await this.prisma.scoringRule.findFirst({
        where: { id: dto.ruleId, clubId },
      });
      if (!rule) throw new BadRequestException('Quy tắc điểm không hợp lệ');
      // Ưu tiên giá trị từ rule khi dto KHÔNG truyền.
      category = dto.category ?? rule.category;
      label = dto.label ?? rule.label;
      delta = dto.delta ?? rule.delta;
    }

    if (!category) throw new BadRequestException('Thiếu category');
    this.assertCategory(category);
    if (delta === undefined || delta === null)
      throw new BadRequestException('Thiếu delta');
    this.assertDelta(delta);
    const finalLabel = (label ?? '').trim();
    if (!finalLabel)
      throw new BadRequestException('Tên sự kiện không được rỗng');

    return this.prisma.memberScoreEvent.create({
      data: {
        clubId,
        memberId: dto.memberId,
        ruleId: dto.ruleId ?? null,
        category,
        label: finalLabel,
        delta,
        source: 'MANUAL',
        periodMonth: dto.periodMonth ?? this.currentPeriod(),
        note: dto.note ?? null,
        refId: null,
        createdById,
      },
    });
  }

  /** Xóa 1 event (scope clubId). */
  async removeEvent(clubId: string, eventId: string) {
    const existing = await this.prisma.memberScoreEvent.findFirst({
      where: { id: eventId, clubId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Sự kiện điểm không tồn tại');
    await this.prisma.memberScoreEvent.delete({ where: { id: eventId } });
    return { deleted: true };
  }

  /** Chi tiết điểm 1 thành viên trong tháng: tổng + xếp loại + danh sách event. */
  async getMemberDetail(
    clubId: string,
    memberId: string,
    periodMonth: string,
  ) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, clubId },
      select: { id: true, fullName: true },
    });
    if (!member) throw new NotFoundException('Thành viên không tồn tại');

    const [{ total, classification }, events] = await Promise.all([
      this.computeMemberScore(clubId, memberId, periodMonth),
      this.prisma.memberScoreEvent.findMany({
        where: { clubId, memberId, periodMonth },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      memberId: member.id,
      memberName: member.fullName,
      total,
      classification,
      events,
    };
  }

  // ── Chốt tháng ──────────────────────────────────────────────────────────

  /**
   * Chốt điểm cuối tháng: tính điểm mọi member active, upsert snapshot theo
   * unique (memberId, periodMonth). Trả số lượng đã chốt.
   */
  async finalizePeriod(
    clubId: string,
    periodMonth: string,
    finalizedById: string,
  ) {
    const scores = await this.getPeriodScores(clubId, periodMonth);
    for (const s of scores) {
      await this.prisma.memberScoreSnapshot.upsert({
        where: {
          memberId_periodMonth: { memberId: s.memberId, periodMonth },
        },
        create: {
          clubId,
          memberId: s.memberId,
          periodMonth,
          totalScore: s.total,
          classification: s.classification,
          finalizedById,
          finalizedAt: new Date(),
        },
        update: {
          totalScore: s.total,
          classification: s.classification,
          finalizedById,
          finalizedAt: new Date(),
        },
      });
    }
    return { finalized: scores.length };
  }

  // ── Auto-scoring (ON-DEMAND) ─────────────────────────────────────────────

  /**
   * Chạy chấm điểm tự động cho 1 tháng: điểm danh (+2 mỗi buổi PRESENT) + tài
   * chính (đúng hạn/trễ/nợ theo kỳ quỹ chung). Idempotent qua unique
   * (memberId, source, periodMonth, refId) + createMany({skipDuplicates:true}).
   *
   * LƯU Ý Phase 2: nếu điểm danh/khoản đóng THAY ĐỔI sau lần chạy đầu, event cũ
   * GIỮ NGUYÊN (không tự sửa/xóa) — chấp nhận trong Phase 2.
   */
  async runAutoScoring(clubId: string, periodMonth: string) {
    const { start, end } = this.monthRange(periodMonth);

    const events: Prisma.MemberScoreEventCreateManyInput[] = [];

    // ── Nhánh điểm danh ──
    const attendanceRule = await this.prisma.scoringRule.findFirst({
      where: {
        clubId,
        source: 'AUTO_ATTENDANCE',
        category: 'PARTICIPATION',
        label: 'Tham gia đúng giờ',
        active: true,
      },
    });
    if (attendanceRule) {
      const sessions = await this.prisma.attendanceSession.findMany({
        where: { clubId, sessionDate: { gte: start, lt: end } },
        select: { id: true },
      });
      const sessionIds = sessions.map((s) => s.id);
      if (sessionIds.length > 0) {
        const records = await this.prisma.attendanceRecord.findMany({
          where: {
            clubId,
            status: 'PRESENT',
            attendanceSessionId: { in: sessionIds },
          },
          select: { memberId: true, attendanceSessionId: true },
        });
        for (const r of records) {
          events.push({
            clubId,
            memberId: r.memberId,
            ruleId: attendanceRule.id,
            category: 'PARTICIPATION',
            label: attendanceRule.label,
            delta: attendanceRule.delta,
            source: 'AUTO_ATTENDANCE',
            periodMonth,
            refId: r.attendanceSessionId,
          });
        }
      }
    }

    // ── Nhánh tài chính ──
    const financeRules = await this.prisma.scoringRule.findMany({
      where: { clubId, source: 'AUTO_FINANCE', active: true },
    });
    const onTimeRule = financeRules.find((r) => r.label === 'Đóng quỹ đúng hạn');
    const lateRule = financeRules.find((r) => r.label === 'Đóng quỹ trễ hạn');
    const overdueRule = financeRules.find((r) => r.label === 'Nợ quỹ quá hạn');

    if (onTimeRule || lateRule || overdueRule) {
      const now = new Date();
      const periods = await this.prisma.fundPeriod.findMany({
        where: { clubId, type: 'chung', endDate: { gte: start, lt: end } },
        select: { id: true, endDate: true },
      });
      if (periods.length > 0) {
        const members = await this.prisma.member.findMany({
          where: { clubId, status: 'active', isDeleted: false },
          select: { id: true },
        });
        // 1 query thay cho N+1 (trước đây findFirst mỗi member×kỳ): lấy mọi khoản đóng
        // COMMON đã xác nhận của các kỳ trong tháng, rồi map trong bộ nhớ.
        const periodIds = periods.map((p) => p.id);
        const contribs = await this.prisma.fundContribution.findMany({
          where: {
            clubId,
            fundPeriodId: { in: periodIds },
            fundSource: 'COMMON',
            isConfirmed: true,
          },
          select: { fundPeriodId: true, memberId: true, paymentDate: true },
        });
        // Map "kỳ|member" → paymentDate SỚM NHẤT (giữ ngữ nghĩa orderBy paymentDate asc cũ).
        const earliestPaid = new Map<string, Date>();
        for (const c of contribs) {
          if (!c.memberId || !c.fundPeriodId) continue;
          const key = `${c.fundPeriodId}|${c.memberId}`;
          const cur = earliestPaid.get(key);
          if (!cur || c.paymentDate < cur) earliestPaid.set(key, c.paymentDate);
        }
        for (const period of periods) {
          for (const member of members) {
            const paid = earliestPaid.get(`${period.id}|${member.id}`);

            let rule = null as (typeof financeRules)[number] | null;
            if (paid) {
              rule =
                paid <= period.endDate
                  ? onTimeRule ?? null
                  : lateRule ?? null;
            } else if (period.endDate < now) {
              rule = overdueRule ?? null;
            }
            if (!rule) continue;

            events.push({
              clubId,
              memberId: member.id,
              ruleId: rule.id,
              category: 'FINANCE',
              label: rule.label,
              delta: rule.delta,
              source: 'AUTO_FINANCE',
              periodMonth,
              refId: period.id,
            });
          }
        }
      }
    }

    const attendanceEvents = events.filter(
      (e) => e.source === 'AUTO_ATTENDANCE',
    ).length;
    const financeEvents = events.filter(
      (e) => e.source === 'AUTO_FINANCE',
    ).length;

    if (events.length > 0) {
      // skipDuplicates chống cộng trùng khi chạy lại (unique memberId+source+periodMonth+refId).
      await this.prisma.memberScoreEvent.createMany({
        data: events,
        skipDuplicates: true,
      });
    }

    return { attendanceEvents, financeEvents };
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

  /** Khoảng [đầu tháng, đầu tháng sau) từ periodMonth 'YYYY-MM'. */
  private monthRange(periodMonth: string): { start: Date; end: Date } {
    if (!/^\d{4}-\d{2}$/.test(periodMonth))
      throw new BadRequestException('Tháng không hợp lệ (định dạng YYYY-MM)');
    const [y, m] = periodMonth.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    return { start, end };
  }

  /** Validate category ∈ enum. */
  private assertCategory(category: ScoringCategory): void {
    if (!SCORING_CATEGORIES.includes(category))
      throw new BadRequestException('Danh mục chấm điểm không hợp lệ');
  }

  /** Validate delta là số nguyên trong [-100, 100]. */
  private assertDelta(delta: number): void {
    if (!Number.isInteger(delta) || delta < -100 || delta > 100)
      throw new BadRequestException(
        'Điểm delta phải là số nguyên trong khoảng -100..100',
      );
  }
}
