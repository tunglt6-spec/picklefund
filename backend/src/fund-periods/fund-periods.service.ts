import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialCalculatorService } from '../financial/financial-calculator.service';
import type { FundPeriodStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class FundPeriodsService {
  constructor(
    private prisma: PrismaService,
    private calculator: FinancialCalculatorService,
  ) {}

  async findAll(clubId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Auto-transition: draft → active when startDate arrived; active → closed when endDate passed
    await this.prisma.$transaction([
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
    return this.prisma.fundPeriod.findMany({
      where: { clubId },
      orderBy: { startDate: 'desc' },
      include: {
        _count: { select: { attendanceSessions: true, contributions: true } },
      },
    });
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
    },
  ) {
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    }
    const { type, ...safeDto } = dto;
    return this.prisma.fundPeriod.create({
      data: {
        ...safeDto,
        clubId,
        createdById: userId,
        type: type ?? 'chung',
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        contributionAmount: new Decimal(dto.contributionAmount),
        totalSessions: dto.totalSessions ?? 0,
        status: new Date(dto.startDate) > new Date() ? 'draft' : 'active',
      },
    });
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
    return this.prisma.fundPeriod.update({
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
  }

  async updateStatus(id: string, clubId: string, status: FundPeriodStatus) {
    const fp = await this.findOne(id, clubId);
    const updates: any = { status };
    if (status === 'finalized') updates.finalizedAt = new Date();
    return this.prisma.fundPeriod.update({ where: { id, clubId }, data: updates });
  }

  async delete(id: string, clubId: string) {
    const fp = await this.findOne(id, clubId);
    if (fp.status === 'finalized')
      throw new BadRequestException('Kỳ đã chốt không thể xóa');
    return this.prisma.fundPeriod.delete({ where: { id, clubId } });
  }

  async summary(id: string, clubId: string) {
    const fp = await this.findOne(id, clubId);

    // Derive carryForward from most recent closed/finalized period before this one
    const previousPeriod = await this.prisma.fundPeriod.findFirst({
      where: {
        clubId,
        startDate: { lt: fp.startDate },
        status: { in: ['closed', 'finalized'] },
      },
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true },
    });

    let carryForwardBalance = 0;
    if (previousPeriod) {
      const [prevIncome, prevLiving, prevCourt] = await Promise.all([
        this.prisma.fundContribution.aggregate({
          where: { fundPeriodId: previousPeriod.id, clubId, fundSource: 'COMMON', isConfirmed: true },
          _sum: { amount: true },
        }),
        this.prisma.livingExpense.aggregate({
          where: { fundPeriodId: previousPeriod.id, clubId, fundSource: 'COMMON' },
          _sum: { amount: true },
        }),
        this.prisma.attendanceSession.aggregate({
          where: { fundPeriodId: previousPeriod.id, clubId },
          _sum: { courtFee: true },
        }),
      ]);
      const prevTotalIncome = Number(prevIncome._sum.amount ?? 0);
      const prevTotalLiving = Number(prevLiving._sum.amount ?? 0);
      const prevTotalCourt = Number(prevCourt._sum.courtFee ?? 0);
      const prevTotalExpense = prevTotalLiving > 0 ? prevTotalLiving : prevTotalCourt;
      carryForwardBalance = prevTotalIncome - prevTotalExpense;
    }

    const result = await this.calculator.calculate(id, clubId, {
      carryForwardBalance,
      previousPeriodId: previousPeriod?.id ?? null,
      previousPeriodName: previousPeriod?.name ?? null,
    });

    const sessionCount = result.totalSessions;

    return {
      totalIncome: result.commonFund.totalIncome,
      totalExpenses: result.commonFund.totalExpense,
      courtExpenses: result.commonFund.totalCourt,
      livingExpenses: result.commonFund.totalLiving,
      balance: result.commonFund.balance,
      totalAttendance: result.totalAttendance,
      costPerAttendance: result.costPerAttendance,
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
  }
}
