import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HermesEventPublisher } from '../workflows/hermes-event.publisher';
import { FinancialCalculatorService } from '../financial/financial-calculator.service';
import { Decimal } from '@prisma/client/runtime/library';
import type { FundSource, MiniIncomeType } from '@prisma/client';
import type { ImportContributionsDto } from './contributions.dto';

export interface CreateContributionDto {
  fundSource: FundSource;
  // COMMON fields
  memberId?: string;
  fundPeriodId?: string;
  // MINI fields
  miniIncomeType?: MiniIncomeType;
  payerName?: string;
  relatedMinigameId?: string;
  // shared
  amount: number;
  paidAt: string;
  paymentMethod?: string;
  notes?: string;
  isConfirmed?: boolean;
}

@Injectable()
export class ContributionsService {
  constructor(
    private prisma: PrismaService,
    private events: HermesEventPublisher,
    private calculator: FinancialCalculatorService,
  ) {}

  async findAll(
    clubId: string,
    fundPeriodId?: string,
    fundSource?: FundSource,
  ) {
    return this.prisma.fundContribution.findMany({
      where: {
        clubId,
        ...(fundPeriodId ? { fundPeriodId } : {}),
        ...(fundSource ? { fundSource } : {}),
      },
      orderBy: { paymentDate: 'desc' },
      include: { member: { select: { id: true, fullName: true } } },
    });
  }

  async findOne(id: string, clubId: string) {
    const c = await this.prisma.fundContribution.findFirst({
      where: { id, clubId },
    });
    if (!c) throw new NotFoundException('Khoản đóng quỹ không tồn tại');
    return c;
  }

  /**
   * Chống nhiễm chéo tenant: FK từ body (memberId/fundPeriodId/relatedMinigameId)
   * BẮT BUỘC thuộc cùng clubId người gọi trước khi gán. (Nhất quán attendance.create / importBulk.)
   */
  private async assertFkOwnership(
    clubId: string,
    dto: Partial<CreateContributionDto>,
  ) {
    if (dto.memberId) {
      const m = await this.prisma.member.findFirst({
        where: { id: dto.memberId, clubId },
        select: { id: true },
      });
      if (!m) throw new BadRequestException('Thành viên không thuộc CLB này');
    }
    if (dto.fundPeriodId) {
      const p = await this.prisma.fundPeriod.findFirst({
        where: { id: dto.fundPeriodId, clubId },
        select: { id: true },
      });
      if (!p) throw new BadRequestException('Kỳ quỹ không thuộc CLB này');
    }
    if (dto.relatedMinigameId) {
      const g = await this.prisma.minigame.findFirst({
        where: { id: dto.relatedMinigameId, clubId },
        select: { id: true },
      });
      if (!g) throw new BadRequestException('Giải đấu không thuộc CLB này');
    }
  }

  async create(clubId: string, userId: string, dto: CreateContributionDto) {
    const fundSource: FundSource = dto.fundSource ?? 'COMMON';

    if (!dto.amount || isNaN(Number(dto.amount)) || Number(dto.amount) <= 0) {
      throw new BadRequestException('Số tiền phải lớn hơn 0');
    }

    if (fundSource === 'COMMON') {
      if (!dto.memberId)
        throw new BadRequestException('memberId bắt buộc cho Quỹ Chung');
      if (!dto.fundPeriodId)
        throw new BadRequestException('fundPeriodId bắt buộc cho Quỹ Chung');
    }

    if (fundSource === 'MINI') {
      if (!dto.miniIncomeType)
        throw new BadRequestException('miniIncomeType bắt buộc cho Quỹ Mini');
    }

    await this.assertFkOwnership(clubId, dto);

    const created = await this.prisma.fundContribution.create({
      data: {
        clubId,
        createdById: userId,
        fundSource,
        amount: new Decimal(dto.amount),
        paymentDate: new Date(dto.paidAt),
        paymentMethod: dto.paymentMethod ?? 'bank_transfer',
        isConfirmed: dto.isConfirmed ?? false,
        notes: dto.notes,
        // COMMON
        ...(dto.memberId ? { memberId: dto.memberId } : {}),
        ...(dto.fundPeriodId ? { fundPeriodId: dto.fundPeriodId } : {}),
        // MINI
        ...(dto.miniIncomeType ? { miniIncomeType: dto.miniIncomeType } : {}),
        ...(dto.payerName ? { payerName: dto.payerName } : {}),
        ...(dto.relatedMinigameId
          ? { relatedMinigameId: dto.relatedMinigameId }
          : {}),
      },
    });
    await this.calculator.invalidateClosingBalances(clubId);
    return created;
  }

  async update(
    id: string,
    clubId: string,
    dto: Partial<CreateContributionDto>,
  ) {
    await this.findOne(id, clubId);
    if (
      dto.amount !== undefined &&
      (isNaN(Number(dto.amount)) || Number(dto.amount) <= 0)
    ) {
      throw new BadRequestException('Số tiền phải lớn hơn 0');
    }
    await this.assertFkOwnership(clubId, dto);
    const updated = await this.prisma.fundContribution.update({
      where: { id, clubId },
      data: {
        ...(dto.amount !== undefined
          ? { amount: new Decimal(dto.amount) }
          : {}),
        ...(dto.paidAt ? { paymentDate: new Date(dto.paidAt) } : {}),
        ...(dto.paymentMethod ? { paymentMethod: dto.paymentMethod } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.memberId !== undefined ? { memberId: dto.memberId } : {}),
        ...(dto.fundPeriodId !== undefined
          ? { fundPeriodId: dto.fundPeriodId }
          : {}),
        ...(dto.miniIncomeType !== undefined
          ? { miniIncomeType: dto.miniIncomeType }
          : {}),
        ...(dto.payerName !== undefined ? { payerName: dto.payerName } : {}),
        ...(dto.relatedMinigameId !== undefined
          ? { relatedMinigameId: dto.relatedMinigameId }
          : {}),
      },
    });
    await this.calculator.invalidateClosingBalances(clubId);
    return updated;
  }

  async delete(id: string, clubId: string) {
    await this.findOne(id, clubId);
    const deleted = await this.prisma.fundContribution.delete({
      where: { id, clubId },
    });
    await this.calculator.invalidateClosingBalances(clubId);
    return deleted;
  }

  async toggleConfirm(id: string, clubId: string) {
    const c = await this.findOne(id, clubId);
    const updated = await this.prisma.fundContribution.update({
      where: { id, clubId },
      data: { isConfirmed: !c.isConfirmed },
    });
    await this.calculator.invalidateClosingBalances(clubId);
    // Epic 7: chỉ phát khi chuyển sang ĐÃ xác nhận (không phát khi bỏ xác nhận).
    if (updated.isConfirmed) {
      this.events.publish({
        clubId,
        userId: c.createdById,
        triggerType: 'CONTRIBUTION_CONFIRMED',
        context: { contributionId: id },
        idempotencyKey: `CONTRIBUTION_CONFIRMED:${id}`,
      });
    }
    return updated;
  }

  async bulkConfirm(ids: string[], clubId: string) {
    if (!ids.length) return { confirmed: 0 };
    const result = await this.prisma.fundContribution.updateMany({
      where: { id: { in: ids }, clubId, isConfirmed: false },
      data: { isConfirmed: true },
    });
    if (result.count > 0) await this.calculator.invalidateClosingBalances(clubId);
    // Epic 7: đọc actor fire-and-forget (không chặn response, không throw sau commit).
    if (result.count > 0) {
      void this.prisma.fundContribution
        .findFirst({
          where: { id: { in: ids }, clubId },
          select: { createdById: true },
        })
        .then((sample) => {
          if (sample) {
            this.events.publish({
              clubId,
              userId: sample.createdById,
              triggerType: 'CONTRIBUTION_CONFIRMED',
              context: { confirmedCount: result.count, bulk: true },
              idempotencyKey: `CONTRIBUTION_CONFIRMED:bulk:${ids[0]}:${result.count}`,
            });
          }
        })
        .catch(() => undefined);
    }
    return { confirmed: result.count };
  }

  async importBulk(
    clubId: string,
    userId: string,
    dto: ImportContributionsDto,
  ) {
    const [period, members] = await Promise.all([
      this.prisma.fundPeriod.findFirst({
        where: { id: dto.fundPeriodId, clubId },
      }),
      this.prisma.member.findMany({
        where: { clubId, isDeleted: false },
        select: { id: true, fullName: true },
      }),
    ]);

    if (!period)
      throw new BadRequestException(
        'Kỳ quỹ không tồn tại hoặc không thuộc CLB này',
      );

    const toInsert: {
      clubId: string;
      createdById: string;
      fundSource: 'COMMON';
      memberId: string;
      fundPeriodId: string;
      amount: Decimal;
      paymentDate: Date;
      paymentMethod: string;
      isConfirmed: boolean;
      notes: string | null;
    }[] = [];
    const errors: { row: number; memberName: string; error: string }[] = [];

    for (let i = 0; i < dto.rows.length; i++) {
      const row = dto.rows[i];
      const rowNum = i + 2; // Excel row (header = row 1)

      const member = members.find(
        (m) =>
          m.fullName.toLowerCase().trim() ===
          row.memberName.toLowerCase().trim(),
      );

      if (!member) {
        errors.push({
          row: rowNum,
          memberName: row.memberName,
          error: 'Không tìm thấy thành viên trong CLB',
        });
        continue;
      }

      toInsert.push({
        clubId,
        createdById: userId,
        fundSource: 'COMMON',
        memberId: member.id,
        fundPeriodId: dto.fundPeriodId,
        amount: new Decimal(row.amount),
        paymentDate: row.paymentDate ? new Date(row.paymentDate) : new Date(),
        paymentMethod: 'bank_transfer',
        isConfirmed: false,
        notes: row.notes ?? null,
      });
    }

    if (toInsert.length > 0) {
      await this.prisma.fundContribution.createMany({ data: toInsert });
      await this.calculator.invalidateClosingBalances(clubId);
    }

    return { imported: toInsert.length, total: dto.rows.length, errors };
  }

  async summary(clubId: string, fundPeriodId?: string) {
    const [commonConfirmed, commonUnconfirmed, miniTotal] = await Promise.all([
      this.prisma.fundContribution.aggregate({
        where: {
          clubId,
          ...(fundPeriodId ? { fundPeriodId } : {}),
          fundSource: 'COMMON',
          isConfirmed: true,
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.fundContribution.aggregate({
        where: {
          clubId,
          ...(fundPeriodId ? { fundPeriodId } : {}),
          fundSource: 'COMMON',
          isConfirmed: false,
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.fundContribution.aggregate({
        where: { clubId, fundSource: 'MINI', isConfirmed: true },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const miniByType = await this.prisma.fundContribution.groupBy({
      by: ['miniIncomeType'],
      where: { clubId, fundSource: 'MINI', isConfirmed: true },
      _sum: { amount: true },
    });

    return {
      common: {
        confirmedTotal: Number(commonConfirmed._sum.amount ?? 0),
        confirmedCount: commonConfirmed._count,
        unconfirmedTotal: Number(commonUnconfirmed._sum.amount ?? 0),
        unconfirmedCount: commonUnconfirmed._count,
        grandTotal:
          Number(commonConfirmed._sum.amount ?? 0) +
          Number(commonUnconfirmed._sum.amount ?? 0),
      },
      mini: {
        total: Number(miniTotal._sum.amount ?? 0),
        count: miniTotal._count,
        byType: Object.fromEntries(
          miniByType.map((r) => [
            r.miniIncomeType ?? 'OTHER',
            Number(r._sum.amount ?? 0),
          ]),
        ),
      },
    };
  }
}
