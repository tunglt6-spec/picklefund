import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'

@Injectable()
export class PersonalReceiptsService {
  constructor(private prisma: PrismaService) {}

  async findByMember(memberId: string, clubId: string) {
    return this.prisma.personalReceipt.findMany({
      where: { memberId, clubId },
      include: { fundPeriod: true },
      orderBy: { snapshotAt: 'desc' },
    })
  }

  async findByPeriod(fundPeriodId: string, clubId: string) {
    return this.prisma.personalReceipt.findMany({
      where: { fundPeriodId, clubId },
      include: { member: { select: { fullName: true } } },
    })
  }

  async findMine(memberId: string, clubId: string) {
    return this.prisma.personalReceipt.findMany({
      where: { memberId, clubId },
      include: { fundPeriod: true },
      orderBy: { snapshotAt: 'desc' },
    })
  }

  // Compute and snapshot all member receipts for a fund period
  async generateForPeriod(fundPeriodId: string, clubId: string) {
    const [contributions, sessions, members] = await Promise.all([
      this.prisma.fundContribution.groupBy({ by: ['memberId'], where: { fundPeriodId, clubId, isConfirmed: true }, _sum: { amount: true } }),
      this.prisma.attendanceSession.findMany({ where: { fundPeriodId, clubId }, include: { _count: { select: { attendanceRecords: { where: { status: 'PRESENT' } } } } } }),
      this.prisma.member.findMany({ where: { clubId, isDeleted: false } }),
    ])

    const [courtAgg, livingAgg] = await Promise.all([
      this.prisma.attendanceSession.aggregate({ where: { fundPeriodId, clubId }, _sum: { courtFee: true } }),
      this.prisma.livingExpense.aggregate({ where: { fundPeriodId, clubId, fundSource: 'COMMON' }, _sum: { amount: true } }),
    ])

    const totalCourt = Number(courtAgg._sum.courtFee ?? 0)
    const totalLiving = Number(livingAgg._sum.amount ?? 0)
    const totalAttendance = sessions.reduce((s, sess) => s + sess._count.attendanceRecords, 0)

    const paidMap = Object.fromEntries(contributions.map((c) => [c.memberId, Number(c._sum.amount ?? 0)]))

    // Batch: one groupBy instead of N individual count queries
    const attendanceCounts = await this.prisma.attendanceRecord.groupBy({
      by: ['memberId'],
      where: { status: 'PRESENT', attendanceSession: { fundPeriodId } },
      _count: { id: true },
    })
    const attendedMap = Object.fromEntries(attendanceCounts.map((r) => [r.memberId, r._count.id]))

    const receipts = await Promise.all(
      members.map(async (m) => {
        const attended = attendedMap[m.id] ?? 0
        const amountPaid = paidMap[m.id] ?? 0
        const courtCost = totalAttendance > 0 ? Math.round((attended / totalAttendance) * totalCourt) : 0
        const livingCost = totalAttendance > 0 ? Math.round((attended / totalAttendance) * totalLiving) : 0
        const totalCost = courtCost + livingCost
        const balance = amountPaid - totalCost

        const attendanceRate = sessions.length > 0 ? new Decimal(attended / sessions.length).toDecimalPlaces(2) : new Decimal(0)
        const needToPay = balance < 0 ? new Decimal(Math.abs(balance)) : new Decimal(0)

        return this.prisma.personalReceipt.upsert({
          where: { fundPeriodId_memberId: { fundPeriodId, memberId: m.id } },
          create: {
            fundPeriodId, memberId: m.id, clubId,
            attendedSessions: attended,
            totalSessions: sessions.length,
            attendanceRate,
            amountPaid: new Decimal(amountPaid),
            courtCost: new Decimal(courtCost),
            livingCost: new Decimal(livingCost),
            totalCost: new Decimal(totalCost),
            balance: new Decimal(balance),
            needToPay,
          },
          update: {
            attendedSessions: attended,
            totalSessions: sessions.length,
            attendanceRate,
            amountPaid: new Decimal(amountPaid),
            courtCost: new Decimal(courtCost),
            livingCost: new Decimal(livingCost),
            totalCost: new Decimal(totalCost),
            balance: new Decimal(balance),
            needToPay,
          },
        })
      }),
    )

    return receipts
  }
}
