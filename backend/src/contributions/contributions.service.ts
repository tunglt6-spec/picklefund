import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'

@Injectable()
export class ContributionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(clubId: string, fundPeriodId?: string) {
    return this.prisma.fundContribution.findMany({
      where: { clubId, ...(fundPeriodId ? { fundPeriodId } : {}) },
      orderBy: { paymentDate: 'desc' },
      include: { member: { select: { fullName: true } } },
    })
  }

  async findOne(id: string, clubId: string) {
    const c = await this.prisma.fundContribution.findFirst({ where: { id, clubId } })
    if (!c) throw new NotFoundException('Khoản đóng quỹ không tồn tại')
    return c
  }

  async create(clubId: string, userId: string, dto: { memberId: string; fundPeriodId: string; amount: number; paidAt: string; notes?: string }) {
    return this.prisma.fundContribution.create({
      data: {
        ...dto,
        clubId,
        createdById: userId,
        amount: new Decimal(dto.amount),
        paymentDate: new Date(dto.paidAt),
        isConfirmed: false,
      },
    })
  }

  async toggleConfirm(id: string, clubId: string) {
    const c = await this.findOne(id, clubId)
    return this.prisma.fundContribution.update({ where: { id }, data: { isConfirmed: !c.isConfirmed } })
  }

  async summary(clubId: string, fundPeriodId: string) {
    const [confirmed, unconfirmed] = await Promise.all([
      this.prisma.fundContribution.aggregate({ where: { clubId, fundPeriodId, isConfirmed: true }, _sum: { amount: true }, _count: true }),
      this.prisma.fundContribution.aggregate({ where: { clubId, fundPeriodId, isConfirmed: false }, _sum: { amount: true }, _count: true }),
    ])
    return {
      confirmedTotal: Number(confirmed._sum.amount ?? 0),
      confirmedCount: confirmed._count,
      unconfirmedTotal: Number(unconfirmed._sum.amount ?? 0),
      unconfirmedCount: unconfirmed._count,
      grandTotal: Number(confirmed._sum.amount ?? 0) + Number(unconfirmed._sum.amount ?? 0),
    }
  }
}
