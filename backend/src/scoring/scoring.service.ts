/**
 * ScoringService (Chấm điểm thành viên động — model MỚI: chỉ giảm điểm).
 * Mỗi TV mặc định SCORE_BASELINE (100đ). Điểm danh + tài chính tính LIVE từ data
 * thật mỗi lần đọc (KHÔNG persist event). Tiêu chí khác full mặc định, admin nhập
 * tay khi vi phạm (trừ) / thưởng (cộng, cap 100).
 *   total = clamp(100 + autoAttendance + autoFinance + Σ manualEvents.delta, 0, 100)
 * Quy tắc điểm seed per-club từ DEFAULT_SCORING_RULES (CLB sửa được). Scope clubId.
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
  RULE_KEY,
  SCORE_BASELINE,
  classifyScore,
} from './scoring-rules.constant';

/** Kết quả tính AUTO cho 1 member trong tháng (điểm danh + tài chính). */
interface AutoDelta {
  attendance: number;
  finance: number;
  lateDelta: number;
  overdueDelta: number;
  absentCount: number;
  lateCount: number;
  overdueCount: number;
}

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
   * Seed quy tắc điểm mặc định cho 1 CLB. Idempotent theo (clubId, systemKey):
   * chỉ tạo rule template CHƯA có, không đè/nhân đôi rule CLB đã tự sửa/xóa.
   */
  async seedDefaultRules(
    clubId: string,
  ): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;
    for (const rule of DEFAULT_SCORING_RULES) {
      const existing = await this.prisma.scoringRule.findFirst({
        where: { clubId, systemKey: rule.systemKey },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }
      await this.prisma.scoringRule.create({
        data: {
          clubId,
          systemKey: rule.systemKey,
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
   * Tính deltas AUTO (điểm danh + tài chính) LIVE từ data thật cho 1 tháng.
   * BATCH hiệu quả (không N+1). Trả Map theo memberId. memberIds=undefined → mọi
   * member (dùng cho bảng điểm); truyền [id] → chỉ 1 member (dùng cho chi tiết).
   *
   * - attendance = absentCount × attendanceRule.delta (delta ÂM). PRESENT không trừ.
   * - finance = lateCount × lateRule.delta + overdueCount × overdueRule.delta.
   * Rule thiếu/inactive → phần đó = 0.
   */
  private async computeAutoDeltas(
    clubId: string,
    periodMonth: string,
    memberIds?: string[],
  ): Promise<Map<string, AutoDelta>> {
    const { start, end } = this.monthRange(periodMonth);
    const now = new Date();

    // Đọc 3 AUTO rule qua systemKey (active). delta mặc định 0 nếu thiếu.
    const autoRules = await this.prisma.scoringRule.findMany({
      where: {
        clubId,
        active: true,
        source: { in: ['AUTO_ATTENDANCE', 'AUTO_FINANCE'] },
      },
      select: { systemKey: true, delta: true },
    });
    const ruleDelta = (key: string): number =>
      autoRules.find((r) => r.systemKey === key)?.delta ?? 0;
    const absentDelta = ruleDelta(RULE_KEY.ATTENDANCE_ABSENT);
    const lateDelta = ruleDelta(RULE_KEY.FINANCE_LATE);
    const overdueDelta = ruleDelta(RULE_KEY.FINANCE_OVERDUE);

    const result = new Map<string, AutoDelta>();
    const ensure = (id: string) => {
      let e = result.get(id);
      if (!e) {
        e = {
          attendance: 0,
          finance: 0,
          lateDelta: 0,
          overdueDelta: 0,
          absentCount: 0,
          lateCount: 0,
          overdueCount: 0,
        };
        result.set(id, e);
      }
      return e;
    };

    // ── Điểm danh: đếm buổi ABSENT của member trong tháng ──
    const sessions = await this.prisma.attendanceSession.findMany({
      where: { clubId, sessionDate: { gte: start, lt: end } },
      select: { id: true },
    });
    const sessionIds = sessions.map((s) => s.id);
    if (sessionIds.length > 0) {
      const absentGroups = await this.prisma.attendanceRecord.groupBy({
        by: ['memberId'],
        where: {
          clubId,
          status: 'ABSENT',
          attendanceSessionId: { in: sessionIds },
          ...(memberIds ? { memberId: { in: memberIds } } : {}),
        },
        _count: { _all: true },
      });
      for (const g of absentGroups) {
        const e = ensure(g.memberId);
        e.absentCount = g._count._all;
        e.attendance = e.absentCount * absentDelta;
      }
    }

    // ── Tài chính: mỗi kỳ quỹ 'chung' có endDate trong tháng ──
    const periods = await this.prisma.fundPeriod.findMany({
      where: { clubId, type: 'chung', endDate: { gte: start, lt: end } },
      select: { id: true, endDate: true },
    });
    if (periods.length > 0) {
      const periodIds = periods.map((p) => p.id);
      // member active (lọc theo memberIds nếu có) — chỉ member này mới bị chấm.
      const members = await this.prisma.member.findMany({
        where: {
          clubId,
          status: 'active',
          isDeleted: false,
          ...(memberIds ? { id: { in: memberIds } } : {}),
        },
        select: { id: true },
      });
      const contribs = await this.prisma.fundContribution.findMany({
        where: {
          clubId,
          fundPeriodId: { in: periodIds },
          fundSource: 'COMMON',
          isConfirmed: true,
        },
        select: { fundPeriodId: true, memberId: true, paymentDate: true },
      });
      // Map "kỳ|member" → paymentDate SỚM NHẤT.
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
          if (paid) {
            if (paid <= period.endDate) continue; // đúng hạn → 0
            const e = ensure(member.id);
            e.lateCount++;
          } else if (period.endDate < now) {
            const e = ensure(member.id);
            e.overdueCount++;
          }
        }
      }
      // Quy đổi count → delta (giữ tách trễ / nợ để hiển thị chi tiết).
      for (const e of result.values()) {
        e.lateDelta = e.lateCount * lateDelta;
        e.overdueDelta = e.overdueCount * overdueDelta;
        e.finance = e.lateDelta + e.overdueDelta;
      }
    }

    return result;
  }

  /**
   * Tính điểm 1 thành viên trong 1 tháng LIVE:
   *   total = clamp(100 + autoAttendance + autoFinance + Σ manualEvents.delta).
   */
  async computeMemberScore(
    clubId: string,
    memberId: string,
    periodMonth: string,
  ): Promise<{ total: number; classification: string }> {
    const [autoMap, manualAgg] = await Promise.all([
      this.computeAutoDeltas(clubId, periodMonth, [memberId]),
      this.prisma.memberScoreEvent.aggregate({
        where: { clubId, memberId, periodMonth, source: 'MANUAL' },
        _sum: { delta: true },
      }),
    ]);
    const auto = autoMap.get(memberId);
    const total = this.clamp(
      SCORE_BASELINE +
        (auto?.attendance ?? 0) +
        (auto?.finance ?? 0) +
        (manualAgg._sum.delta ?? 0),
    );
    return { total, classification: classifyScore(total) };
  }

  /**
   * Điểm tháng của mọi member active trong CLB (LIVE). auto tính batch;
   * manual aggregate theo memberId (chỉ source MANUAL).
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

    const [autoMap, grouped] = await Promise.all([
      this.computeAutoDeltas(clubId, periodMonth),
      this.prisma.memberScoreEvent.groupBy({
        by: ['memberId'],
        where: { clubId, periodMonth, source: 'MANUAL' },
        _sum: { delta: true },
      }),
    ]);
    const manualByMember = new Map<string, number>();
    for (const g of grouped) {
      manualByMember.set(g.memberId, g._sum.delta ?? 0);
    }

    return members.map((m) => {
      const auto = autoMap.get(m.id);
      const total = this.clamp(
        SCORE_BASELINE +
          (auto?.attendance ?? 0) +
          (auto?.finance ?? 0) +
          (manualByMember.get(m.id) ?? 0),
      );
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

  /**
   * Chi tiết điểm 1 thành viên trong tháng: tổng + xếp loại + dòng AUTO (LIVE)
   * + danh sách event thủ công. autoLines chỉ hiện phần có phát sinh trừ.
   */
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

    const [autoMap, manualAgg, events] = await Promise.all([
      this.computeAutoDeltas(clubId, periodMonth, [memberId]),
      this.prisma.memberScoreEvent.aggregate({
        where: { clubId, memberId, periodMonth, source: 'MANUAL' },
        _sum: { delta: true },
      }),
      this.prisma.memberScoreEvent.findMany({
        where: { clubId, memberId, periodMonth, source: 'MANUAL' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const auto = autoMap.get(memberId);
    const attendance = auto?.attendance ?? 0;
    const finance = auto?.finance ?? 0;
    const manualSum = manualAgg._sum.delta ?? 0;
    const total = this.clamp(
      SCORE_BASELINE + attendance + finance + manualSum,
    );

    const autoLines: Array<{ label: string; delta: number }> = [];
    if (auto && auto.absentCount > 0 && attendance < 0) {
      autoLines.push({
        label: `Vắng ${auto.absentCount} buổi`,
        delta: attendance,
      });
    }
    if (auto && auto.lateCount > 0) {
      autoLines.push({
        label: `Đóng trễ ${auto.lateCount} kỳ`,
        delta: auto.lateDelta,
      });
    }
    if (auto && auto.overdueCount > 0) {
      autoLines.push({
        label: `Nợ ${auto.overdueCount} kỳ`,
        delta: auto.overdueDelta,
      });
    }

    return {
      memberId: member.id,
      memberName: member.fullName,
      total,
      classification: classifyScore(total),
      autoLines,
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
