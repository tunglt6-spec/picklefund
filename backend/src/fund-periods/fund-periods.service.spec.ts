import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FundPeriodsService } from './fund-periods.service';
import { PrismaService } from '../prisma/prisma.service';
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
  },
  livingExpense: {
    aggregate: jest.fn(),
  },
  attendanceSession: {
    findMany: jest.fn(),
  },
  attendanceRecord: {
    groupBy: jest.fn(),
  },
  member: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn().mockResolvedValue([]),
};

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
        { provide: PrismaService, useValue: mockPrisma },
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
  });

  describe('summary', () => {
    it('should compute member rows using batch groupBy (no N+1)', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(basePeriod);
      mockPrisma.fundContribution.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(1000000) },
      });
      mockPrisma.livingExpense.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(200000) } })
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(100000) } });
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
});
