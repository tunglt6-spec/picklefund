import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'
import type { AllocationRule } from '@prisma/client'

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(clubId: string, fundPeriodId?: string) {
    return this.prisma.livingExpense.findMany({
      where: { clubId, ...(fundPeriodId ? { fundPeriodId } : {}) },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string, clubId: string) {
    const e = await this.prisma.livingExpense.findFirst({ where: { id, clubId } })
    if (!e) throw new NotFoundException('Chi phí không tồn tại')
    return e
  }

  async create(clubId: string, userId: string, dto: { fundPeriodId: string; description: string; amount: number; allocationRule: AllocationRule; attendanceSessionId?: string; receiptUrl?: string; expenseDate?: string }) {
    return this.prisma.livingExpense.create({
      data: {
        fundPeriodId: dto.fundPeriodId,
        description: dto.description,
        allocationRule: dto.allocationRule,
        attendanceSessionId: dto.attendanceSessionId,
        receiptUrl: dto.receiptUrl,
        clubId,
        createdById: userId,
        amount: new Decimal(dto.amount),
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
      },
    })
  }

  async update(id: string, clubId: string, dto: any) {
    await this.findOne(id, clubId)
    return this.prisma.livingExpense.update({
      where: { id },
      data: { ...dto, ...(dto.amount !== undefined ? { amount: new Decimal(dto.amount) } : {}) },
    })
  }

  async summary(clubId: string, fundPeriodId: string) {
    const rules: AllocationRule[] = ['ATTENDANCE', 'EQUAL', 'PRESENT_ONLY', 'FUND_ONLY']
    const results = await Promise.all(
      rules.map((rule) =>
        this.prisma.livingExpense.aggregate({ where: { clubId, fundPeriodId, allocationRule: rule }, _sum: { amount: true }, _count: true }),
      ),
    )
    return Object.fromEntries(rules.map((rule, i) => [rule, { total: Number(results[i]._sum.amount ?? 0), count: results[i]._count }]))
  }
}
