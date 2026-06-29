import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FundPeriodsService } from '../fund-periods/fund-periods.service';
import { FinanceSummaryDTO } from './dto/finance-summary.dto';

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    // Finance Engine RC1 — single source of truth. AI READS, never computes.
    private readonly fundPeriods: FundPeriodsService,
  ) {}

  async listClubs() {
    return this.prisma.club.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        name: true,
        code: true,
        contactEmail: true,
        contactPhone: true,
        createdAt: true,
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getClubSummary(clubId: string) {
    const [club, members, activePeriod, recentSessions] = await Promise.all([
      this.prisma.club.findUnique({
        where: { id: clubId },
        select: {
          id: true,
          name: true,
          code: true,
          contactEmail: true,
          contactPhone: true,
        },
      }),
      this.prisma.member.findMany({
        where: { clubId, status: 'active', isDeleted: false },
        select: {
          id: true,
          fullName: true,
          phone: true,
          status: true,
          joinDate: true,
        },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.fundPeriod.findFirst({
        where: { clubId, status: 'active' },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          contributionAmount: true,
          totalSessions: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.attendanceSession.findMany({
        where: { clubId },
        include: {
          attendanceRecords: { select: { memberId: true, status: true } },
        },
        orderBy: { sessionDate: 'desc' },
        take: 5,
      }),
    ]);

    // Finance Isolation: all financial figures come from the Finance Engine RC1.
    // The AI layer does NOT sum contributions/expenses or compute balance.
    const financeSummary = activePeriod
      ? await this.getFinanceSummary(activePeriod.id, clubId)
      : null;

    return {
      club,
      members,
      activeFundPeriod: activePeriod
        ? {
            id: activePeriod.id,
            name: activePeriod.name,
            startDate: activePeriod.startDate,
            endDate: activePeriod.endDate,
            contributionAmount: activePeriod.contributionAmount,
            totalSessions: activePeriod.totalSessions,
            status: activePeriod.status,
            // Read-only figures sourced from Finance Engine RC1:
            finance: financeSummary,
          }
        : null,
      recentSessions: recentSessions.map((s) => ({
        id: s.id,
        sessionDate: s.sessionDate,
        courtName: s.courtName,
        courtFee: s.courtFee,
        status: s.status,
        attendeeCount: s.attendanceRecords.filter((r) => r.status === 'PRESENT')
          .length,
      })),
    };
  }

  /**
   * Read the canonical financial summary for a fund period from the Finance
   * Engine RC1. This is the ONLY way the AI layer obtains financial figures —
   * it never recomputes income/expense/balance itself.
   */
  async getFinanceSummary(
    fundPeriodId: string,
    clubId: string,
  ): Promise<FinanceSummaryDTO> {
    const s = await this.fundPeriods.summary(fundPeriodId, clubId);
    return {
      fundPeriodId,
      totalIncome: s.totalIncome,
      totalExpenses: s.totalExpenses,
      balance: s.balance,
      courtExpenses: s.courtExpenses,
      livingExpenses: s.livingExpenses,
      totalAttendance: s.totalAttendance,
      costPerAttendance: s.costPerAttendance,
      miniIncome: s.miniIncome,
      miniExpense: s.miniExpense,
      miniBalance: s.miniBalance,
      carryForward: s.carryForward,
      clubAssets: s.clubAssets,
      unpaidCount: s.unpaidCount,
      negativeBalanceCount: s.negativeBalanceCount,
      lowAttendanceCount: s.lowAttendanceCount,
      members: s.members,
    };
  }

  async getMembers(clubId: string) {
    return this.prisma.member.findMany({
      where: { clubId, isDeleted: false },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        status: true,
        joinDate: true,
        notes: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async getFundPeriods(clubId: string) {
    return this.prisma.fundPeriod.findMany({
      where: { clubId },
      include: {
        _count: {
          select: {
            contributions: true,
            expenses: true,
            attendanceSessions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getContributions(clubId: string, fundPeriodId?: string) {
    return this.prisma.fundContribution.findMany({
      where: { clubId, ...(fundPeriodId ? { fundPeriodId } : {}) },
      include: { member: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getExpenses(clubId: string, fundPeriodId?: string) {
    return this.prisma.livingExpense.findMany({
      where: { clubId, ...(fundPeriodId ? { fundPeriodId } : {}) },
      orderBy: { expenseDate: 'desc' },
    });
  }

  async getSessions(clubId: string) {
    return this.prisma.attendanceSession.findMany({
      where: { clubId },
      include: {
        _count: { select: { attendanceRecords: true } },
      },
      orderBy: { sessionDate: 'desc' },
    });
  }

  async health() {
    const count = await this.prisma.club.count();
    return { ok: true, clubs: count };
  }
}
