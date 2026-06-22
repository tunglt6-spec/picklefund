import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

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
    })
  }

  async getClubSummary(clubId: string) {
    const [club, members, activePeriod, recentSessions] = await Promise.all([
      this.prisma.club.findUnique({
        where: { id: clubId },
        select: { id: true, name: true, code: true, contactEmail: true, contactPhone: true },
      }),
      this.prisma.member.findMany({
        where: { clubId, status: 'active', isDeleted: false },
        select: { id: true, fullName: true, phone: true, status: true, joinDate: true },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.fundPeriod.findFirst({
        where: { clubId, status: 'active' },
        include: {
          contributions: {
            select: { memberId: true, amount: true, isConfirmed: true, fundSource: true },
          },
          expenses: {
            where: { status: 'approved' },
            select: { description: true, amount: true, allocationRule: true, expenseDate: true },
          },
          _count: { select: { attendanceSessions: true } },
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
    ])

    const totalContributed = activePeriod?.contributions
      .filter(c => c.isConfirmed && c.fundSource === 'COMMON')
      .reduce((s, c) => s + Number(c.amount), 0) ?? 0

    const totalExpenses = activePeriod?.expenses
      .reduce((s, e) => s + Number(e.amount), 0) ?? 0

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
            totalContributed,
            totalExpenses,
            balance: totalContributed - totalExpenses,
            contributions: activePeriod.contributions,
            expenses: activePeriod.expenses,
          }
        : null,
      recentSessions: recentSessions.map(s => ({
        id: s.id,
        sessionDate: s.sessionDate,
        courtName: s.courtName,
        courtFee: s.courtFee,
        status: s.status,
        attendeeCount: s.attendanceRecords.filter(r => r.status === 'PRESENT').length,
      })),
    }
  }

  async getMembers(clubId: string) {
    return this.prisma.member.findMany({
      where: { clubId, isDeleted: false },
      select: {
        id: true, fullName: true, phone: true, email: true,
        status: true, joinDate: true, notes: true,
      },
      orderBy: { fullName: 'asc' },
    })
  }

  async getFundPeriods(clubId: string) {
    return this.prisma.fundPeriod.findMany({
      where: { clubId },
      include: {
        _count: { select: { contributions: true, expenses: true, attendanceSessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getContributions(clubId: string, fundPeriodId?: string) {
    return this.prisma.fundContribution.findMany({
      where: { clubId, ...(fundPeriodId ? { fundPeriodId } : {}) },
      include: { member: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getExpenses(clubId: string, fundPeriodId?: string) {
    return this.prisma.livingExpense.findMany({
      where: { clubId, ...(fundPeriodId ? { fundPeriodId } : {}) },
      orderBy: { expenseDate: 'desc' },
    })
  }

  async getSessions(clubId: string) {
    return this.prisma.attendanceSession.findMany({
      where: { clubId },
      include: {
        _count: { select: { attendanceRecords: true } },
      },
      orderBy: { sessionDate: 'desc' },
    })
  }

  async health() {
    const count = await this.prisma.club.count()
    return { ok: true, clubs: count }
  }
}
