import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MemberFinancialSummary {
  memberId: string;
  memberName: string;
  attendedSessions: number;
  totalSessions: number;
  paidAmount: number;
  courtFee: number;
  livingFee: number;
  totalCost: number;
  balance: number;
  status: 'PAID' | 'UNPAID' | 'OVERPAID' | 'BALANCED';
}

export interface FinancialSummary {
  commonFund: {
    totalIncome: number;
    totalExpense: number;
    totalCourt: number;
    totalLiving: number;
    balance: number;
  };
  miniFund: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  // carryForward = số dư từ kỳ trước (Quỹ Chính); injected by caller
  carryForward: {
    balance: number;
    previousPeriodId: string | null;
    previousPeriodName: string | null;
    source: string;
  };
  // clubAssets = Quỹ Chính + Số dư chuyển kỳ; KHÔNG cộng Quỹ Phụ
  clubAssets: {
    balance: number;
    totalIncome: number;
    totalExpense: number;
    formula: string;
  };
  overall: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  totalSessions: number;
  totalAttendance: number;
  costPerAttendance: number;
  /** Sĩ số dùng để chia phí sân/người (billedMemberCount đã chốt, hoặc số live nếu null). */
  memberCount: number;
  members: MemberFinancialSummary[];
}

export interface CalculateOptions {
  carryForwardBalance?: number;
  previousPeriodId?: string | null;
  previousPeriodName?: string | null;
}

@Injectable()
export class FinancialCalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Xóa cache số dư cuối kỳ của TẤT CẢ kỳ trong CLB (đặt closingBalance=null). Gọi sau MỌI thay
   * đổi thu/chi (create/update/delete/confirm/status) để summary() không dùng số dư cũ. An toàn
   * over-invalidate (chỉ mất cache, summary tự tính lại đúng). Best-effort, không chặn nghiệp vụ.
   */
  async invalidateClosingBalances(clubId: string): Promise<void> {
    try {
      await this.prisma.fundPeriod.updateMany({
        where: { clubId, closingBalance: { not: null } },
        data: { closingBalance: null },
      });
    } catch {
      /* cache invalidation không được làm hỏng giao dịch chính */
    }
  }

  /**
   * Canonical financial calculation for a fund period.
   * LOẠI CHI theo LivingExpense.costType (luật Quỹ — tách khỏi CÁCH CHIA allocationRule);
   * KHÔNG dùng AttendanceSession.courtFee (chỉ là reference).
   * - CHI PHÍ SÂN  = SUM(COMMON WHERE costType='COURT') → LUÔN chia đều /memberCount (luật Quỹ).
   * - SINH HOẠT    = SUM(COMMON WHERE costType='LIVING', rule != FUND_ONLY), phân bổ theo TỪNG khoản:
   *     + rule EQUAL                     → chia đều /memberCount.
   *     + rule PRESENT_ONLY | ATTENDANCE → chia theo attendance: (attended/totalAttendance) * tổng.
   * - FUND_ONLY    = quỹ-only: tính vào tổng chi Common Fund, KHÔNG phân bổ vào bill thành viên.
   * - totalExpense (Common) = court + living + fundOnly.
   * - Income = confirmed contributions only.
   * - carryForward is injected by the caller (fund-periods.service looks up previous period).
   * - clubAssets.balance = commonFund.balance + carryForward.balance (KHÔNG cộng Quỹ Phụ).
   */
  async calculate(
    fundPeriodId: string,
    clubId: string,
    opts?: CalculateOptions,
  ): Promise<FinancialSummary> {
    const carryForwardBalance = opts?.carryForwardBalance ?? 0;
    const previousPeriodId = opts?.previousPeriodId ?? null;
    const previousPeriodName = opts?.previousPeriodName ?? null;

    const [
      commonIncomeAgg,
      miniIncomeAgg,
      commonExpenseByRule,
      miniExpenseAgg,
      sessions,
      members,
      period,
    ] = await Promise.all([
      this.prisma.fundContribution.aggregate({
        where: {
          fundPeriodId,
          clubId,
          fundSource: 'COMMON',
          isConfirmed: true,
        },
        _sum: { amount: true },
      }),
      // Quỹ Phụ ĐỘC LẬP KỲ: khoản thu MINI không gắn fundPeriodId (form không chọn
      // kỳ; service chỉ bắt buộc fundPeriodId cho COMMON). Vì vậy tính theo clubId
      // toàn CLB, KHÔNG lọc fundPeriodId — nếu lọc sẽ luôn ra 0 (MINI có periodId=null).
      // Khớp với contributions.service.getSummary + nhãn "Độc lập Quỹ Chính" trên báo cáo.
      this.prisma.fundContribution.aggregate({
        where: { clubId, fundSource: 'MINI', isConfirmed: true },
        _sum: { amount: true },
      }),
      // Common Fund expenses phân loại theo costType (LOẠI CHI) × allocationRule (CÁCH CHIA).
      // KHÔNG dùng AttendanceSession.courtFee — session.courtFee chỉ là reference.
      // status filter approved/paid: nhất quán với Mini Fund + workflow duyệt chi trên UI
      // (Expenses.tsx có approve/reject) — chi pending/rejected KHÔNG được tính vào quỹ.
      this.prisma.livingExpense.groupBy({
        by: ['costType', 'allocationRule'],
        where: {
          fundPeriodId,
          clubId,
          fundSource: 'COMMON',
          status: { in: ['approved', 'paid'] },
        },
        _sum: { amount: true },
      }),
      // Chi Quỹ Phụ cũng độc lập kỳ (không gắn fundPeriodId) — tính theo clubId toàn CLB
      // để cân xứng với thu MINI ở trên.
      this.prisma.livingExpense.aggregate({
        where: {
          clubId,
          fundSource: 'MINI',
          status: { in: ['approved', 'paid'] },
        },
        _sum: { amount: true },
      }),
      this.prisma.attendanceSession.findMany({
        where: { fundPeriodId, clubId },
        select: {
          id: true,
          _count: {
            select: { attendanceRecords: { where: { status: 'PRESENT' } } },
          },
        },
      }),
      this.prisma.member.findMany({ where: { clubId, isDeleted: false } }),
      // Sĩ số tính phí đã chốt của kỳ (null ⇒ dùng số member live bên dưới).
      this.prisma.fundPeriod.findUnique({
        where: { id: fundPeriodId },
        select: { billedMemberCount: true },
      }),
    ]);

    // Phân loại chi phí Common Fund theo LOẠI CHI (costType) × CÁCH CHIA (allocationRule):
    //  - CHI PHÍ SÂN (COURT)     → LUÔN chia đều /memberCount (luật Quỹ)
    //  - SINH HOẠT (LIVING):
    //      + EQUAL                    → chia đều /memberCount
    //      + PRESENT_ONLY|ATTENDANCE  → chia theo attendance
    //  - FUND_ONLY = quỹ-only, KHÔNG phân bổ vào bill thành viên; vẫn tính tổng chi quỹ
    type ExpGroup = { costType: string; allocationRule: string; _sum: { amount: unknown } };
    const groups = commonExpenseByRule as unknown as ExpGroup[];
    const sumWhere = (pred: (r: ExpGroup) => boolean) =>
      groups.filter(pred).reduce((s, r) => s + Number(r._sum.amount ?? 0), 0);
    const totalCourt = sumWhere(
      (r) => r.costType === 'COURT' && r.allocationRule !== 'FUND_ONLY',
    );
    const livingEqual = sumWhere(
      (r) => r.costType === 'LIVING' && r.allocationRule === 'EQUAL',
    );
    const livingByAttendance = sumWhere(
      (r) =>
        r.costType === 'LIVING' &&
        (r.allocationRule === 'PRESENT_ONLY' || r.allocationRule === 'ATTENDANCE'),
    );
    const totalLiving = livingEqual + livingByAttendance;
    const fundOnlyExpense = sumWhere((r) => r.allocationRule === 'FUND_ONLY');
    const totalCommonExpense = totalCourt + totalLiving + fundOnlyExpense;
    const totalCommonIncome = Number(commonIncomeAgg._sum.amount ?? 0);
    const totalMiniIncome = Number(miniIncomeAgg._sum.amount ?? 0);
    const totalMiniExpense = Number(miniExpenseAgg._sum.amount ?? 0);

    const totalSessions = sessions.length;
    const totalAttendance = sessions.reduce(
      (s, sess) => s + sess._count.attendanceRecords,
      0,
    );
    const costPerAttendance =
      totalAttendance > 0
        ? Math.round(totalCommonExpense / totalAttendance)
        : 0;

    const [attendanceCounts, paidAmounts] = await Promise.all([
      this.prisma.attendanceRecord.groupBy({
        by: ['memberId'],
        where: { status: 'PRESENT', clubId, attendanceSession: { fundPeriodId } },
        _count: { id: true },
      }),
      this.prisma.fundContribution.groupBy({
        by: ['memberId'],
        where: {
          fundPeriodId,
          clubId,
          fundSource: 'COMMON',
          isConfirmed: true,
        },
        _sum: { amount: true },
      }),
    ]);

    const attendedMap: Record<string, number> = Object.fromEntries(
      attendanceCounts.map(
        (r) => [r.memberId, r._count.id] as [string, number],
      ),
    );
    const paidMap: Record<string, number> = Object.fromEntries(
      paidAmounts.map(
        (r) => [r.memberId, Number(r._sum.amount ?? 0)] as [string, number],
      ),
    );

    // Sĩ số chia phí = billedMemberCount ĐÃ CHỐT của kỳ (nếu có), nếu không thì số member
    // live. ⇒ kỳ đã chốt: xóa/thêm member KHÔNG đổi phần chia người còn lại (đối soát ổn định).
    // DANH SÁCH bill vẫn lặp theo member live (isDeleted:false) → TV đã xóa tự ẩn khỏi bill.
    const memberCount = period?.billedMemberCount ?? members.length;
    const memberSummaries: MemberFinancialSummary[] = members.map((m) => {
      const attended = attendedMap[m.id] ?? 0;
      const paidAmount = paidMap[m.id] ?? 0;
      // CHI PHÍ SÂN (COURT): LUÔN chia đều cho mọi thành viên theo memberCount (luật Quỹ).
      const courtFee =
        memberCount > 0 ? Math.round(totalCourt / memberCount) : 0;
      // SINH HOẠT (LIVING): phần chia đều + phần theo số buổi tham dự (tùy từng khoản).
      const livingFee =
        (memberCount > 0 ? Math.round(livingEqual / memberCount) : 0) +
        (totalAttendance > 0
          ? Math.round((attended / totalAttendance) * livingByAttendance)
          : 0);
      // FUND_ONLY KHÔNG phân bổ vào bill thành viên.
      const totalCost = courtFee + livingFee;
      const balance = paidAmount - totalCost;

      let status: MemberFinancialSummary['status'];
      if (balance > 100) status = 'OVERPAID';
      else if (balance < -100) status = 'UNPAID';
      else if (paidAmount > 0) status = 'PAID';
      else status = 'UNPAID';

      return {
        memberId: m.id,
        memberName: m.fullName,
        attendedSessions: attended,
        totalSessions,
        paidAmount,
        courtFee,
        livingFee,
        totalCost,
        balance,
        status,
      };
    });

    const commonBalance = totalCommonIncome - totalCommonExpense;

    return {
      memberCount,
      commonFund: {
        totalIncome: totalCommonIncome,
        totalExpense: totalCommonExpense,
        totalCourt,
        totalLiving,
        balance: commonBalance,
      },
      miniFund: {
        totalIncome: totalMiniIncome,
        totalExpense: totalMiniExpense,
        balance: totalMiniIncome - totalMiniExpense,
      },
      carryForward: {
        balance: carryForwardBalance,
        previousPeriodId,
        previousPeriodName,
        source: previousPeriodId ? 'previous_period' : 'none',
      },
      // Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ; KHÔNG cộng Quỹ Phụ
      clubAssets: {
        balance: commonBalance + carryForwardBalance,
        totalIncome: totalCommonIncome,
        totalExpense: totalCommonExpense,
        formula: 'commonFund.balance + carryForward.balance',
      },
      overall: {
        totalIncome: totalCommonIncome + totalMiniIncome,
        totalExpense: totalCommonExpense + totalMiniExpense,
        balance:
          totalCommonIncome -
          totalCommonExpense +
          (totalMiniIncome - totalMiniExpense),
      },
      totalSessions,
      totalAttendance,
      costPerAttendance,
      members: memberSummaries,
    };
  }
}
