/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

const mockPrisma = {
  livingExpense: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
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

describe('ExpensesService', () => {
  let service: ExpensesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ExpensesService>(ExpensesService);
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
      await expect(service.findOne('exp-1', 'club-other')).rejects.toBeInstanceOf(NotFoundException);
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
          data: expect.objectContaining({ clubId: 'club-1', fundPeriodId: 'period-1' }),
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
        service.create('club-1', 'user-1', { ...validDto, fundPeriodId: undefined }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException for COMMON without allocationRule', async () => {
      await expect(
        service.create('club-1', 'user-1', { ...validDto, allocationRule: undefined }),
      ).rejects.toBeInstanceOf(BadRequestException);
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
        expect.objectContaining({ where: { id: 'exp-1', clubId: 'club-1' }, data: { status: 'approved' } }),
      );
    });

    it('rejects a pending expense', async () => {
      mockPrisma.livingExpense.findFirst.mockResolvedValue(baseExpense);
      mockPrisma.livingExpense.update.mockResolvedValue({ ...baseExpense, status: 'rejected' });

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
      await expect(service.delete('exp-1', 'club-other')).rejects.toBeInstanceOf(NotFoundException);
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
          where: expect.objectContaining({ clubId: 'club-1', fundPeriodId: 'period-1' }),
        }),
      );
    });

    it('returns all expenses when no fundPeriodId filter', async () => {
      mockPrisma.livingExpense.findMany.mockResolvedValue([baseExpense]);
      await service.findAll('club-1');
      const call = mockPrisma.livingExpense.findMany.mock.calls[0][0];
      expect(call.where).not.toHaveProperty('fundPeriodId');
    });
  });
});
