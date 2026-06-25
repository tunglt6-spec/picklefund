/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

const mockPrisma = {
  attendanceSession: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  fundPeriod: { findFirst: jest.fn() },
  member: { findMany: jest.fn() },
  attendanceRecord: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    updateMany: jest.fn(),
  },
};

const baseSession = {
  id: 'session-1',
  clubId: 'club-1',
  fundPeriodId: 'period-1',
  sessionDate: new Date('2026-03-10'),
  startTime: '08:00',
  endTime: '10:00',
  courtName: 'Sân A',
  courtFee: new Decimal(300000),
  status: 'scheduled',
  notes: null,
  createdById: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { attendanceRecords: 0 },
};

describe('AttendanceService', () => {
  let service: AttendanceService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<AttendanceService>(AttendanceService);
  });

  /* ── create ── */
  describe('create', () => {
    const validDto = {
      fundPeriodId: 'period-1',
      sessionDate: '2026-03-10',
      startTime: '08:00',
      endTime: '10:00',
      courtName: 'Sân A',
      courtFee: 300000,
    };

    beforeEach(() => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue({
        id: 'period-1',
        clubId: 'club-1',
        status: 'active',
      });
      mockPrisma.attendanceSession.create.mockResolvedValue(baseSession);
    });

    it('creates session with valid dto', async () => {
      const result = await service.create('club-1', 'user-1', validDto);
      expect(result.id).toBe('session-1');
      expect(mockPrisma.attendanceSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clubId: 'club-1', fundPeriodId: 'period-1' }),
        }),
      );
    });

    it('throws BadRequestException when fundPeriodId is empty', async () => {
      await expect(
        service.create('club-1', 'user-1', { ...validDto, fundPeriodId: '' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.attendanceSession.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when courtFee is 0', async () => {
      await expect(
        service.create('club-1', 'user-1', { ...validDto, courtFee: 0 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when courtFee is negative', async () => {
      await expect(
        service.create('club-1', 'user-1', { ...validDto, courtFee: -1000 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when fundPeriod not found in club', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(null);
      await expect(
        service.create('club-1', 'user-1', validDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('blocks cross-tenant: fundPeriod from another club is not found', async () => {
      // fundPeriod.findFirst scoped by clubId returns null
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(null);
      await expect(
        service.create('club-other', 'user-1', validDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  /* ── findAll ── */
  describe('findAll', () => {
    it('scopes query to clubId', async () => {
      mockPrisma.attendanceSession.findMany.mockResolvedValue([baseSession]);
      await service.findAll('club-1', 'period-1');
      expect(mockPrisma.attendanceSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clubId: 'club-1', fundPeriodId: 'period-1' }),
        }),
      );
    });

    it('returns all sessions when no period filter', async () => {
      mockPrisma.attendanceSession.findMany.mockResolvedValue([baseSession]);
      await service.findAll('club-1');
      const call = mockPrisma.attendanceSession.findMany.mock.calls[0][0];
      expect(call.where.fundPeriodId).toBeUndefined();
    });
  });

  /* ── findOne ── */
  describe('findOne', () => {
    it('returns session in same club', async () => {
      mockPrisma.attendanceSession.findFirst.mockResolvedValue(baseSession);
      const result = await service.findOne('session-1', 'club-1');
      expect(result.id).toBe('session-1');
    });

    it('throws NotFoundException for cross-tenant access', async () => {
      mockPrisma.attendanceSession.findFirst.mockResolvedValue(null);
      await expect(service.findOne('session-1', 'club-other')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  /* ── getMemberSummary — fallback for unlinked sessions ── */
  describe('getMemberSummary', () => {
    it('falls back to unlinked sessions (fundPeriodId="") when period has no sessions', async () => {
      mockPrisma.member.findMany.mockResolvedValue([
        { id: 'mem-1', fullName: 'Nguyễn A', clubId: 'club-1', isDeleted: false },
      ]);
      // First query (with exact period) returns empty
      mockPrisma.attendanceSession.findMany
        .mockResolvedValueOnce([])
        // Fallback query (fundPeriodId: '') returns unlinked sessions
        .mockResolvedValueOnce([{ id: 'session-1' }]);
      mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);

      const result = await service.getMemberSummary('club-1', 'period-1');

      expect(mockPrisma.attendanceSession.findMany).toHaveBeenCalledTimes(2);
      const fallbackCall = mockPrisma.attendanceSession.findMany.mock.calls[1][0];
      expect(fallbackCall.where.fundPeriodId).toBe('');
      expect(result[0].totalSessions).toBe(1);
    });

    it('returns zero attendance for members with no records', async () => {
      mockPrisma.member.findMany.mockResolvedValue([
        { id: 'mem-1', fullName: 'Nguyễn A', clubId: 'club-1', isDeleted: false },
      ]);
      mockPrisma.attendanceSession.findMany.mockResolvedValue([{ id: 'session-1' }]);
      mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);

      const result = await service.getMemberSummary('club-1', 'period-1');
      expect(result[0].attendedSessions).toBe(0);
      expect(result[0].totalSessions).toBe(1);
    });
  });
});
