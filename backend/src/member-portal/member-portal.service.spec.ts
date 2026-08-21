import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MemberPortalService } from './member-portal.service';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialCalculatorService } from '../financial/financial-calculator.service';
import { HermesService } from '../hermes/hermes.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const prisma = {
  member: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
  attendanceSession: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
  },
  sessionRegistration: {
    upsert: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  attendanceRecord: { upsert: jest.fn().mockResolvedValue({}) },
  fundPeriod: { findFirst: jest.fn().mockResolvedValue(null) },
  fundContribution: {
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
  },
  personalReceipt: { findMany: jest.fn().mockResolvedValue([]) },
  minigameParticipant: { findMany: jest.fn().mockResolvedValue([]) },
  notification: { findMany: jest.fn().mockResolvedValue([]) },
  payment: {
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ id: 'pay-new', amount: 500, status: 'PENDING' }),
  },
  systemSetting: { findMany: jest.fn().mockResolvedValue([]) },
};
const calculator = { calculate: jest.fn() };
const hermes = { dispatch: jest.fn().mockResolvedValue({ dispatched: 1 }) };
const audit = { log: jest.fn() };

const MEMBER_A = {
  id: 'mem-A',
  clubId: 'club-1',
  fullName: 'A',
  isDeleted: false,
};

describe('MemberPortalService', () => {
  let service: MemberPortalService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.attendanceSession.findMany.mockResolvedValue([]);
    prisma.attendanceSession.findFirst.mockResolvedValue(null);
    prisma.fundPeriod.findFirst.mockResolvedValue(null);
    prisma.fundContribution.findFirst.mockResolvedValue(null);
    prisma.fundContribution.findMany.mockResolvedValue([]);
    prisma.personalReceipt.findMany.mockResolvedValue([]);
    prisma.minigameParticipant.findMany.mockResolvedValue([]);
    prisma.notification.findMany.mockResolvedValue([]);
    prisma.fundContribution.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    prisma.payment.findFirst.mockResolvedValue(null);
    prisma.systemSetting.findMany.mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberPortalService,
        { provide: PrismaService, useValue: prisma },
        { provide: FinancialCalculatorService, useValue: calculator },
        { provide: HermesService, useValue: hermes },
        { provide: AuditLogsService, useValue: audit },
      ],
    }).compile();
    service = module.get<MemberPortalService>(MemberPortalService);
  });

  describe('assertMember / scope', () => {
    it('getMe throws Forbidden khi tài khoản chưa liên kết member (memberId null)', async () => {
      await expect(service.getMe(null, 'club-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('getMe throws NotFound khi member không thuộc club (truy cập chéo)', async () => {
      prisma.member.findFirst.mockResolvedValue(null); // không tìm thấy trong club
      await expect(service.getMe('mem-A', 'club-OTHER')).rejects.toThrow(
        NotFoundException,
      );
      // scope query PHẢI gồm cả clubId (không tin client)
      expect(prisma.member.findFirst).toHaveBeenCalledWith({
        where: { id: 'mem-A', clubId: 'club-OTHER', isDeleted: false },
      });
    });

    it('getMe trả đúng profile của chính member', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
      const r = await service.getMe('mem-A', 'club-1');
      expect(r.id).toBe('mem-A');
      expect(r.clubId).toBe('club-1');
    });
  });

  describe('getAttendance', () => {
    it('liệt kê session theo clubId + kỳ active; cờ present chỉ lấy record của CHÍNH member', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
      prisma.fundPeriod.findFirst.mockResolvedValue({ id: 'fp-1', name: 'Q1' });
      prisma.attendanceSession.findMany.mockResolvedValue([
        {
          id: 's1',
          sessionDate: new Date('2026-01-01'),
          courtName: 'A',
          startTime: '18:00',
          endTime: '20:00',
          status: 'completed',
          courtFee: 100,
          _count: { attendanceRecords: 4, registrations: 0 },
          attendanceRecords: [{ status: 'PRESENT' }],
          registrations: [],
        },
        {
          id: 's2',
          sessionDate: new Date('2026-01-02'),
          courtName: 'B',
          startTime: null,
          endTime: null,
          status: 'scheduled',
          courtFee: 100,
          _count: { attendanceRecords: 0, registrations: 0 },
          attendanceRecords: [],
          registrations: [],
        },
      ]);
      const r = await service.getAttendance('mem-A', 'club-1');
      // scope: club + kỳ active; presence chỉ đọc record của CHÍNH member (memberId filter)
      expect(prisma.attendanceSession.findMany).toHaveBeenCalledWith({
        where: { clubId: 'club-1', fundPeriodId: 'fp-1' },
        include: {
          _count: {
            select: {
              attendanceRecords: { where: { status: 'PRESENT' } },
              registrations: true,
            },
          },
          attendanceRecords: {
            where: { memberId: 'mem-A' },
            select: { status: true },
          },
          registrations: {
            where: { memberId: 'mem-A' },
            select: { id: true },
          },
        },
        orderBy: { sessionDate: 'asc' },
      });
      expect(r.attended).toBe(1);
      expect(r.totalCompleted).toBe(1);
      expect(r.upcoming).toBe(1);
      expect(r.sessions[0].present).toBe(true);
      expect(r.sessions[1].present).toBe(false);
    });
  });

  describe('getFinance', () => {
    it('chỉ trích member row của CHÍNH mình từ summary', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
      prisma.fundPeriod.findFirst.mockResolvedValue({
        id: 'fp-1',
        name: 'Q1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
        contributionAmount: 500,
      });
      prisma.fundContribution.findFirst.mockResolvedValue({
        amount: 500,
        isConfirmed: true,
        paymentDate: new Date('2026-01-05'),
      });
      calculator.calculate.mockResolvedValue({
        totalSessions: 5,
        commonFund: { totalCourt: 300, totalLiving: 200 },
        members: [
          { memberId: 'mem-A', totalCost: 100 },
          { memberId: 'mem-B', totalCost: 999 },
        ],
      });
      const r = await service.getFinance('mem-A', 'club-1');
      expect(r.member?.memberId).toBe('mem-A');
      expect(r.member?.totalCost).toBe(100); // KHÔNG lộ mem-B
      expect(r.contribution?.amount).toBe(500);
      expect(r.totals?.court).toBe(300);
      expect(r.totals?.memberCount).toBe(2);
      // khoản đóng góp phải scope theo memberId của CHÍNH mình
      expect(prisma.fundContribution.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            clubId: 'club-1',
            fundPeriodId: 'fp-1',
            memberId: 'mem-A',
            fundSource: 'COMMON',
          },
        }),
      );
    });

    it('không có kỳ active → member null, không crash', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
      prisma.fundPeriod.findFirst.mockResolvedValue(null);
      const r = await service.getFinance('mem-A', 'club-1');
      expect(r.period).toBeNull();
      expect(r.member).toBeNull();
      expect(calculator.calculate).not.toHaveBeenCalled();
    });
  });

  describe('getContributions', () => {
    it('scope theo memberId + clubId + fundSource COMMON; amount ép number', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
      prisma.fundContribution.findMany.mockResolvedValue([
        {
          id: 'c1',
          fundPeriodId: 'fp-1',
          amount: '500000',
          isConfirmed: true,
          paymentDate: new Date('2026-01-05'),
          paymentMethod: 'bank_transfer',
          fundPeriod: { id: 'fp-1', name: 'Q1' },
        },
      ]);
      const r = await service.getContributions('mem-A', 'club-1');
      expect(prisma.fundContribution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clubId: 'club-1', memberId: 'mem-A', fundSource: 'COMMON' },
        }),
      );
      expect(r[0].amount).toBe(500000); // number, không phải string
      expect(r[0].periodName).toBe('Q1');
    });
  });

  describe('getPersonalReceipts / getMinigames / getNotifications', () => {
    it('personal-receipt scope theo memberId + clubId', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
      await service.getPersonalReceipts('mem-A', 'club-1');
      expect(prisma.personalReceipt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { memberId: 'mem-A', clubId: 'club-1' },
        }),
      );
    });

    it('minigame scope theo memberId + minigame.clubId', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
      await service.getMinigames('mem-A', 'club-1');
      expect(prisma.minigameParticipant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { memberId: 'mem-A', minigame: { clubId: 'club-1' } },
        }),
      );
    });

    it('notifications scope theo userId + clubId (không phải memberId)', async () => {
      await service.getNotifications('user-A', 'club-1');
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-A', clubId: 'club-1' },
        }),
      );
    });
  });

  describe('selfRegister', () => {
    // status 'scheduled' + ngày tương lai để qua guard mới của selfRegister.
    const SESSION = { id: 's1', clubId: 'club-1', status: 'scheduled', sessionDate: new Date('2099-01-01'), startTime: '18:00', courtName: 'A' };

    it('memberId null → Forbidden', async () => {
      await expect(
        service.selfRegister(null, 'club-1', 's1', true),
      ).rejects.toThrow(ForbiddenException);
    });

    it('member stale/đã xóa/khác club → NotFound, KHÔNG chạm session (chống token stale)', async () => {
      prisma.member.findFirst.mockResolvedValue(null); // member không còn hợp lệ trong club
      await expect(
        service.selfRegister('mem-stale', 'club-1', 's1', true),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.attendanceSession.findFirst).not.toHaveBeenCalled();
      expect(prisma.sessionRegistration.upsert).not.toHaveBeenCalled();
    });

    it('session không thuộc club → NotFound (scope clubId)', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
      prisma.attendanceSession.findFirst.mockResolvedValue(null);
      await expect(
        service.selfRegister('mem-A', 'club-1', 's-other', true),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.attendanceSession.findFirst).toHaveBeenCalledWith({
        where: { id: 's-other', clubId: 'club-1' },
      });
    });

    it('register=true → upsert theo unique attendanceSessionId_memberId (idempotent)', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
      prisma.attendanceSession.findFirst.mockResolvedValue(SESSION);
      const r = await service.selfRegister('mem-A', 'club-1', 's1', true);
      expect(prisma.sessionRegistration.upsert).toHaveBeenCalledWith({
        where: {
          attendanceSessionId_memberId: {
            attendanceSessionId: 's1',
            memberId: 'mem-A',
          },
        },
        create: { clubId: 'club-1', attendanceSessionId: 's1', memberId: 'mem-A' },
        update: {},
      });
      expect(r).toEqual({ sessionId: 's1', registered: true });
    });

    it('guard: đăng ký buổi đã hủy → BadRequest, KHÔNG upsert', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
      prisma.attendanceSession.findFirst.mockResolvedValue({ ...SESSION, status: 'cancelled' });
      await expect(service.selfRegister('mem-A', 'club-1', 's1', true)).rejects.toThrow();
      expect(prisma.sessionRegistration.upsert).not.toHaveBeenCalled();
    });

    it('guard: đăng ký buổi đã qua ngày → BadRequest', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
      prisma.attendanceSession.findFirst.mockResolvedValue({ ...SESSION, sessionDate: new Date('2000-01-01') });
      await expect(service.selfRegister('mem-A', 'club-1', 's1', true)).rejects.toThrow();
      expect(prisma.sessionRegistration.upsert).not.toHaveBeenCalled();
    });

    it('register=false → deleteMany scope club+session+member', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
      prisma.attendanceSession.findFirst.mockResolvedValue(SESSION);
      const r = await service.selfRegister('mem-A', 'club-1', 's1', false);
      expect(prisma.sessionRegistration.deleteMany).toHaveBeenCalledWith({
        where: { clubId: 'club-1', attendanceSessionId: 's1', memberId: 'mem-A' },
      });
      expect(r).toEqual({ sessionId: 's1', registered: false });
    });
  });

  describe('selfCheckin', () => {
    it('memberId null → Forbidden', async () => {
      await expect(service.selfCheckin(null, 'club-1', 's1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('member stale/đã xóa/khác club → NotFound, KHÔNG chạm session (chống token stale)', async () => {
      prisma.member.findFirst.mockResolvedValue(null);
      await expect(
        service.selfCheckin('mem-stale', 'club-1', 's1'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.attendanceSession.findFirst).not.toHaveBeenCalled();
      expect(prisma.attendanceRecord.upsert).not.toHaveBeenCalled();
    });

    it('session không tồn tại trong club → NotFound', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
      prisma.attendanceSession.findFirst.mockResolvedValue(null);
      await expect(
        service.selfCheckin('mem-A', 'club-1', 's1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('upsert PRESENT idempotent theo unique attendanceSessionId_memberId', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
      prisma.attendanceSession.findFirst.mockResolvedValue({
        id: 's1',
        clubId: 'club-1',
      });
      const r = await service.selfCheckin('mem-A', 'club-1', 's1');
      expect(prisma.attendanceRecord.upsert).toHaveBeenCalledWith({
        where: {
          attendanceSessionId_memberId: {
            attendanceSessionId: 's1',
            memberId: 'mem-A',
          },
        },
        create: {
          attendanceSessionId: 's1',
          memberId: 'mem-A',
          clubId: 'club-1',
          status: 'PRESENT',
        },
        update: { status: 'PRESENT' },
      });
      expect(r).toEqual({ sessionId: 's1', checkedIn: true });
    });
  });

  describe('reportPayment (Báo đã nộp quỹ)', () => {
    const PERIOD = { id: 'fp-1', name: 'Q1', contributionAmount: 500 };

    it('memberId null → Forbidden', async () => {
      await expect(
        service.reportPayment(null, 'club-1', { amount: 500 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('tạo báo nộp PENDING (reportedByMember) — KHÔNG BAO GIỜ tự CONFIRMED', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
      prisma.fundPeriod.findFirst.mockResolvedValue(PERIOD);
      prisma.payment.findFirst.mockResolvedValue(null); // chưa có báo PENDING
      prisma.payment.create.mockResolvedValue({ id: 'pay-1', amount: 500, status: 'PENDING' });

      const r = await service.reportPayment('mem-A', 'club-1', { amount: 500, note: 'CK 20h' });

      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clubId: 'club-1',
            memberId: 'mem-A',
            reportedByMember: true,
            status: 'PENDING',
            referenceType: 'CONTRIBUTION',
            referenceId: 'fp-1',
          }),
        }),
      );
      expect(r.status).toBe('PENDING');
      expect(r.status).not.toBe('CONFIRMED');
      // Thông báo cho Admin/Treasurer
      expect(hermes.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'payment_reported', clubId: 'club-1' }),
      );
    });

    it('idempotent: đã có báo PENDING cho cùng kỳ → trả lại bản cũ, KHÔNG tạo trùng', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
      prisma.fundPeriod.findFirst.mockResolvedValue(PERIOD);
      prisma.payment.findFirst.mockResolvedValue({ id: 'pay-existing', amount: 500, status: 'PENDING' });

      const r = await service.reportPayment('mem-A', 'club-1', { amount: 500 });

      expect(r).toEqual(expect.objectContaining({ id: 'pay-existing', duplicate: true }));
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });
  });
});
