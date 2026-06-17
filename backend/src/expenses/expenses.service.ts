import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'
import type { AllocationRule, FundSource, MiniExpenseType } from '@prisma/client'

export interface CreateExpenseDto {
  fundSource: FundSource
  // COMMON fields
  fundPeriodId?: string
  attendanceSessionId?: string
  allocationRule?: AllocationRule
  categoryId?: string
  // MINI fields
  miniExpenseType?: MiniExpenseType
  receiverName?: string
  relatedMinigameId?: string
  // shared
  description: string
  amount: number
  expenseDate?: string
  receiptUrl?: string
}

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(clubId: string, fundPeriodId?: string, fundSource?: FundSource) {
    return this.prisma.livingExpense.findMany({
      where: {
        clubId,
        ...(fundPeriodId ? { fundPeriodId } : {}),
        ...(fundSource ? { fundSource } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string, clubId: string) {
    const e = await this.prisma.livingExpense.findFirst({ where: { id, clubId } })
    if (!e) throw new NotFoundException('Chi phí không tồn tại')
    return e
  }

  async create(clubId: string, userId: string, dto: CreateExpenseDto) {
    const fundSource: FundSource = dto.fundSource ?? 'COMMON'

    if (fundSource === 'COMMON') {
      if (!dto.fundPeriodId) throw new BadRequestException('fundPeriodId bắt buộc cho Quỹ Chung')
      if (!dto.allocationRule) throw new BadRequestException('allocationRule bắt buộc cho Quỹ Chung')
    }

    if (fundSource === 'MINI') {
      if (!dto.miniExpenseType) throw new BadRequestException('miniExpenseType bắt buộc cho Quỹ Mini')
    }

    return this.prisma.livingExpense.create({
      data: {
        clubId,
        createdById: userId,
        fundSource,
        // MINI forces allocationEnabled=false, allocationRule=FUND_ONLY
        allocationEnabled: fundSource === 'MINI' ? false : true,
        allocationRule: fundSource === 'MINI' ? 'FUND_ONLY' : (dto.allocationRule ?? 'FUND_ONLY'),
        description: dto.description,
        amount: new Decimal(dto.amount),
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
        receiptUrl: dto.receiptUrl,
        // COMMON
        ...(dto.fundPeriodId ? { fundPeriodId: dto.fundPeriodId } : {}),
        ...(dto.attendanceSessionId ? { attendanceSessionId: dto.attendanceSessionId } : {}),
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        // MINI
        ...(dto.miniExpenseType ? { miniExpenseType: dto.miniExpenseType } : {}),
        ...(dto.receiverName ? { receiverName: dto.receiverName } : {}),
        ...(dto.relatedMinigameId ? { relatedMinigameId: dto.relatedMinigameId } : {}),
      },
    })
  }

  async update(id: string, clubId: string, dto: any) {
    const existing = await this.findOne(id, clubId)
    const fundSource = dto.fundSource ?? existing.fundSource
    return this.prisma.livingExpense.update({
      where: { id },
      data: {
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.amount !== undefined ? { amount: new Decimal(dto.amount) } : {}),
        ...(dto.expenseDate ? { expenseDate: new Date(dto.expenseDate) } : {}),
        ...(dto.receiptUrl !== undefined ? { receiptUrl: dto.receiptUrl } : {}),
        ...(dto.fundPeriodId !== undefined ? { fundPeriodId: dto.fundPeriodId } : {}),
        ...(dto.attendanceSessionId !== undefined ? { attendanceSessionId: dto.attendanceSessionId } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.allocationRule && fundSource === 'COMMON' ? { allocationRule: dto.allocationRule } : {}),
        ...(dto.miniExpenseType !== undefined ? { miniExpenseType: dto.miniExpenseType } : {}),
        ...(dto.receiverName !== undefined ? { receiverName: dto.receiverName } : {}),
        ...(dto.relatedMinigameId !== undefined ? { relatedMinigameId: dto.relatedMinigameId } : {}),
        allocationEnabled: fundSource === 'MINI' ? false : (dto.allocationEnabled ?? existing.allocationEnabled),
      },
    })
  }

  async delete(id: string, clubId: string) {
    await this.findOne(id, clubId)
    return this.prisma.livingExpense.delete({ where: { id } })
  }

  async summary(clubId: string, fundPeriodId?: string) {
    const commonRules: AllocationRule[] = ['ATTENDANCE', 'EQUAL', 'PRESENT_ONLY', 'FUND_ONLY']
    const [commonResults, miniTotal, miniByType] = await Promise.all([
      Promise.all(
        commonRules.map((rule) =>
          this.prisma.livingExpense.aggregate({
            where: { clubId, ...(fundPeriodId ? { fundPeriodId } : {}), fundSource: 'COMMON', allocationRule: rule },
            _sum: { amount: true }, _count: true,
          }),
        ),
      ),
      this.prisma.livingExpense.aggregate({
        where: { clubId, fundSource: 'MINI' },
        _sum: { amount: true }, _count: true,
      }),
      this.prisma.livingExpense.groupBy({
        by: ['miniExpenseType'],
        where: { clubId, fundSource: 'MINI' },
        _sum: { amount: true },
      }),
    ])

    return {
      common: Object.fromEntries(
        commonRules.map((rule, i) => [rule, { total: Number(commonResults[i]._sum.amount ?? 0), count: commonResults[i]._count }]),
      ),
      mini: {
        total: Number(miniTotal._sum.amount ?? 0),
        count: miniTotal._count,
        byType: Object.fromEntries(miniByType.map(r => [r.miniExpenseType ?? 'OTHER', Number(r._sum.amount ?? 0)])),
      },
    }
  }
}
