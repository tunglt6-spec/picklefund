import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'
import type { FundSource, MiniIncomeType } from '@prisma/client'

export interface CreateContributionDto {
  fundSource: FundSource
  // COMMON fields
  memberId?: string
  fundPeriodId?: string
  // MINI fields
  miniIncomeType?: MiniIncomeType
  payerName?: string
  relatedMinigameId?: string
  // shared
  amount: number
  paidAt: string
  paymentMethod?: string
  notes?: string
}

@Injectable()
export class ContributionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(clubId: string, fundPeriodId?: string, fundSource?: FundSource) {
    return this.prisma.fundContribution.findMany({
      where: {
        clubId,
        ...(fundPeriodId ? { fundPeriodId } : {}),
        ...(fundSource ? { fundSource } : {}),
      },
      orderBy: { paymentDate: 'desc' },
      include: { member: { select: { id: true, fullName: true } } },
    })
  }

  async findOne(id: string, clubId: string) {
    const c = await this.prisma.fundContribution.findFirst({ where: { id, clubId } })
    if (!c) throw new NotFoundException('Khoản đóng quỹ không tồn tại')
    return c
  }

  async create(clubId: string, userId: string, dto: CreateContributionDto) {
    const fundSource: FundSource = dto.fundSource ?? 'COMMON'

    if (fundSource === 'COMMON') {
      if (!dto.memberId) throw new BadRequestException('memberId bắt buộc cho Quỹ Chung')
      if (!dto.fundPeriodId) throw new BadRequestException('fundPeriodId bắt buộc cho Quỹ Chung')
    }

    if (fundSource === 'MINI') {
      if (!dto.miniIncomeType) throw new BadRequestException('miniIncomeType bắt buộc cho Quỹ Mini')
    }

    return this.prisma.fundContribution.create({
      data: {
        clubId,
        createdById: userId,
        fundSource,
        amount: new Decimal(dto.amount),
        paymentDate: new Date(dto.paidAt),
        paymentMethod: dto.paymentMethod ?? 'bank_transfer',
        isConfirmed: false,
        notes: dto.notes,
        // COMMON
        ...(dto.memberId ? { memberId: dto.memberId } : {}),
        ...(dto.fundPeriodId ? { fundPeriodId: dto.fundPeriodId } : {}),
        // MINI
        ...(dto.miniIncomeType ? { miniIncomeType: dto.miniIncomeType } : {}),
        ...(dto.payerName ? { payerName: dto.payerName } : {}),
        ...(dto.relatedMinigameId ? { relatedMinigameId: dto.relatedMinigameId } : {}),
      },
    })
  }

  async update(id: string, clubId: string, dto: Partial<CreateContributionDto>) {
    await this.findOne(id, clubId)
    return this.prisma.fundContribution.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined ? { amount: new Decimal(dto.amount) } : {}),
        ...(dto.paidAt ? { paymentDate: new Date(dto.paidAt) } : {}),
        ...(dto.paymentMethod ? { paymentMethod: dto.paymentMethod } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.memberId !== undefined ? { memberId: dto.memberId } : {}),
        ...(dto.fundPeriodId !== undefined ? { fundPeriodId: dto.fundPeriodId } : {}),
        ...(dto.miniIncomeType !== undefined ? { miniIncomeType: dto.miniIncomeType } : {}),
        ...(dto.payerName !== undefined ? { payerName: dto.payerName } : {}),
        ...(dto.relatedMinigameId !== undefined ? { relatedMinigameId: dto.relatedMinigameId } : {}),
      },
    })
  }

  async delete(id: string, clubId: string) {
    await this.findOne(id, clubId)
    return this.prisma.fundContribution.delete({ where: { id } })
  }

  async toggleConfirm(id: string, clubId: string) {
    const c = await this.findOne(id, clubId)
    return this.prisma.fundContribution.update({ where: { id }, data: { isConfirmed: !c.isConfirmed } })
  }

  async summary(clubId: string, fundPeriodId?: string) {
    const [commonConfirmed, commonUnconfirmed, miniTotal] = await Promise.all([
      this.prisma.fundContribution.aggregate({
        where: { clubId, ...(fundPeriodId ? { fundPeriodId } : {}), fundSource: 'COMMON', isConfirmed: true },
        _sum: { amount: true }, _count: true,
      }),
      this.prisma.fundContribution.aggregate({
        where: { clubId, ...(fundPeriodId ? { fundPeriodId } : {}), fundSource: 'COMMON', isConfirmed: false },
        _sum: { amount: true }, _count: true,
      }),
      this.prisma.fundContribution.aggregate({
        where: { clubId, fundSource: 'MINI' },
        _sum: { amount: true }, _count: true,
      }),
    ])

    const miniByType = await this.prisma.fundContribution.groupBy({
      by: ['miniIncomeType'],
      where: { clubId, fundSource: 'MINI' },
      _sum: { amount: true },
    })

    return {
      common: {
        confirmedTotal: Number(commonConfirmed._sum.amount ?? 0),
        confirmedCount: commonConfirmed._count,
        unconfirmedTotal: Number(commonUnconfirmed._sum.amount ?? 0),
        unconfirmedCount: commonUnconfirmed._count,
        grandTotal: Number(commonConfirmed._sum.amount ?? 0) + Number(commonUnconfirmed._sum.amount ?? 0),
      },
      mini: {
        total: Number(miniTotal._sum.amount ?? 0),
        count: miniTotal._count,
        byType: Object.fromEntries(miniByType.map(r => [r.miniIncomeType ?? 'OTHER', Number(r._sum.amount ?? 0)])),
      },
    }
  }
}
