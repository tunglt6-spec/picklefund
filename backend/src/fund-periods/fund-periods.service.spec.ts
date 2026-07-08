import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FundPeriodsService } from './fund-periods.service';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialCalculatorService } from '../financial/financial-calculator.service';
import { HermesEventPublisher } from '../workflows/hermes-event.publisher';
import { Decimal } from '@prisma/client/runtime/library';

const mockPrisma = {
  fundPeriod: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateMany: jest.fn(),
  },
  fundContribution: {
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    deleteMany: jest.fn(),
  },
  livingExpense: {
    aggregate: jest.fn(),
    groupBy: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn(),
  },
  attendanceSession: {
    findMany: jest.fn(),
    aggregate: jest.fn(),
    deleteMany: jest.fn(),
  },
  attendanceRecord: {
    groupBy: jest.fn(),
    deleteMany: jest.fn(),
  },
  member: {
    findMany: jest.fn(),
  },
  personalReceipt: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  fundPeriodMember: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn().mockResolvedValue([]),
};

const mockEvents = { publish: jest.fn() };

const basePeriod = {
  id: 'period-1',
  clubId: 'club-1',
  name: 'Q1 2026',
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-03-31'),
  contributionAmount: new Decimal(500000),
  totalSessions: 0,
  status: 'active',
  notes: null,
  finalizedAt: null,
  createdById: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('FundPeriodsService', () => {
  let service: FundPeriodsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundPeriodsService,
        FinancialCalculatorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: HermesEventPublisher, useValue: mockEvents },
      ],
    }).compile();

    service = module.get<FundPeriodsService>(FundPeriodsService);
  });

  describe('findAll', () => {
    it('should return list of fund periods', async () => {
      mockPrisma.fundPeriod.findMany.mockResolvedValue([basePeriod]);

      const result = await service.findAll('club-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Q1 2026');
    });
  });

  describe('findOne', () => {
    it('should return the fund period when found', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(basePeriod);

      const result = await service.findOne('period-1', 'club-1');

      expect(result.id).toBe('period-1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing', 'club-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    // Bug thật gặp trên production: prisma.fundPeriod.delete() trực tiếp vi phạm
    // khóa ngoại (attendanceRecord/livingExpense/fundContribution/personalReceipt
    // KHÔNG có onDelete:Cascade) → 500 Internal Server Error nếu kỳ có bất kỳ
    // dữ liệu con nào. Fix: xóa hết dữ liệu con trong $transaction trước khi xóa kỳ.
    it('xóa dữ liệu con theo đúng thứ tự trong 1 transaction rồi mới xóa kỳ quỹ', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(basePeriod);
      mockPrisma.$transaction.mockImplementationOnce(async (ops: unknown[]) => ops);

      const result = await service.delete('period-1', 'club-1');

      expect(mockPrisma.attendanceRecord.deleteMany).toHaveBeenCalledWith({
        where: { attendanceSession: { fundPeriodId: 'period-1' } },
      });
      expect(mockPrisma.livingExpense.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { fundPeriodId: 'period-1' },
            { attendanceSession: { fundPeriodId: 'period-1' } },
          ],
        },
      });
      expect(mockPrisma.attendanceSession.deleteMany).toHaveBeenCalledWith({
        where: { fundPeriodId: 'period-1' },
      });
      expect(mockPrisma.fundContribution.deleteMany).toHaveBeenCalledWith({
        where: { fundPeriodId: 'period-1' },
      });
      expect(mockPrisma.personalReceipt.deleteMany).toHaveBeenCalledWith({
        where: { fundPeriodId: 'period-1' },
      });
      expect(mockPrisma.fundPeriod.delete).toHaveBeenCalledWith({
        where: { id: 'period-1', clubId: 'club-1' },
      });
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ deleted: true });
    });

    it('chặn xóa kỳ đã chốt (finalized), KHÔNG chạm tới dữ liệu con', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue({
        ...basePeriod,
        status: 'finalized',
      });

      await expect(service.delete('period-1', 'club-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.fundPeriod.delete).not.toHaveBeenCalled();
    });

    it('throw NotFoundException nếu kỳ quỹ không tồn tại/khác club', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(null);

      await expect(service.delete('missing', 'club-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const validDto = {
      name: 'Q2 2026',
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      contributionAmount: 600000,
      totalSessions: 20,
    };

    it('should create a fund period with valid data', async () => {
      mockPrisma.fundPeriod.create.mockResolvedValue({
        ...basePeriod,
        name: 'Q2 2026',
      });

      const result = await service.create('club-1', 'user-1', validDto);

      expect(mockPrisma.fundPeriod.create).toHaveBeenCalled();
      expect(result.name).toBe('Q2 2026');
    });

    it('should throw BadRequestException when endDate <= startDate', async () => {
      const badDto = {
        ...validDto,
        endDate: '2026-03-31',
        startDate: '2026-06-30',
      };

      await expect(service.create('club-1', 'user-1', badDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should not open a transaction when copyMembersFromPreviousPeriod is false/omitted', async () => {
      mockPrisma.fundPeriod.create.mockResolvedValue({ ...basePeriod });
      const result = await service.create('club-1', 'user-1', validDto);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(result.copiedMembersCount).toBe(0);
    });
  });

  describe('create — FUND-IMPL-01 copy members from previous period', () => {
    const gameDto = {
      name: 'Giải Hè 2026',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      contributionAmount: 200000,
      type: 'game',
      copyMembersFromPreviousPeriod: true,
    };
    const newPeriod = {
      ...basePeriod,
      id: 'period-new',
      type: 'game',
      contributionAmount: new Decimal(200000),
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-31'),
    };
    const prevPeriod = {
      ...basePeriod,
      id: 'period-prev',
      type: 'game',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-04-30'),
    };

    beforeEach(() => {
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: typeof mockPrisma) => Promise<unknown>) =>
          cb(mockPrisma),
      );
      mockPrisma.fundPeriod.create.mockResolvedValue(newPeriod);
    });

    it('copies active members roster from nearest previous period of same type', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(prevPeriod);
      mockPrisma.fundPeriodMember.findMany.mockResolvedValue([
        { memberId: 'mem-1' },
        { memberId: 'mem-2' },
      ]);
      mockPrisma.member.findMany.mockResolvedValue([
        { id: 'mem-1' },
        { id: 'mem-2' },
      ]);
      mockPrisma.fundPeriodMember.createMany.mockResolvedValue({ count: 2 });

      const result = await service.create('club-1', 'user-1', gameDto);

      expect(mockPrisma.fundPeriod.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clubId: 'club-1', type: 'game' }),
        }),
      );
      expect(mockPrisma.fundPeriodMember.createMany).toHaveBeenCalledWith({
        data: [
          {
            clubId: 'club-1',
            fundPeriodId: 'period-new',
            memberId: 'mem-1',
            expectedAmount: newPeriod.contributionAmount,
          },
          {
            clubId: 'club-1',
            fundPeriodId: 'period-new',
            memberId: 'mem-2',
            expectedAmount: newPeriod.contributionAmount,
          },
        ],
        skipDuplicates: true,
      });
      expect(result.copiedMembersCount).toBe(2);
    });

    it('excludes members that are no longer active (inactive/left)', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(prevPeriod);
      mockPrisma.fundPeriodMember.findMany.mockResolvedValue([
        { memberId: 'mem-1' },
        { memberId: 'mem-2' },
      ]);
      // Chỉ mem-1 còn active — member.findMany filter status:'active' đã loại mem-2.
      mockPrisma.member.findMany.mockResolvedValue([{ id: 'mem-1' }]);
      mockPrisma.fundPeriodMember.createMany.mockResolvedValue({ count: 1 });

      const result = await service.create('club-1', 'user-1', gameDto);

      expect(mockPrisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'active',
            isDeleted: false,
          }),
        }),
      );
      expect(result.copiedMembersCount).toBe(1);
    });

    it('creates the period without members when there is no previous period', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(null);

      const result = await service.create('club-1', 'user-1', gameDto);

      expect(mockPrisma.fundPeriodMember.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.fundPeriodMember.createMany).not.toHaveBeenCalled();
      expect(result.copiedMembersCount).toBe(0);
    });

    it('creates the period without members when previous period has an empty roster', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(prevPeriod);
      mockPrisma.fundPeriodMember.findMany.mockResolvedValue([]);

      const result = await service.create('club-1', 'user-1', gameDto);

      expect(mockPrisma.member.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.fundPeriodMember.createMany).not.toHaveBeenCalled();
      expect(result.copiedMembersCount).toBe(0);
    });

    it('rolls back (rejects) the whole transaction when the copy step fails', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(prevPeriod);
      mockPrisma.fundPeriodMember.findMany.mockResolvedValue([
        { memberId: 'mem-1' },
      ]);
      mockPrisma.member.findMany.mockResolvedValue([{ id: 'mem-1' }]);
      mockPrisma.fundPeriodMember.createMany.mockRejectedValue(
        new Error('DB_FAIL_COPY'),
      );

      await expect(service.create('club-1', 'user-1', gameDto)).rejects.toThrow(
        'DB_FAIL_COPY',
      );
    });
  });

  describe('previousPeriodInfo', () => {
    it('returns null when club has no period of the given type', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(null);
      const result = await service.previousPeriodInfo('club-1', 'game');
      expect(result).toBeNull();
      expect(mockPrisma.fundPeriodMember.count).not.toHaveBeenCalled();
    });

    it('returns period info with member count when found', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue({
        id: 'period-prev',
        name: 'Giải Xuân 2026',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
      });
      mockPrisma.fundPeriodMember.count.mockResolvedValue(13);

      const result = await service.previousPeriodInfo('club-1', 'game');

      expect(result).toEqual({
        id: 'period-prev',
        name: 'Giải Xuân 2026',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
        memberCount: 13,
      });
    });
  });

  describe('summary', () => {
    it('should compute member rows using batch groupBy (no N+1)', async () => {
      // findOne() → basePeriod; carryForward previous period lookup → null (no previous)
      mockPrisma.fundPeriod.findFirst
        .mockResolvedValueOnce(basePeriod)
        .mockResolvedValueOnce(null);
      // income: COMMON confirmed, MINI confirmed
      mockPrisma.fundContribution.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(1000000) } })
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(0) } });
      // court fee from sessions
      mockPrisma.attendanceSession.aggregate.mockResolvedValue({
        _sum: { courtFee: new Decimal(450000) },
      });
      // COMMON expenses phân loại theo allocationRule (calculator dùng groupBy);
      // MINI expense qua aggregate (1 lần).
      mockPrisma.livingExpense.groupBy.mockResolvedValue([
        { allocationRule: 'ATTENDANCE', _sum: { amount: new Decimal(200000) } },
      ]);
      mockPrisma.livingExpense.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(100000) },
      }); // MINI
      mockPrisma.attendanceSession.findMany.mockResolvedValue([
        { id: 'sess-1', _count: { attendanceRecords: 3 } },
        { id: 'sess-2', _count: { attendanceRecords: 2 } },
      ]);
      mockPrisma.member.findMany.mockResolvedValue([
        { id: 'mem-1', fullName: 'Alice' },
        { id: 'mem-2', fullName: 'Bob' },
      ]);
      mockPrisma.attendanceRecord.groupBy.mockResolvedValue([
        { memberId: 'mem-1', _count: { id: 4 } },
        { memberId: 'mem-2', _count: { id: 1 } },
      ]);
      mockPrisma.fundContribution.groupBy.mockResolvedValue([
        { memberId: 'mem-1', _sum: { amount: new Decimal(600000) } },
      ]);

      const result = await service.summary('period-1', 'club-1');

      // Verify groupBy called exactly once each (batch, not per-member)
      expect(mockPrisma.attendanceRecord.groupBy).toHaveBeenCalledTimes(1);
      expect(mockPrisma.fundContribution.groupBy).toHaveBeenCalledTimes(1);

      expect(result.members).toHaveLength(2);
      expect(result.members[0].memberName).toBe('Alice');
      expect(result.members[0].attendedSessions).toBe(4);
      // Bob has no paid contributions → balance negative
      expect(result.members[1].amountPaid).toBe(0);
    });
  });

  /* ── business event (EPIC7) ── */
  describe('updateStatus → business event (EPIC7)', () => {
    it('phát FUND_PERIOD_CLOSED khi chốt sổ (finalized)', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(basePeriod);
      mockPrisma.fundPeriod.update.mockResolvedValue({
        ...basePeriod,
        status: 'finalized',
      });

      await service.updateStatus('period-1', 'club-1', 'finalized');

      expect(mockEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          clubId: 'club-1',
          userId: 'user-1',
          triggerType: 'FUND_PERIOD_CLOSED',
          idempotencyKey: 'FUND_PERIOD_CLOSED:period-1',
        }),
      );
    });

    it('KHÔNG phát event với status khác finalized', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(basePeriod);
      mockPrisma.fundPeriod.update.mockResolvedValue({
        ...basePeriod,
        status: 'active',
      });

      await service.updateStatus('period-1', 'club-1', 'active');
      expect(mockEvents.publish).not.toHaveBeenCalled();
    });
  });
});
