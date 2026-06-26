import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { FundPeriodStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class FundPeriodsService {
  constructor(private prisma: PrismaService) {}

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

    const [contributions, courtExpAgg, livingExpAgg, sessions, members] =
      await Promise.all([
        this.prisma.fundContribution.aggregate({
          where: { fundPeriodId: id, clubId, fundSource: 'COMMON' },
          _sum: { amount: true },
        }),
        // CHI PHÍ SÂN: expenses phân bổ EQUAL ("Đều nhau") — chia đều tất cả thành viên
        this.prisma.livingExpense.aggregate({
          where: {
            fundPeriodId: id,
            clubId,
            fundSource: 'COMMON',
            allocationRule: 'EQUAL',
          },
          _sum: { amount: true },
        }),
        // SINH HOẠT: expenses phân bổ PRESENT_ONLY/ATTENDANCE ("Theo số người tham gia")
        this.prisma.livingExpense.aggregate({
          where: {
            fundPeriodId: id,
            clubId,
            fundSource: 'COMMON',
            allocationRule: { in: ['PRESENT_ONLY', 'ATTENDANCE'] },
          },
          _sum: { amount: true },
        }),
        this.prisma.attendanceSession.findMany({
          where: { fundPeriodId: id, clubId },
          include: {
            _count: {
              select: { attendanceRecords: { where: { status: 'PRESENT' } } },
            },
          },
        }),
        this.prisma.member.findMany({ where: { clubId, isDeleted: false } }),
      ]);

    const totalIncome = Number(contributions._sum.amount ?? 0);
    const totalCourt = Number(courtExpAgg._sum.amount ?? 0);
    const totalLiving = Number(livingExpAgg._sum.amount ?? 0);
    const totalExpenses = totalCourt + totalLiving;
    const memberCount = members.length;
    const totalAttendance = sessions.reduce(
      (s, sess) => s + sess._count.attendanceRecords,
      0,
    );
    const costPerAttendance =
      totalAttendance > 0 ? Math.round(totalExpenses / totalAttendance) : 0;

    // Batch: two groupBy instead of 2N individual queries
    const [attendanceCounts, paidAmounts] = await Promise.all([
      this.prisma.attendanceRecord.groupBy({
        by: ['memberId'],
        where: { status: 'PRESENT', attendanceSession: { fundPeriodId: id } },
        _count: { id: true },
      }),
      this.prisma.fundContribution.groupBy({
        by: ['memberId'],
        where: { fundPeriodId: id, clubId, fundSource: 'COMMON' },
        _sum: { amount: true },
      }),
    ]);
    const attendedMap = Object.fromEntries(
      attendanceCounts.map((r) => [r.memberId, r._count.id]),
    );
    const paidMap = Object.fromEntries(
      paidAmounts.map((r) => [r.memberId, Number(r._sum.amount ?? 0)]),
    );

    const memberRows = members.map((m) => {
      const attended = attendedMap[m.id] ?? 0;
      const amountPaid = paidMap[m.id] ?? 0;
      const courtCost =
        memberCount > 0 ? Math.round(totalCourt / memberCount) : 0;
      const livingCost =
        totalAttendance > 0
          ? Math.round((attended / totalAttendance) * totalLiving)
          : 0;
      const totalCost = courtCost + livingCost;
      const balance = amountPaid - totalCost;
      return {
        memberId: m.id,
        memberName: m.fullName,
        attendedSessions: attended,
        amountPaid,
        courtCost,
        livingCost,
        totalCost,
        balance,
        contributionPaid: amountPaid >= Number(fp.contributionAmount),
      };
    });

    return {
      totalIncome,
      totalExpenses,
      courtExpenses: totalCourt,
      livingExpenses: totalLiving,
      balance: totalIncome - totalExpenses,
      totalAttendance,
      costPerAttendance,
      unpaidCount: memberRows.filter((m) => !m.contributionPaid).length,
      negativeBalanceCount: memberRows.filter((m) => m.balance < 0).length,
      lowAttendanceCount: memberRows.filter(
        (m) =>
          sessions.length > 0 && m.attendedSessions / sessions.length < 0.5,
      ).length,
      members: memberRows,
    };
  }
}
