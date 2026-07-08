import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialCalculatorService } from '../financial/financial-calculator.service';
import { HermesEventPublisher } from '../workflows/hermes-event.publisher';
import type { FundPeriodStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class FundPeriodsService {
  constructor(
    private prisma: PrismaService,
    private calculator: FinancialCalculatorService,
    private events: HermesEventPublisher,
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
      copyMembersFromPreviousPeriod?: boolean;
    },
  ) {
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    }
    const { type, copyMembersFromPreviousPeriod, ...safeDto } = dto;
    const periodType = type ?? 'chung';
    const data = {
      ...safeDto,
      clubId,
      createdById: userId,
      type: periodType,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      contributionAmount: new Decimal(dto.contributionAmount),
      totalSessions: dto.totalSessions ?? 0,
      status: (new Date(dto.startDate) > new Date()
        ? 'draft'
        : 'active') as FundPeriodStatus,
    };

    if (!copyMembersFromPreviousPeriod) {
      const created = await this.prisma.fundPeriod.create({ data });
      return { ...created, copiedMembersCount: 0 };
    }

    // FUND-IMPL-01: tạo kỳ quỹ + copy roster thành viên từ kỳ gần nhất CÙNG LOẠI
    // trong 1 transaction — copy lỗi phải rollback luôn kỳ quỹ mới (không partial data).
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.fundPeriod.create({ data });

      const previousPeriod = await tx.fundPeriod.findFirst({
        where: {
          clubId,
          type: periodType,
          id: { not: created.id },
          OR: [
            { startDate: { lt: created.startDate } },
            { endDate: { lt: created.endDate } },
          ],
        },
        orderBy: [
          { endDate: 'desc' },
          { startDate: 'desc' },
          { createdAt: 'desc' },
        ],
      });
      if (!previousPeriod) return { ...created, copiedMembersCount: 0 };

      // Roster của kỳ trước (KHÔNG phải toàn bộ member CLB) — quỹ phụ/giải đấu
      // thường không phải ai cũng tham gia.
      const previousRoster = await tx.fundPeriodMember.findMany({
        where: { fundPeriodId: previousPeriod.id },
        select: { memberId: true },
      });
      if (previousRoster.length === 0)
        return { ...created, copiedMembersCount: 0 };

      // §8: không copy member đã inactive/rời CLB — chỉ giữ member đang active.
      const activeMembers = await tx.member.findMany({
        where: {
          clubId,
          isDeleted: false,
          status: 'active',
          id: { in: previousRoster.map((r) => r.memberId) },
        },
        select: { id: true },
      });
      if (activeMembers.length === 0)
        return { ...created, copiedMembersCount: 0 };

      // Reset theo kỳ mới: expectedAmount = mức đóng/người kỳ mới; KHÔNG copy
      // paidAmount/payment history/confirmed cũ (chỉ tạo roster, không tạo contribution).
      const { count } = await tx.fundPeriodMember.createMany({
        data: activeMembers.map((m) => ({
          clubId,
          fundPeriodId: created.id,
          memberId: m.id,
          expectedAmount: created.contributionAmount,
        })),
        skipDuplicates: true,
      });

      return { ...created, copiedMembersCount: count };
    });
  }

  /** FUND-IMPL-01: thông tin kỳ quỹ gần nhất CÙNG LOẠI để hiển thị preview copy-member
   * trong modal tạo kỳ quỹ mới (trước khi kỳ mới tồn tại). */
  async previousPeriodInfo(clubId: string, type: string) {
    const previousPeriod = await this.prisma.fundPeriod.findFirst({
      where: { clubId, type },
      orderBy: [
        { endDate: 'desc' },
        { startDate: 'desc' },
        { createdAt: 'desc' },
      ],
    });
    if (!previousPeriod) return null;
    const memberCount = await this.prisma.fundPeriodMember.count({
      where: { fundPeriodId: previousPeriod.id },
    });
    return {
      id: previousPeriod.id,
      name: previousPeriod.name,
      startDate: previousPeriod.startDate,
      endDate: previousPeriod.endDate,
      memberCount,
    };
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
    const updated = await this.prisma.fundPeriod.update({
      where: { id, clubId },
      data: updates,
    });
    // Epic 7: kỳ quỹ chốt sổ → phát event SAU khi commit — fire-and-forget.
    if (status === 'finalized') {
      this.events.publish({
        clubId,
        userId: fp.createdById,
        triggerType: 'FUND_PERIOD_CLOSED',
        context: { fundPeriodId: id },
        idempotencyKey: `FUND_PERIOD_CLOSED:${id}`,
      });
    }
    return updated;
  }

  /**
   * Xóa kỳ quỹ + TOÀN BỘ dữ liệu con (buổi sinh hoạt, điểm danh, đăng ký, thu,
   * chi, phiếu thu cá nhân). Các bảng con phần lớn KHÔNG có onDelete:Cascade
   * (chỉ SessionRegistration + FundPeriodMember có) — xóa thẳng fundPeriod
   * trước đây gây lỗi 500 (vi phạm khóa ngoại) nếu kỳ có bất kỳ dữ liệu nào.
   * Dùng $transaction để đảm bảo xóa trọn vẹn hoặc không xóa gì (rollback nếu lỗi).
   */
  async delete(id: string, clubId: string) {
    const fp = await this.findOne(id, clubId);
    if (fp.status === 'finalized')
      throw new BadRequestException('Kỳ đã chốt không thể xóa');
    await this.prisma.$transaction([
      // AttendanceRecord không cascade theo session — phải xóa trước session.
      this.prisma.attendanceRecord.deleteMany({
        where: { attendanceSession: { fundPeriodId: id } },
      }),
      // LivingExpense có thể gắn theo fundPeriodId hoặc theo attendanceSessionId
      // (buổi thuộc kỳ này) — xóa cả 2 trường hợp trước khi xóa session.
      this.prisma.livingExpense.deleteMany({
        where: {
          OR: [{ fundPeriodId: id }, { attendanceSession: { fundPeriodId: id } }],
        },
      }),
      // SessionRegistration có onDelete:Cascade theo session nên tự xóa theo.
      this.prisma.attendanceSession.deleteMany({ where: { fundPeriodId: id } }),
      this.prisma.fundContribution.deleteMany({ where: { fundPeriodId: id } }),
      this.prisma.personalReceipt.deleteMany({ where: { fundPeriodId: id } }),
      // FundPeriodMember có onDelete:Cascade theo fundPeriod — không cần xóa tay,
      // nhưng vẫn để prisma.fundPeriod.delete() ở cuối tự cuốn theo.
      this.prisma.fundPeriod.delete({ where: { id, clubId } }),
    ]);
    return { deleted: true };
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

    // carryForward = SỐ DƯ CUỐI kỳ trước (clubAssets.balance của kỳ đó — đã bao gồm
    // carryForward của chính kỳ đó). Gọi ĐỆ QUY summary() của kỳ trước để chuỗi carryForward
    // cộng dồn đúng qua nhiều kỳ liên tiếp (kỳ N-2 không bị bỏ sót khi tính kỳ N).
    // Trước đây tính trực tiếp "prevIncome - prevExpense" chỉ của RIÊNG kỳ liền trước (không đệ quy)
    // → mất số dư các kỳ xa hơn N-1; đồng thời fallback prevTotalLiving>0?prevTotalLiving:prevTotalCourt
    // không khớp canonical (financial-calculator dùng tổng EQUAL+PRESENT_ONLY/ATTENDANCE+FUND_ONLY).
    let carryForwardBalance = 0;
    if (previousPeriod) {
      const prevSummary = await this.summary(previousPeriod.id, clubId);
      carryForwardBalance = prevSummary.clubAssets.balance;
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
      // Số buổi tập của kỳ (đã tính ở financial-calculator) — frontend Reports dùng làm
      // 1 trong các field bắt buộc của Export Gate (officialReady). Trước đây không expose
      // → kSessions luôn undefined → gate luôn disabled. Expose giá trị thật (không fake).
      totalSessions: sessionCount,
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
