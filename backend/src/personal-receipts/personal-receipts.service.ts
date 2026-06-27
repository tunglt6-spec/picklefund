import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialCalculatorService } from '../financial/financial-calculator.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PersonalReceiptsService {
  constructor(
    private prisma: PrismaService,
    private calculator: FinancialCalculatorService,
  ) {}

  async findByMember(memberId: string, clubId: string) {
    return this.prisma.personalReceipt.findMany({
      where: { memberId, clubId },
      include: { fundPeriod: true },
      orderBy: { snapshotAt: 'desc' },
    });
  }

  async findByPeriod(fundPeriodId: string, clubId: string) {
    return this.prisma.personalReceipt.findMany({
      where: { fundPeriodId, clubId },
      include: { member: { select: { fullName: true } } },
    });
  }

  async findMine(memberId: string, clubId: string) {
    return this.prisma.personalReceipt.findMany({
      where: { memberId, clubId },
      include: { fundPeriod: true },
      orderBy: { snapshotAt: 'desc' },
    });
  }

  // Compute and snapshot all member receipts for a fund period
  async generateForPeriod(fundPeriodId: string, clubId: string) {
    const summary = await this.calculator.calculate(fundPeriodId, clubId);
    const { Decimal } = await import('@prisma/client/runtime/library');

    const receipts = await Promise.all(
      summary.members.map(async (m) => {
        const attendanceRate =
          summary.totalSessions > 0
            ? new Decimal(m.attendedSessions / summary.totalSessions).toDecimalPlaces(2)
            : new Decimal(0);
        const needToPay =
          m.balance < 0 ? new Decimal(Math.abs(m.balance)) : new Decimal(0);

        return this.prisma.personalReceipt.upsert({
          where: { fundPeriodId_memberId: { fundPeriodId, memberId: m.memberId } },
          create: {
            fundPeriodId,
            memberId: m.memberId,
            clubId,
            attendedSessions: m.attendedSessions,
            totalSessions: m.totalSessions,
            attendanceRate,
            amountPaid: new Decimal(m.paidAmount),
            courtCost: new Decimal(m.courtFee),
            livingCost: new Decimal(m.livingFee),
            totalCost: new Decimal(m.totalCost),
            balance: new Decimal(m.balance),
            needToPay,
          },
          update: {
            attendedSessions: m.attendedSessions,
            totalSessions: m.totalSessions,
            attendanceRate,
            amountPaid: new Decimal(m.paidAmount),
            courtCost: new Decimal(m.courtFee),
            livingCost: new Decimal(m.livingFee),
            totalCost: new Decimal(m.totalCost),
            balance: new Decimal(m.balance),
            needToPay,
          },
        });
      }),
    );

    return receipts;
  }
}
