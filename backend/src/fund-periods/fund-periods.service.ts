import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialCalculatorService } from '../financial/financial-calculator.service';
import { HermesEventPublisher } from '../workflows/hermes-event.publisher';
import type { FundPeriodStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class FundPeriodsService {
  constructor(
    private prisma: PrismaService,
    private calculator: FinancialCalculatorService,
    private events: HermesEventPublisher,
  ) {}

  private liveMemberCount(clubId: string) {
    return this.prisma.member.count({ where: { clubId, isDeleted: false } });
  }

  /**
   * Chuẩn hóa "sĩ số tính phí" (billedMemberCount): kỳ đang thu MỚI NHẤT (active 'chung',
   * startDate lớn nhất) dùng số live (=null → theo danh sách thành viên); MỌI kỳ 'chung' khác
   * còn null → CHỐT CỨNG = countToFreeze. Gọi khi thêm/xóa member (countToFreeze = số member
   * TRƯỚC thay đổi) và khi tạo kỳ/đổi trạng thái (countToFreeze = số hiện tại) → thao tác roster
   * KHÔNG làm lệch bill các kỳ đã chốt. Xem [[plan]] "chốt kỳ quỹ tại thời điểm xóa".
   */
  async snapshotPastPeriods(clubId: string, countToFreeze: number) {
    const current = await this.prisma.fundPeriod.findFirst({
      where: { clubId, type: 'chung', status: 'active' },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
      select: { id: true },
    });
    await this.prisma.fundPeriod.updateMany({
      where: {
        clubId,
        type: 'chung',
        billedMemberCount: null,
        // KHÔNG chốt kỳ TƯƠNG LAI (chưa tới startDate): kỳ đó rồi sẽ thành "kỳ hiện tại",
        // phải giữ null (sĩ số live) — nếu chốt sớm, lúc kích hoạt sẽ chia phí theo sĩ số cũ.
        startDate: { lte: new Date() },
        ...(current ? { id: { not: current.id } } : {}),
      },
      data: { billedMemberCount: countToFreeze },
    });
    // Kỳ hiện tại phải dùng số live (null) để theo danh sách thành viên.
    if (current) {
      await this.prisma.fundPeriod.updateMany({
        where: { id: current.id, billedMemberCount: { not: null } },
        data: { billedMemberCount: null },
      });
    }
  }

  async findAll(clubId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Auto-transition: draft → active when startDate arrived; active → closed when endDate passed
    const transitions = await this.prisma.$transaction([
      // Future period that was incorrectly set to active → revert to draft
      this.prisma.fundPeriod.updateMany({
        where: { clubId, status: 'active', startDate: { gt: today } },
        data: { status: 'draft' },
      }),
      // Draft period whose startDate has arrived → open
      this.prisma.fundPeriod.updateMany({
        where: {
          clubId,
          status: 'draft',
          startDate: { lte: today },
          endDate: { gte: today },
        },
        data: { status: 'active' },
      }),
      // Draft period whose endDate has passed → close (active periods are not auto-closed to respect manual reopen)
      this.prisma.fundPeriod.updateMany({
        where: {
          clubId,
          status: 'draft',
          endDate: { lt: today },
        },
        data: { status: 'closed' },
      }),
    ]);
    // Có kỳ vừa tự chuyển trạng thái → (a) chuẩn hóa sĩ số chốt: kỳ VỪA ACTIVE phải về
    // null (sĩ số live — kể cả nếu từng bị chốt nhầm khi còn là draft tương lai), kỳ vừa
    // đóng được chốt cứng; (b) đổi status đổi chuỗi carryForward → xóa cache số dư cuối kỳ
    // (không thì clubAssets các kỳ sau đọc cache cũ tới lần ghi thu/chi kế tiếp).
    if (transitions.some((t) => t.count > 0)) {
      await this.snapshotPastPeriods(clubId, await this.liveMemberCount(clubId));
      await this.calculator.invalidateClosingBalances(clubId);
    }
    const [rows, liveCount] = await Promise.all([
      this.prisma.fundPeriod.findMany({
        where: { clubId },
        orderBy: { startDate: 'desc' },
        include: {
          _count: { select: { attendanceSessions: true, contributions: true } },
        },
      }),
      this.liveMemberCount(clubId),
    ]);
    // billedMemberCount HIỆU DỤNG cho FE: đã chốt → dùng số chốt; null → số live (kỳ hiện tại).
    return rows.map((r) => ({
      ...r,
      billedMemberCount: r.billedMemberCount ?? liveCount,
    }));
  }

  async findOne(id: string, clubId: string) {
    const fp = await this.prisma.fundPeriod.findFirst({
      where: { id, clubId },
    });
    if (!fp) throw new NotFoundException('Kỳ quỹ không tồn tại');
    return fp;
  }

  async create(
    clubId: string,
    userId: string,
    dto: {
      name: string;
      startDate: string;
      endDate: string;
      contributionAmount: number;
      totalSessions?: number;
      notes?: string;
      type?: string;
      copyMembersFromPreviousPeriod?: boolean;
    },
  ) {
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    }
    const { type, copyMembersFromPreviousPeriod, ...safeDto } = dto;
    const periodType = type ?? 'chung';
    const data = {
      ...safeDto,
      clubId,
      createdById: userId,
      type: periodType,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      contributionAmount: new Decimal(dto.contributionAmount),
      totalSessions: dto.totalSessions ?? 0,
      status: (new Date(dto.startDate) > new Date()
        ? 'draft'
        : 'active') as FundPeriodStatus,
    };

    if (!copyMembersFromPreviousPeriod) {
      const created = await this.prisma.fundPeriod.create({ data });
      // Kỳ mới thành "kỳ hiện tại" → chốt cứng kỳ-hiện-tại-cũ tại số member hiện tại.
      await this.snapshotPastPeriods(clubId, await this.liveMemberCount(clubId));
      await this.calculator.invalidateClosingBalances(clubId);
      return { ...created, copiedMembersCount: 0 };
    }

    // FUND-IMPL-01: tạo kỳ quỹ + copy roster thành viên từ kỳ gần nhất CÙNG LOẠI
    // trong 1 transaction — copy lỗi phải rollback luôn kỳ quỹ mới (không partial data).
    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.fundPeriod.create({ data });

      const previousPeriod = await tx.fundPeriod.findFirst({
        where: {
          clubId,
          type: periodType,
          id: { not: created.id },
          OR: [
            { startDate: { lt: created.startDate } },
            { endDate: { lt: created.endDate } },
          ],
        },
        orderBy: [
          { endDate: 'desc' },
          { startDate: 'desc' },
          { createdAt: 'desc' },
        ],
      });
      if (!previousPeriod) return { ...created, copiedMembersCount: 0 };

      // Roster của kỳ trước (KHÔNG phải toàn bộ member CLB) — quỹ phụ/giải đấu
      // thường không phải ai cũng tham gia.
      const previousRoster = await tx.fundPeriodMember.findMany({
        where: { fundPeriodId: previousPeriod.id },
        select: { memberId: true },
      });
      if (previousRoster.length === 0)
        return { ...created, copiedMembersCount: 0 };

      // §8: không copy member đã inactive/rời CLB — chỉ giữ member đang active.
      const activeMembers = await tx.member.findMany({
        where: {
          clubId,
          isDeleted: false,
          status: 'active',
          id: { in: previousRoster.map((r) => r.memberId) },
        },
        select: { id: true },
      });
      if (activeMembers.length === 0)
        return { ...created, copiedMembersCount: 0 };

      // Reset theo kỳ mới: expectedAmount = mức đóng/người kỳ mới; KHÔNG copy
      // paidAmount/payment history/confirmed cũ (chỉ tạo roster, không tạo contribution).
      const { count } = await tx.fundPeriodMember.createMany({
        data: activeMembers.map((m) => ({
          clubId,
          fundPeriodId: created.id,
          memberId: m.id,
          expectedAmount: created.contributionAmount,
        })),
        skipDuplicates: true,
      });

      return { ...created, copiedMembersCount: count };
    });
    // Kỳ mới thành "kỳ hiện tại" → chốt cứng kỳ-hiện-tại-cũ tại số member hiện tại.
    await this.snapshotPastPeriods(clubId, await this.liveMemberCount(clubId));
    await this.calculator.invalidateClosingBalances(clubId);
    return result;
  }

  /** FUND-IMPL-01: thông tin kỳ quỹ gần nhất CÙNG LOẠI để hiển thị preview copy-member
   * trong modal tạo kỳ quỹ mới (trước khi kỳ mới tồn tại). */
  async previousPeriodInfo(clubId: string, type: string) {
    const previousPeriod = await this.prisma.fundPeriod.findFirst({
      where: { clubId, type },
      orderBy: [
        { endDate: 'desc' },
        { startDate: 'desc' },
        { createdAt: 'desc' },
      ],
    });
    if (!previousPeriod) return null;
    const memberCount = await this.prisma.fundPeriodMember.count({
      where: { fundPeriodId: previousPeriod.id },
    });
    return {
      id: previousPeriod.id,
      name: previousPeriod.name,
      startDate: previousPeriod.startDate,
      endDate: previousPeriod.endDate,
      memberCount,
    };
  }

  async update(id: string, clubId: string, dto: any) {
    const fp = await this.findOne(id, clubId);
    if (fp.status === 'finalized')
      throw new BadRequestException('Kỳ đã chốt không thể sửa');
    const { clubId: _c, createdById: _b, id: _id, type, ...safeDto } = dto;
    const effectiveStart = safeDto.startDate
      ? new Date(safeDto.startDate)
      : fp.startDate;
    const effectiveEnd = safeDto.endDate
      ? new Date(safeDto.endDate)
      : fp.endDate;
    if (effectiveEnd <= effectiveStart)
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    const updated = await this.prisma.fundPeriod.update({
      where: { id, clubId },
      data: {
        ...safeDto,
        ...(type !== undefined ? { type } : {}),
        ...(safeDto.startDate
          ? { startDate: new Date(safeDto.startDate) }
          : {}),
        ...(safeDto.endDate ? { endDate: new Date(safeDto.endDate) } : {}),
        ...(safeDto.contributionAmount
          ? { contributionAmount: new Decimal(safeDto.contributionAmount) }
          : {}),
      },
    });
    // Sửa startDate/endDate/type/mức đóng có thể đảo thứ tự chuỗi carryForward → xóa cache số dư
    // cuối kỳ toàn CLB (tránh clubAssets stale ở các kỳ đã finalize). Xem summary().
    await this.calculator.invalidateClosingBalances(clubId);
    return updated;
  }

  async updateStatus(id: string, clubId: string, status: FundPeriodStatus) {
    const fp = await this.findOne(id, clubId);
    const updates: any = { status };
    if (status === 'finalized') updates.finalizedAt = new Date();
    const updated = await this.prisma.fundPeriod.update({
      where: { id, clubId },
      data: updates,
    });
    // Đổi trạng thái đổi "kỳ hiện tại" → chuẩn hóa sĩ số chốt (đóng kỳ = chốt cứng; mở lại =
    // đưa về live nếu thành kỳ hiện tại). Best-effort, không chặn luồng.
    await this.snapshotPastPeriods(clubId, await this.liveMemberCount(clubId));
    // Đổi trạng thái làm đổi chuỗi carryForward → xóa cache số dư cuối kỳ toàn CLB.
    await this.calculator.invalidateClosingBalances(clubId);
    // Finalize → LƯU số dư cuối kỳ (snapshot) để các kỳ sau đọc thẳng, bỏ đệ quy.
    // Best-effort: lỗi tính toán KHÔNG được làm hỏng việc chốt sổ (status+event đã commit);
    // closingBalance để null → summary tự tính lại (fallback) khi cần.
    if (status === 'finalized') {
      try {
        const s = await this.summary(id, clubId);
        await this.prisma.fundPeriod.update({
          where: { id, clubId },
          data: { closingBalance: s.clubAssets.balance },
        });
      } catch {
        /* ignore — closingBalance sẽ được tính lại ở lần đọc summary sau */
      }
    }
    // Epic 7: kỳ quỹ chốt sổ → phát event SAU khi commit — fire-and-forget.
    if (status === 'finalized') {
      this.events.publish({
        clubId,
        userId: fp.createdById,
        triggerType: 'FUND_PERIOD_CLOSED',
        context: { fundPeriodId: id },
        idempotencyKey: `FUND_PERIOD_CLOSED:${id}`,
      });
    }
    return updated;
  }

  /**
   * Xóa kỳ quỹ + TOÀN BỘ dữ liệu con (buổi sinh hoạt, điểm danh, đăng ký, thu,
   * chi, phiếu thu cá nhân). Các bảng con phần lớn KHÔNG có onDelete:Cascade
   * (chỉ SessionRegistration + FundPeriodMember có) — xóa thẳng fundPeriod
   * trước đây gây lỗi 500 (vi phạm khóa ngoại) nếu kỳ có bất kỳ dữ liệu nào.
   * Dùng $transaction để đảm bảo xóa trọn vẹn hoặc không xóa gì (rollback nếu lỗi).
   */
  async delete(id: string, clubId: string) {
    const fp = await this.findOne(id, clubId);
    if (fp.status === 'finalized')
      throw new BadRequestException('Kỳ đã chốt không thể xóa');
    await this.prisma.$transaction([
      // AttendanceRecord không cascade theo session — phải xóa trước session.
      this.prisma.attendanceRecord.deleteMany({
        where: { attendanceSession: { fundPeriodId: id } },
      }),
      // LivingExpense có thể gắn theo fundPeriodId hoặc theo attendanceSessionId
      // (buổi thuộc kỳ này) — xóa cả 2 trường hợp trước khi xóa session.
      this.prisma.livingExpense.deleteMany({
        where: {
          OR: [{ fundPeriodId: id }, { attendanceSession: { fundPeriodId: id } }],
        },
      }),
      // SessionRegistration có onDelete:Cascade theo session nên tự xóa theo.
      this.prisma.attendanceSession.deleteMany({ where: { fundPeriodId: id } }),
      this.prisma.fundContribution.deleteMany({ where: { fundPeriodId: id } }),
      this.prisma.personalReceipt.deleteMany({ where: { fundPeriodId: id } }),
      // FundPeriodMember có onDelete:Cascade theo fundPeriod — không cần xóa tay,
      // nhưng vẫn để prisma.fundPeriod.delete() ở cuối tự cuốn theo.
      this.prisma.fundPeriod.delete({ where: { id, clubId } }),
    ]);
    // Xóa kỳ đổi chuỗi carryForward → xóa cache số dư cuối kỳ toàn CLB.
    await this.calculator.invalidateClosingBalances(clubId);
    return { deleted: true };
  }

  // _cache: memo hóa TRONG 1 request — khi 1 request tính summary cho nhiều kỳ (Reports,
  // alerts) hoặc chuỗi carryForward chạm lại 1 kỳ, không tính lại calculate() → tránh O(n²).
  async summary(
    id: string,
    clubId: string,
    _cache?: Map<string, any>,
  ): Promise<any> {
    const cache: Map<string, any> = _cache ?? new Map();
    const cached = cache.get(id);
    if (cached) return cached;
    const fp = await this.findOne(id, clubId);

    // Derive carryForward from most recent closed/finalized period before this one
    const previousPeriod = await this.prisma.fundPeriod.findFirst({
      where: {
        clubId,
        id: { not: id }, // phòng thủ: kỳ KHÔNG bao giờ là carryForward của chính nó
        startDate: { lt: fp.startDate },
        status: { in: ['closed', 'finalized'] },
      },
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true, closingBalance: true },
    });

    // carryForward = SỐ DƯ CUỐI kỳ trước (clubAssets.balance của kỳ đó — đã bao gồm
    // carryForward của chính kỳ đó). Gọi ĐỆ QUY summary() của kỳ trước để chuỗi carryForward
    // cộng dồn đúng qua nhiều kỳ liên tiếp (kỳ N-2 không bị bỏ sót khi tính kỳ N).
    // Trước đây tính trực tiếp "prevIncome - prevExpense" chỉ của RIÊNG kỳ liền trước (không đệ quy)
    // → mất số dư các kỳ xa hơn N-1; đồng thời fallback prevTotalLiving>0?prevTotalLiving:prevTotalCourt
    // không khớp canonical (financial-calculator dùng tổng EQUAL+PRESENT_ONLY/ATTENDANCE+FUND_ONLY).
    let carryForwardBalance = 0;
    if (previousPeriod) {
      if (previousPeriod.closingBalance != null) {
        // Số dư cuối kỳ trước ĐÃ CHỐT (cache) → đọc thẳng, KHÔNG đệ quy calculate().
        carryForwardBalance = Number(previousPeriod.closingBalance);
      } else {
        const prevSummary = await this.summary(previousPeriod.id, clubId, cache);
        carryForwardBalance = prevSummary.clubAssets.balance;
      }
    }

    const result = await this.calculator.calculate(id, clubId, {
      carryForwardBalance,
      previousPeriodId: previousPeriod?.id ?? null,
      previousPeriodName: previousPeriod?.name ?? null,
    });

    const sessionCount = result.totalSessions;

    const out = {
      totalIncome: result.commonFund.totalIncome,
      totalExpenses: result.commonFund.totalExpense,
      courtExpenses: result.commonFund.totalCourt,
      livingExpenses: result.commonFund.totalLiving,
      balance: result.commonFund.balance,
      // Số buổi tập của kỳ (đã tính ở financial-calculator) — frontend Reports dùng làm
      // 1 trong các field bắt buộc của Export Gate (officialReady). Trước đây không expose
      // → kSessions luôn undefined → gate luôn disabled. Expose giá trị thật (không fake).
      totalSessions: sessionCount,
      totalAttendance: result.totalAttendance,
      costPerAttendance: result.costPerAttendance,
      // Sĩ số tính phí đã chốt của kỳ (billedMemberCount ?? live) — FE dùng cho target/tiến độ.
      memberCount: result.memberCount,
      unpaidCount: result.members.filter((m) => m.status === 'UNPAID').length,
      negativeBalanceCount: result.members.filter((m) => m.balance < 0).length,
      lowAttendanceCount: result.members.filter(
        (m) => sessionCount > 0 && m.attendedSessions / sessionCount < 0.5,
      ).length,
      // Quỹ Phụ
      miniIncome: result.miniFund.totalIncome,
      miniExpense: result.miniFund.totalExpense,
      miniBalance: result.miniFund.balance,
      // Số dư chuyển kỳ
      carryForward: result.carryForward,
      // Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ
      clubAssets: result.clubAssets,
      members: result.members.map((m) => ({
        memberId: m.memberId,
        memberName: m.memberName,
        attendedSessions: m.attendedSessions,
        amountPaid: m.paidAmount,
        courtCost: m.courtFee,
        livingCost: m.livingFee,
        totalCost: m.totalCost,
        balance: m.balance,
        contributionPaid: m.paidAmount > 0 && m.balance >= 0,
      })),
    };
    cache.set(id, out);
    return out;
  }

  /**
   * Chuỗi Thu/Chi N kỳ gần nhất (bar chart) — thay phép lọc mảng client ở Reports/ThuChiHub.
   * Thu = contributions ĐÃ xác nhận theo kỳ; Chi = expenses MỌI status theo kỳ (khớp client hiện tại).
   * `fundSource` 'ALL' = cả 2 quỹ. MINI có fundPeriodId=null nên không lọt vào kỳ nào (giữ nguyên).
   */
  async trends(
    clubId: string,
    type = 'chung',
    limit = 6,
    fundSource: 'ALL' | 'COMMON' | 'MINI' = 'ALL',
  ) {
    const periods = await this.prisma.fundPeriod.findMany({
      where: { clubId, type },
      orderBy: { startDate: 'asc' },
      select: { id: true, name: true, startDate: true },
    });
    const recent = periods.slice(-Math.max(1, limit));
    const ids = recent.map((p) => p.id);
    if (ids.length === 0) return [];
    const fsFilter = fundSource !== 'ALL' ? { fundSource } : {};
    const [thuGroups, chiGroups] = await Promise.all([
      this.prisma.fundContribution.groupBy({
        by: ['fundPeriodId'],
        where: {
          clubId,
          fundPeriodId: { in: ids },
          isConfirmed: true,
          ...fsFilter,
        },
        _sum: { amount: true },
      }),
      this.prisma.livingExpense.groupBy({
        by: ['fundPeriodId'],
        // CANONICAL: Chi = chỉ khoản đã duyệt/đã chi (approved/paid) — khớp financial-calculator,
        // KHÔNG gộp pending/rejected (trước đây gộp mọi status cho biểu đồ → lệch KPI).
        where: {
          clubId,
          fundPeriodId: { in: ids },
          ...fsFilter,
          status: { in: ['approved', 'paid'] },
        },
        _sum: { amount: true },
      }),
    ]);
    const thuMap = new Map(
      thuGroups.map((g) => [g.fundPeriodId, Number(g._sum.amount ?? 0)]),
    );
    const chiMap = new Map(
      chiGroups.map((g) => [g.fundPeriodId, Number(g._sum.amount ?? 0)]),
    );
    return recent.map((p) => ({
      periodId: p.id,
      name: p.name,
      startDate: p.startDate,
      thu: thuMap.get(p.id) ?? 0,
      chi: chiMap.get(p.id) ?? 0,
    }));
  }

  /**
   * Top người đóng góp + giao dịch lớn nhất của 1 kỳ (contributions ĐÃ xác nhận) —
   * thay phép group/sort mảng client ở FundPeriods HighlightsTab.
   */
  async highlights(id: string, clubId: string, limit = 5) {
    await this.findOne(id, clubId); // đảm bảo kỳ thuộc CLB
    const [topGroups, txs] = await Promise.all([
      this.prisma.fundContribution.groupBy({
        by: ['memberId'],
        where: {
          clubId,
          fundPeriodId: id,
          isConfirmed: true,
          fundSource: 'COMMON',
          memberId: { not: null },
        },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: Math.max(1, limit),
      }),
      this.prisma.fundContribution.findMany({
        where: { clubId, fundPeriodId: id, isConfirmed: true },
        orderBy: { amount: 'desc' },
        take: Math.max(1, limit),
        include: { member: { select: { fullName: true } } },
      }),
    ]);
    const memberIds = topGroups
      .map((g) => g.memberId)
      .filter((m): m is string => !!m);
    const members = memberIds.length
      ? await this.prisma.member.findMany({
          where: { clubId, id: { in: memberIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const nameMap = new Map(members.map((m) => [m.id, m.fullName]));
    return {
      topContributors: topGroups.map((g) => ({
        memberId: g.memberId,
        name: g.memberId ? (nameMap.get(g.memberId) ?? '') : '',
        total: Number(g._sum.amount ?? 0),
        count: g._count,
      })),
      topTransactions: txs.map((t) => ({
        id: t.id,
        date: t.paymentDate,
        name: t.member?.fullName ?? t.payerName ?? '',
        amount: Number(t.amount),
        fundSource: t.fundSource,
      })),
    };
  }

  /**
   * Sổ quỹ hợp nhất Thu+Chi (thay phép dựng ledger client ở TreasurerDashboard/TreasurerLedger).
   * Thu = contributions ĐÃ xác nhận; Chi = expenses MỌI status (khớp client hiện tại).
   * Không truyền fundPeriodId → toàn CLB (all-time). Có → theo kỳ. `fundSource` 'ALL' = cả 2 quỹ.
   * Running-balance do FE cộng dồn từ rows (đã sort ngày tăng dần).
   */
  async ledger(
    clubId: string,
    fundPeriodId?: string,
    fundSource: 'ALL' | 'COMMON' | 'MINI' = 'ALL',
  ) {
    const fsFilter = fundSource !== 'ALL' ? { fundSource } : {};
    const [contribs, expenses, unpaidCount, missingReceiptCount] =
      await Promise.all([
        this.prisma.fundContribution.findMany({
          where: {
            clubId,
            isConfirmed: true,
            ...(fundPeriodId ? { fundPeriodId } : {}),
            ...fsFilter,
          },
          select: {
            id: true,
            paymentDate: true,
            amount: true,
            fundSource: true,
            payerName: true,
            member: { select: { fullName: true } },
          },
        }),
        this.prisma.livingExpense.findMany({
          where: {
            clubId,
            ...(fundPeriodId ? { fundPeriodId } : {}),
            ...fsFilter,
          },
          select: {
            id: true,
            expenseDate: true,
            amount: true,
            fundSource: true,
            description: true,
          },
        }),
        // unpaidCount là khái niệm của Quỹ Chính (COMMON) → khi lọc riêng MINI thì = 0.
        fundSource === 'MINI'
          ? Promise.resolve(0)
          : this.prisma.fundContribution.count({
              where: {
                clubId,
                fundSource: 'COMMON',
                isConfirmed: false,
                ...(fundPeriodId ? { fundPeriodId } : {}),
              },
            }),
        this.prisma.livingExpense.count({
          where: {
            clubId,
            receiptUrl: null,
            ...(fundPeriodId ? { fundPeriodId } : {}),
            ...fsFilter, // thiếu hoá đơn theo đúng nguồn quỹ đang lọc
          },
        }),
      ]);

    const incomeRows = contribs.map((c) => ({
      id: c.id,
      date: c.paymentDate,
      type: 'income' as const,
      fundSource: c.fundSource,
      memberName: c.member?.fullName ?? null,
      payerName: c.payerName ?? null,
      description: null as string | null,
      amount: Number(c.amount),
    }));
    const expenseRows = expenses.map((e) => ({
      id: e.id,
      date: e.expenseDate,
      type: 'expense' as const,
      fundSource: e.fundSource,
      memberName: null,
      payerName: null,
      description: e.description,
      amount: Number(e.amount),
    }));
    const rows = [...incomeRows, ...expenseRows].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    const kpi = { commonIncome: 0, commonExpense: 0, miniIncome: 0, miniExpense: 0 };
    for (const r of incomeRows) {
      if (r.fundSource === 'MINI') kpi.miniIncome += r.amount;
      else kpi.commonIncome += r.amount;
    }
    for (const r of expenseRows) {
      if (r.fundSource === 'MINI') kpi.miniExpense += r.amount;
      else kpi.commonExpense += r.amount;
    }

    return { rows, kpi, unpaidCount, missingReceiptCount };
  }
}
