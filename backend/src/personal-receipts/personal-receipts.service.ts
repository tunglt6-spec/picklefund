import { Injectable, NotFoundException } from '@nestjs/common';
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
    // Chống nhiễm chéo tenant: kỳ quỹ BẮT BUỘC thuộc clubId người gọi (calculate() nhận id từ URL param).
    const period = await this.prisma.fundPeriod.findFirst({
      where: { id: fundPeriodId, clubId },
      select: { id: true },
    });
    if (!period) throw new NotFoundException('Kỳ quỹ không thuộc CLB này');
    const summary = await this.calculator.calculate(fundPeriodId, clubId);

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

    await this.notifyMembers(fundPeriodId, clubId, receipts);
    return receipts;
  }

  // Báo in-app (chuông) cho từng member có tài khoản; không báo lặp khi tạo lại phiếu cùng kỳ. Lỗi báo KHÔNG làm hỏng việc tạo phiếu.
  private async notifyMembers(
    fundPeriodId: string,
    clubId: string,
    receipts: { memberId: string; needToPay: Decimal }[],
  ) {
    try {
      const period = await this.prisma.fundPeriod.findUnique({
        where: { id: fundPeriodId },
        select: { name: true },
      });
      const members = await this.prisma.member.findMany({
        where: { id: { in: receipts.map((r) => r.memberId) }, userId: { not: null } },
        select: { id: true, userId: true },
      });
      const already = await this.prisma.notification.findMany({
        where: {
          clubId,
          eventType: 'receipt_generated',
          metadata: { path: ['fundPeriodId'], equals: fundPeriodId },
        },
        select: { userId: true },
      });
      const done = new Set(already.map((n) => n.userId));
      const need = new Map(receipts.map((r) => [r.memberId, r.needToPay]));
      const data = members
        .filter((m) => m.userId && !done.has(m.userId))
        .map((m) => {
          const due = need.get(m.id);
          const owes = due && due.greaterThan(0);
          return {
            userId: m.userId as string,
            clubId,
            eventType: 'receipt_generated',
            priority: 'MEDIUM' as const,
            channel: 'IN_APP' as const,
            title: `Phiếu thu kỳ ${period?.name ?? ''}`.trim(),
            body: owes
              ? `Phiếu thu cá nhân đã sẵn sàng. Bạn cần đóng thêm ${due.toFixed(0)} đ — xem chi tiết tại mục Phiếu thu.`
              : 'Phiếu thu cá nhân đã sẵn sàng — xem chi tiết tại mục Phiếu thu.',
            metadata: { fundPeriodId },
            status: 'SENT' as const,
            sentAt: new Date(),
          };
        });
      if (data.length) await this.prisma.notification.createMany({ data });
    } catch {
      // best-effort
    }
  }
}
