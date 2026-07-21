/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { PrismaService } from '../prisma/prisma.service';
import { HermesEventPublisher } from '../workflows/hermes-event.publisher';
import { FinancialCalculatorService } from '../financial/financial-calculator.service';
import { Decimal } from '@prisma/client/runtime/library';

const mockCalculator = { invalidateClosingBalances: jest.fn() };

const mockPrisma = {
  livingExpense: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    count: jest.fn(),
  },
  // FK ownership validation (assertFkOwnership)
  fundPeriod: { findFirst: jest.fn() },
  attendanceSession: { findFirst: jest.fn() },
  expenseCategory: { findFirst: jest.fn() },
  minigame: { findFirst: jest.fn() },
};

const baseExpense = {
  id: 'exp-1',
  clubId: 'club-1',
  fundSource: 'COMMON' as const,
  fundPeriodId: 'period-1',
  allocationRule: 'EQUAL' as const,
  allocationEnabled: true,
  description: 'Tiền sân tháng 3',
  amount: new Decimal(500000),
  expenseDate: new Date('2026-03-15'),
  status: 'pending',
  receiptUrl: null,
  categoryId: null,
  miniExpenseType: null,
  receiverName: null,
  relatedMinigameId: null,
  attendanceSessionId: null,
  createdBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockEvents = { publish: jest.fn() };

describe('ExpensesService', () => {
  let service: ExpensesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: HermesEventPublisher, useValue: mockEvents },
        { provide: FinancialCalculatorService, useValue: mockCalculator },
      ],
    }).compile();
    service = module.get<ExpensesService>(ExpensesService);
    // Mặc định FK thuộc club (assertFkOwnership PASS); test cross-tenant override null.
    mockPrisma.fundPeriod.findFirst.mockResolvedValue({ id: 'period-1' });
    mockPrisma.attendanceSession.findFirst.mockResolvedValue({ id: 'sess-1' });
    mockPrisma.expenseCategory.findFirst.mockResolvedValue({ id: 'cat-1' });
    mockPrisma.minigame.findFirst.mockResolvedValue({ id: 'mg-1' });
  });

  /* ── findOne ── */
  describe('findOne', () => {
    it('returns expense when found in same club', async () => {
      mockPrisma.livingExpense.findFirst.mockResolvedValue(baseExpense);
      const result = await service.findOne('exp-1', 'club-1');
      expect(result.id).toBe('exp-1');
      expect(mockPrisma.livingExpense.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'exp-1', clubId: 'club-1' } }),
      );
    });

    it('throws NotFoundException for cross-tenant access', async () => {
      mockPrisma.livingExpense.findFirst.mockResolvedValue(null);
      await expect(
        service.findOne('exp-1', 'club-other'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  /* ── create ── */
  describe('create', () => {
    const validDto = {
      fundSource: 'COMMON' as const,
      fundPeriodId: 'period-1',
      allocationRule: 'EQUAL' as const,
      description: 'Tiền sân',
      amount: 500000,
      expenseDate: '2026-03-15',
    };

    it('creates expense with valid COMMON dto', async () => {
      mockPrisma.livingExpense.create.mockResolvedValue(baseExpense);
      const result = await service.create('club-1', 'user-1', validDto);
      expect(result.id).toBe('exp-1');
      expect(mockPrisma.livingExpense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clubId: 'club-1',
            fundPeriodId: 'period-1',
          }),
        }),
      );
    });

    it('throws BadRequestException when amount is 0', async () => {
      await expect(
        service.create('club-1', 'user-1', { ...validDto, amount: 0 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when amount is negative', async () => {
      await expect(
        service.create('club-1', 'user-1', { ...validDto, amount: -100 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException for COMMON without fundPeriodId', async () => {
      await expect(
        service.create('club-1', 'user-1', {
          ...validDto,
          fundPeriodId: undefined,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException for COMMON without allocationRule', async () => {
      await expect(
        service.create('club-1', 'user-1', {
          ...validDto,
          allocationRule: undefined,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects cross-club fundPeriod FK (multi-tenant isolation)', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(null); // kỳ quỹ CLB khác
      await expect(
        service.create('club-1', 'user-1', {
          ...validDto,
          fundPeriodId: 'period-of-other-club',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.livingExpense.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for MINI without miniExpenseType', async () => {
      await expect(
        service.create('club-1', 'user-1', {
          fundSource: 'MINI',
          description: 'Mini expense',
          amount: 100000,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    /* ── business event (EPIC7) ── */
    it('phát EXPENSE_RECORDED sau khi tạo thành công (EPIC7)', async () => {
      mockPrisma.livingExpense.create.mockResolvedValue(baseExpense);
      const result = await service.create('club-1', 'user-1', validDto);
      expect(result.id).toBe('exp-1');
      expect(mockEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          clubId: 'club-1',
          userId: 'user-1',
          triggerType: 'EXPENSE_RECORDED',
          idempotencyKey: 'EXPENSE_RECORDED:exp-1',
        }),
      );
    });

    it('Hermes dispatch lỗi KHÔNG rollback business (publisher thật, Hermes reject) (EPIC7)', async () => {
      const failingHermes = {
        dispatchTrigger: jest.fn().mockRejectedValue(new Error('HERMES_DOWN')),
      };
      const realPublisher = new HermesEventPublisher(failingHermes as never);
      const mod: TestingModule = await Test.createTestingModule({
        providers: [
          ExpensesService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: HermesEventPublisher, useValue: realPublisher },
          { provide: FinancialCalculatorService, useValue: mockCalculator },
        ],
      }).compile();
      const svc = mod.get<ExpensesService>(ExpensesService);
      mockPrisma.livingExpense.create.mockResolvedValue(baseExpense);

      // Business transaction vẫn thành công dù Hermes runtime chết.
      const result = await svc.create('club-1', 'user-1', validDto);
      expect(result.id).toBe('exp-1');

      // Flush fire-and-forget: dispatch đã được gọi và lỗi được nuốt (log-only).
      await new Promise((resolve) => setImmediate(resolve));
      expect(failingHermes.dispatchTrigger).toHaveBeenCalledTimes(1);
    });
  });

  /* ── updateStatus ── */
  describe('updateStatus', () => {
    it('approves a pending expense', async () => {
      mockPrisma.livingExpense.findFirst.mockResolvedValue(baseExpense);
      const approved = { ...baseExpense, status: 'approved' };
      mockPrisma.livingExpense.update.mockResolvedValue(approved);

      const result = await service.updateStatus('exp-1', 'club-1', 'approved');
      expect(result.status).toBe('approved');
      expect(mockPrisma.livingExpense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'exp-1', clubId: 'club-1' },
          data: { status: 'approved' },
        }),
      );
    });

    it('rejects a pending expense', async () => {
      mockPrisma.livingExpense.findFirst.mockResolvedValue(baseExpense);
      mockPrisma.livingExpense.update.mockResolvedValue({
        ...baseExpense,
        status: 'rejected',
      });

      const result = await service.updateStatus('exp-1', 'club-1', 'rejected');
      expect(result.status).toBe('rejected');
    });

    it('throws BadRequestException for invalid status', async () => {
      await expect(
        service.updateStatus('exp-1', 'club-1', 'invalid_status'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when expense belongs to different club', async () => {
      mockPrisma.livingExpense.findFirst.mockResolvedValue(null);
      await expect(
        service.updateStatus('exp-1', 'club-other', 'approved'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  /* ── delete ── */
  describe('delete', () => {
    it('deletes expense in same club', async () => {
      mockPrisma.livingExpense.findFirst.mockResolvedValue(baseExpense);
      mockPrisma.livingExpense.delete.mockResolvedValue(baseExpense);

      const result = await service.delete('exp-1', 'club-1');
      expect(result.id).toBe('exp-1');
      expect(mockPrisma.livingExpense.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'exp-1', clubId: 'club-1' } }),
      );
    });

    it('blocks cross-tenant delete', async () => {
      mockPrisma.livingExpense.findFirst.mockResolvedValue(null);
      await expect(
        service.delete('exp-1', 'club-other'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrisma.livingExpense.delete).not.toHaveBeenCalled();
    });
  });

  /* ── findAll ── */
  describe('findAll', () => {
    it('scopes query to clubId', async () => {
      mockPrisma.livingExpense.findMany.mockResolvedValue([baseExpense]);
      await service.findAll('club-1', 'period-1');
      expect(mockPrisma.livingExpense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clubId: 'club-1',
            fundPeriodId: 'period-1',
          }),
        }),
      );
    });

    it('returns all expenses when no fundPeriodId filter', async () => {
      mockPrisma.livingExpense.findMany.mockResolvedValue([baseExpense]);
      await service.findAll('club-1');
      const call = mockPrisma.livingExpense.findMany.mock.calls[0][0];
      expect(call.where).not.toHaveProperty('fundPeriodId');
    });

    it('returns a plain array (backward-compatible) when no page option', async () => {
      mockPrisma.livingExpense.findMany.mockResolvedValue([baseExpense]);
      const result = await service.findAll('club-1');
      expect(Array.isArray(result)).toBe(true);
      expect(mockPrisma.livingExpense.count).not.toHaveBeenCalled();
      // Không có skip/take khi không phân trang
      const call = mockPrisma.livingExpense.findMany.mock.calls[0][0];
      expect(call).not.toHaveProperty('skip');
      expect(call).not.toHaveProperty('take');
    });

    it('returns paginated shape { items, total, page, limit } when page provided', async () => {
      mockPrisma.livingExpense.findMany.mockResolvedValue([baseExpense]);
      mockPrisma.livingExpense.count.mockResolvedValue(42);
      const result = await service.findAll('club-1', undefined, undefined, {
        page: 2,
        limit: 10,
      });
      expect(result).toEqual({ items: [baseExpense], total: 42, page: 2, limit: 10 });
      const call = mockPrisma.livingExpense.findMany.mock.calls[0][0];
      expect(call.skip).toBe(10); // (2-1)*10
      expect(call.take).toBe(10);
      expect(mockPrisma.livingExpense.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clubId: 'club-1' }) }),
      );
    });

    it('applies status + search filters in where clause', async () => {
      mockPrisma.livingExpense.findMany.mockResolvedValue([baseExpense]);
      mockPrisma.livingExpense.count.mockResolvedValue(1);
      await service.findAll('club-1', undefined, undefined, {
        page: 1,
        status: 'approved',
        search: 'sân',
      });
      const where = mockPrisma.livingExpense.findMany.mock.calls[0][0].where;
      expect(where.status).toBe('approved');
      expect(where.OR).toEqual(
        expect.arrayContaining([
          { description: { contains: 'sân', mode: 'insensitive' } },
        ]),
      );
    });
  });

  describe('summary', () => {
    it('should count only approved or paid MINI expenses in mini totals', async () => {
      mockPrisma.livingExpense.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(0) }, _count: 0 })
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(0) }, _count: 0 })
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(0) }, _count: 0 })
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(0) }, _count: 0 })
        .mockResolvedValueOnce({
          _sum: { amount: new Decimal(200_000) },
          _count: 1,
        });
      mockPrisma.livingExpense.groupBy.mockResolvedValue([
        { miniExpenseType: 'PRIZE', _sum: { amount: new Decimal(200_000) } },
      ]);

      const result = await service.summary('club-1');

      expect(result.mini.total).toBe(200_000);
      expect(result.mini.count).toBe(1);
      expect(mockPrisma.livingExpense.aggregate).toHaveBeenNthCalledWith(
        5,
        expect.objectContaining({
          where: {
            clubId: 'club-1',
            fundSource: 'MINI',
            status: { in: ['approved', 'paid'] },
          },
        }),
      );
      expect(mockPrisma.livingExpense.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            clubId: 'club-1',
            fundSource: 'MINI',
            status: { in: ['approved', 'paid'] },
          },
        }),
      );
    });

    it('returns missingReceiptCount (count receiptUrl null)', async () => {
      mockPrisma.livingExpense.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(0) },
        _count: 0,
      });
      mockPrisma.livingExpense.groupBy.mockResolvedValue([]);
      mockPrisma.livingExpense.count.mockResolvedValue(7);

      const result = await service.summary('club-1');
      expect(result.missingReceiptCount).toBe(7);
      expect(mockPrisma.livingExpense.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clubId: 'club-1', receiptUrl: null }),
        }),
      );
    });

    it('returns statusCounts grouped by status (additive field)', async () => {
      mockPrisma.livingExpense.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(0) },
        _count: 0,
      });
      // 1st groupBy = miniByType, 2nd groupBy = statusGroups
      mockPrisma.livingExpense.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { status: 'pending', _count: 3 },
          { status: 'approved', _count: 5 },
          { status: 'paid', _count: 2 },
        ]);

      const result = await service.summary('club-1');

      expect(result.statusCounts).toEqual({
        pending: 3,
        approved: 5,
        paid: 2,
        rejected: 0,
      });
    });
  });

  describe('breakdown', () => {
    it('nhóm theo description, sort giảm dần, cắt top-N', async () => {
      mockPrisma.livingExpense.groupBy.mockResolvedValue([
        { description: 'Tiền sân', _sum: { amount: new Decimal(300) }, _count: 2 },
        { description: 'Nước uống', _sum: { amount: new Decimal(900) }, _count: 5 },
      ]);
      const result = await service.breakdown('club-1', 'period-1', 'ALL', 6);
      expect(result).toEqual([
        { name: 'Nước uống', value: 900, count: 5 },
        { name: 'Tiền sân', value: 300, count: 2 },
      ]);
      expect(mockPrisma.livingExpense.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['description'],
          where: expect.objectContaining({ clubId: 'club-1', fundPeriodId: 'period-1' }),
        }),
      );
    });
  });
});
