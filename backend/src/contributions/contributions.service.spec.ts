/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import { PrismaService } from '../prisma/prisma.service';
import { HermesEventPublisher } from '../workflows/hermes-event.publisher';
import { FinancialCalculatorService } from '../financial/financial-calculator.service';
import { Decimal } from '@prisma/client/runtime/library';

const mockCalculator = { invalidateClosingBalances: jest.fn() };

const mockPrisma = {
  fundContribution: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createMany: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    count: jest.fn(),
  },
  fundPeriod: { findFirst: jest.fn() },
  member: { findMany: jest.fn(), findFirst: jest.fn() },
  minigame: { findFirst: jest.fn() },
};

const mockEvents = { publish: jest.fn() };

const baseContrib = {
  id: 'contrib-1',
  clubId: 'club-1',
  fundPeriodId: 'period-1',
  memberId: 'mem-1',
  fundSource: 'COMMON',
  amount: new Decimal(300000),
  paymentDate: new Date('2026-03-01'),
  paymentMethod: 'bank_transfer',
  isConfirmed: false,
  notes: null,
  createdById: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ContributionsService', () => {
  let service: ContributionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: HermesEventPublisher, useValue: mockEvents },
        { provide: FinancialCalculatorService, useValue: mockCalculator },
      ],
    }).compile();
    service = module.get<ContributionsService>(ContributionsService);
  });

  describe('findOne', () => {
    it('should return contribution when found in same club', async () => {
      mockPrisma.fundContribution.findFirst.mockResolvedValue(baseContrib);
      const result = await service.findOne('contrib-1', 'club-1');
      expect(result.id).toBe('contrib-1');
      expect(mockPrisma.fundContribution.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'contrib-1', clubId: 'club-1' }),
        }),
      );
    });

    it('should throw NotFoundException when contribution belongs to different club', async () => {
      mockPrisma.fundContribution.findFirst.mockResolvedValue(null);
      await expect(service.findOne('contrib-1', 'club-2')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create COMMON contribution with valid data', async () => {
      // FK ownership validation: member + fundPeriod thuộc club
      mockPrisma.member.findFirst.mockResolvedValue({ id: 'mem-1' });
      mockPrisma.fundPeriod.findFirst.mockResolvedValue({ id: 'period-1' });
      mockPrisma.fundContribution.create.mockResolvedValue(baseContrib);

      const result = await service.create('club-1', 'user-1', {
        fundSource: 'COMMON',
        memberId: 'mem-1',
        fundPeriodId: 'period-1',
        amount: 300000,
        paidAt: '2026-03-01',
      });

      expect(result.amount).toEqual(new Decimal(300000));
      expect(mockPrisma.fundContribution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clubId: 'club-1',
            fundSource: 'COMMON',
          }),
        }),
      );
    });

    it('should throw BadRequestException when amount is zero', async () => {
      await expect(
        service.create('club-1', 'user-1', {
          fundSource: 'COMMON',
          memberId: 'mem-1',
          fundPeriodId: 'period-1',
          amount: 0,
          paidAt: '2026-03-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for COMMON without memberId', async () => {
      await expect(
        service.create('club-1', 'user-1', {
          fundSource: 'COMMON',
          fundPeriodId: 'period-1',
          amount: 100000,
          paidAt: '2026-03-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject cross-club fundPeriod FK (multi-tenant isolation)', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ id: 'mem-1' });
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(null); // kỳ quỹ CLB khác
      await expect(
        service.create('club-1', 'user-1', {
          fundSource: 'COMMON',
          memberId: 'mem-1',
          fundPeriodId: 'period-of-other-club',
          amount: 100000,
          paidAt: '2026-03-01',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.fundContribution.create).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete with clubId in where clause (cross-tenant safety)', async () => {
      mockPrisma.fundContribution.findFirst.mockResolvedValue(baseContrib);
      mockPrisma.fundContribution.delete.mockResolvedValue(baseContrib);

      await service.delete('contrib-1', 'club-1');

      expect(mockPrisma.fundContribution.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contrib-1', clubId: 'club-1' },
        }),
      );
    });

    it('should not delete contribution from a different club', async () => {
      mockPrisma.fundContribution.findFirst.mockResolvedValue(null);
      await expect(service.delete('contrib-1', 'club-2')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.fundContribution.delete).not.toHaveBeenCalled();
    });
  });

  describe('toggleConfirm', () => {
    it('should toggle isConfirmed and include clubId in update where', async () => {
      mockPrisma.fundContribution.findFirst.mockResolvedValue(baseContrib);
      mockPrisma.fundContribution.update.mockResolvedValue({
        ...baseContrib,
        isConfirmed: true,
      });

      await service.toggleConfirm('contrib-1', 'club-1');

      expect(mockPrisma.fundContribution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contrib-1', clubId: 'club-1' },
          data: { isConfirmed: true },
        }),
      );
    });
  });

  describe('findAll', () => {
    it('returns a plain array (backward-compatible) when no page option', async () => {
      mockPrisma.fundContribution.findMany.mockResolvedValue([baseContrib]);
      const result = await service.findAll('club-1');
      expect(Array.isArray(result)).toBe(true);
      expect(mockPrisma.fundContribution.count).not.toHaveBeenCalled();
      const call = mockPrisma.fundContribution.findMany.mock.calls[0][0];
      expect(call).not.toHaveProperty('skip');
      expect(call).not.toHaveProperty('take');
      // vẫn include member như cũ
      expect(call.include).toEqual({
        member: { select: { id: true, fullName: true } },
      });
    });

    it('returns paginated shape { items, total, page, limit } when page provided', async () => {
      mockPrisma.fundContribution.findMany.mockResolvedValue([baseContrib]);
      mockPrisma.fundContribution.count.mockResolvedValue(30);
      const result = await service.findAll('club-1', undefined, undefined, {
        page: 3,
        limit: 5,
      });
      expect(result).toEqual({
        items: [baseContrib],
        total: 30,
        page: 3,
        limit: 5,
      });
      const call = mockPrisma.fundContribution.findMany.mock.calls[0][0];
      expect(call.skip).toBe(10); // (3-1)*5
      expect(call.take).toBe(5);
    });

    it('applies isConfirmed + search filters in where clause', async () => {
      mockPrisma.fundContribution.findMany.mockResolvedValue([baseContrib]);
      mockPrisma.fundContribution.count.mockResolvedValue(1);
      await service.findAll('club-1', undefined, undefined, {
        page: 1,
        isConfirmed: true,
        search: 'Nguyễn',
      });
      const where = mockPrisma.fundContribution.findMany.mock.calls[0][0].where;
      expect(where.isConfirmed).toBe(true);
      expect(where.OR).toEqual(
        expect.arrayContaining([
          { notes: { contains: 'Nguyễn', mode: 'insensitive' } },
          { payerName: { contains: 'Nguyễn', mode: 'insensitive' } },
        ]),
      );
    });
  });

  describe('summary', () => {
    it('should count only confirmed MINI contributions in mini totals', async () => {
      mockPrisma.fundContribution.aggregate
        .mockResolvedValueOnce({
          _sum: { amount: new Decimal(1_000_000) },
          _count: 2,
        })
        .mockResolvedValueOnce({
          _sum: { amount: new Decimal(999_000) },
          _count: 1,
        })
        .mockResolvedValueOnce({
          _sum: { amount: new Decimal(300_000) },
          _count: 1,
        });
      mockPrisma.fundContribution.groupBy.mockResolvedValue([
        {
          miniIncomeType: 'TOURNAMENT_FEE',
          _sum: { amount: new Decimal(300_000) },
        },
      ]);

      const result = await service.summary('club-1');

      expect(result.mini.total).toBe(300_000);
      expect(result.mini.count).toBe(1);
      expect(mockPrisma.fundContribution.aggregate).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          where: { clubId: 'club-1', fundSource: 'MINI', isConfirmed: true },
        }),
      );
      expect(mockPrisma.fundContribution.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clubId: 'club-1', fundSource: 'MINI', isConfirmed: true },
        }),
      );
    });
  });

  describe('importBulk', () => {
    const members = [
      { id: 'mem-1', fullName: 'Nguyễn Văn A' },
      { id: 'mem-2', fullName: 'Trần Thị B' },
    ];
    const period = { id: 'period-1', clubId: 'club-1', name: 'Q1 2026' };

    it('should import matched rows and skip unmatched', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(period);
      mockPrisma.member.findMany.mockResolvedValue(members);
      mockPrisma.fundContribution.createMany.mockResolvedValue({ count: 1 });

      const result = await service.importBulk('club-1', 'user-1', {
        fundPeriodId: 'period-1',
        rows: [
          { memberName: 'Nguyễn Văn A', amount: 300000 },
          { memberName: 'Không Tồn Tại', amount: 200000 },
        ],
      });

      expect(result.imported).toBe(1);
      expect(result.total).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].memberName).toBe('Không Tồn Tại');
    });

    it('should match members case-insensitively with trimming', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(period);
      mockPrisma.member.findMany.mockResolvedValue(members);
      mockPrisma.fundContribution.createMany.mockResolvedValue({ count: 2 });

      const result = await service.importBulk('club-1', 'user-1', {
        fundPeriodId: 'period-1',
        rows: [
          { memberName: '  nguyễn văn a  ', amount: 300000 },
          { memberName: 'TRẦN THỊ B', amount: 300000 },
        ],
      });

      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should throw BadRequestException when fundPeriod does not belong to club', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(null);
      mockPrisma.member.findMany.mockResolvedValue(members);

      await expect(
        service.importBulk('club-2', 'user-1', {
          fundPeriodId: 'period-1',
          rows: [{ memberName: 'Nguyễn Văn A', amount: 300000 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not call createMany when all rows have errors', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(period);
      mockPrisma.member.findMany.mockResolvedValue(members);

      const result = await service.importBulk('club-1', 'user-1', {
        fundPeriodId: 'period-1',
        rows: [{ memberName: 'Không Ai', amount: 100000 }],
      });

      expect(result.imported).toBe(0);
      expect(mockPrisma.fundContribution.createMany).not.toHaveBeenCalled();
    });

    it('should use current date when paymentDate is not provided', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(period);
      mockPrisma.member.findMany.mockResolvedValue(members);
      mockPrisma.fundContribution.createMany.mockResolvedValue({ count: 1 });

      await service.importBulk('club-1', 'user-1', {
        fundPeriodId: 'period-1',
        rows: [{ memberName: 'Nguyễn Văn A', amount: 300000 }],
      });

      const callArg = mockPrisma.fundContribution.createMany.mock
        .calls[0][0] as {
        data: Array<{ paymentDate: Date }>;
      };
      expect(callArg.data[0].paymentDate).toBeInstanceOf(Date);
    });
  });

  /* ── business event (EPIC7) ── */
  describe('toggleConfirm → business event (EPIC7)', () => {
    it('phát CONTRIBUTION_CONFIRMED khi chuyển sang đã xác nhận', async () => {
      mockPrisma.fundContribution.findFirst.mockResolvedValue(baseContrib); // isConfirmed: false
      mockPrisma.fundContribution.update.mockResolvedValue({
        ...baseContrib,
        isConfirmed: true,
      });

      const result = await service.toggleConfirm('contrib-1', 'club-1');

      expect(result.isConfirmed).toBe(true);
      expect(mockEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          clubId: 'club-1',
          userId: 'user-1',
          triggerType: 'CONTRIBUTION_CONFIRMED',
          idempotencyKey: 'CONTRIBUTION_CONFIRMED:contrib-1',
        }),
      );
    });

    it('KHÔNG phát event khi bỏ xác nhận (unconfirm)', async () => {
      mockPrisma.fundContribution.findFirst.mockResolvedValue({
        ...baseContrib,
        isConfirmed: true,
      });
      mockPrisma.fundContribution.update.mockResolvedValue({
        ...baseContrib,
        isConfirmed: false,
      });

      await service.toggleConfirm('contrib-1', 'club-1');
      expect(mockEvents.publish).not.toHaveBeenCalled();
    });
  });
});
