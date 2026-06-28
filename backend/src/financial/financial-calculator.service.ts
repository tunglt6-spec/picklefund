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
  // clubAssets = commonFund only; Quỹ Mini không cộng vào tài sản CLB
  clubAssets: {
    balance: number;
    totalIncome: number;
    totalExpense: number;
  };
  miniFund: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  overall: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  totalSessions: number;
  totalAttendance: number;
  costPerAttendance: number;
  members: MemberFinancialSummary[];
}

@Injectable()
export class FinancialCalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Canonical financial calculation for a fund period.
   * - Court fee = SUM(AttendanceSession.courtFee) — the per-session actual court cost
   * - Living fee = SUM(LivingExpense.amount WHERE fundSource='COMMON') — all living expenses
   * - Both allocated proportionally to attendance: (attended / totalAttendance) * total
   * - Income = confirmed contributions only
   */
  async calculate(fundPeriodId: string, clubId: string): Promise<FinancialSummary> {
    const [
      commonIncomeAgg,
      miniIncomeAgg,
      courtAgg,
      commonLivingAgg,
      miniExpenseAgg,
      sessions,
      members,
    ] = await Promise.all([
      this.prisma.fundContribution.aggregate({
        where: { fundPeriodId, clubId, fundSource: 'COMMON', isConfirmed: true },
        _sum: { amount: true },
      }),
      this.prisma.fundContribution.aggregate({
        where: { fundPeriodId, clubId, fundSource: 'MINI', isConfirmed: true },
        _sum: { amount: true },
      }),
      this.prisma.attendanceSession.aggregate({
        where: { fundPeriodId, clubId },
        _sum: { courtFee: true },
      }),
      this.prisma.livingExpense.aggregate({
        where: { fundPeriodId, clubId, fundSource: 'COMMON' },
        _sum: { amount: true },
      }),
      this.prisma.livingExpense.aggregate({
        where: { fundPeriodId, clubId, fundSource: 'MINI', status: { in: ['approved', 'paid'] } },
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
    ]);

    const totalCourt = Number(courtAgg._sum.courtFee ?? 0);
    const totalLiving = Number(commonLivingAgg._sum.amount ?? 0);
    // LivingExpense is the expense ledger (source of truth for amounts).
    // AttendanceSession.courtFee is used for proportional allocation only.
    // When court fees are recorded as LivingExpense entries (totalLiving > 0),
    // using totalCourt + totalLiving would double-count them.
    // Fallback to totalCourt only when no LivingExpense exists for the period.
    const totalCommonExpense = totalLiving > 0 ? totalLiving : totalCourt;
    const totalCommonIncome = Number(commonIncomeAgg._sum.amount ?? 0);
    const totalMiniIncome = Number(miniIncomeAgg._sum.amount ?? 0);
    const totalMiniExpense = Number(miniExpenseAgg._sum.amount ?? 0);

    const totalSessions = sessions.length;
    const totalAttendance = sessions.reduce(
      (s, sess) => s + sess._count.attendanceRecords,
      0,
    );
    const costPerAttendance =
      totalAttendance > 0 ? Math.round(totalCommonExpense / totalAttendance) : 0;

    const [attendanceCounts, paidAmounts] = await Promise.all([
      this.prisma.attendanceRecord.groupBy({
        by: ['memberId'],
        where: { status: 'PRESENT', attendanceSession: { fundPeriodId } },
        _count: { id: true },
      }),
      this.prisma.fundContribution.groupBy({
        by: ['memberId'],
        where: { fundPeriodId, clubId, fundSource: 'COMMON', isConfirmed: true },
        _sum: { amount: true },
      }),
    ]);

    const attendedMap = Object.fromEntries(
      attendanceCounts.map((r) => [r.memberId, r._count.id]),
    );
    const paidMap = Object.fromEntries(
      paidAmounts.map((r) => [r.memberId, Number(r._sum.amount ?? 0)]),
    );

    const memberSummaries: MemberFinancialSummary[] = members.map((m) => {
      const attended = attendedMap[m.id] ?? 0;
      const paidAmount = paidMap[m.id] ?? 0;
      // Allocation base matches totalCommonExpense: LivingExpense when present, sessions otherwise.
      const allocationBase = totalLiving > 0 ? totalLiving : totalCourt;
      // Court display portion is capped to allocationBase to prevent negative livingFee.
      const courtBase = Math.min(totalCourt, allocationBase);
      const memberTotalCost =
        totalAttendance > 0
          ? Math.round((attended / totalAttendance) * allocationBase)
          : 0;
      const courtFee =
        totalAttendance > 0
          ? Math.round((attended / totalAttendance) * courtBase)
          : 0;
      const livingFee = memberTotalCost - courtFee;
      const totalCost = memberTotalCost;
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

    return {
      commonFund: {
        totalIncome: totalCommonIncome,
        totalExpense: totalCommonExpense,
        totalCourt,
        totalLiving,
        balance: totalCommonIncome - totalCommonExpense,
      },
      clubAssets: {
        balance: totalCommonIncome - totalCommonExpense,
        totalIncome: totalCommonIncome,
        totalExpense: totalCommonExpense,
      },
      miniFund: {
        totalIncome: totalMiniIncome,
        totalExpense: totalMiniExpense,
        balance: totalMiniIncome - totalMiniExpense,
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
