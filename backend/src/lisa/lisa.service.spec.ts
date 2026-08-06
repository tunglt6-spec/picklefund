import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { HermesService } from '../hermes/hermes.service';
import { AiUsageService } from '../ai-usage/ai-usage.service';
import { LisaService } from './lisa.service';

const mockPrisma = {
  member: { findMany: jest.fn(), findUnique: jest.fn() },
  fundPeriod: { findFirst: jest.fn() },
  fundContribution: { findMany: jest.fn() },
  attendanceSession: { findMany: jest.fn() },
  attendanceRecord: { count: jest.fn(), findMany: jest.fn() },
  notification: { findFirst: jest.fn() },
  livingExpense: { findMany: jest.fn() },
  lisaMessage: { create: jest.fn() },
};
const mockHermes = { dispatch: jest.fn() };
const mockConfig = { get: jest.fn().mockReturnValue(undefined) };
const mockAiUsage = { record: jest.fn() };

describe('LisaService', () => {
  let service: LisaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LisaService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: HermesService, useValue: mockHermes },
        { provide: AiUsageService, useValue: mockAiUsage },
      ],
    }).compile();
    service = module.get<LisaService>(LisaService);
  });

  /* ── H1: tài chính chỉ Quỹ Chung (COMMON) ── */
  describe('getMemberContext — finance COMMON only', () => {
    it('mọi query fundContribution đều lọc fundSource COMMON (không gộp Quỹ Phụ)', async () => {
      mockPrisma.member.findUnique.mockResolvedValue({
        id: 'm1',
        fullName: 'A',
        clubId: 'club-1',
        status: 'active',
        club: { id: 'club-1', name: 'CLB' },
      });
      mockPrisma.fundPeriod.findFirst.mockResolvedValue({
        id: 'p1',
        name: 'Q3',
        endDate: null,
      });
      mockPrisma.fundContribution.findMany.mockResolvedValue([]);
      mockPrisma.attendanceSession.findMany.mockResolvedValue([]);
      mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);
      mockPrisma.member.findMany.mockResolvedValue([]);
      mockPrisma.livingExpense.findMany.mockResolvedValue([]);

      await service.getMemberContext('m1');

      const calls = mockPrisma.fundContribution.findMany.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(2);
      for (const [arg] of calls) {
        expect(arg.where.fundSource).toBe('COMMON');
      }
    });
  });

  /* ── H2 / M6 / L3: dispatch reminders ── */
  describe('dispatchRemindersForClub', () => {
    const setupThreeUnpaidMembers = () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue({
        id: 'p1',
        name: 'Q3',
        endDate: null,
      });
      mockPrisma.member.findMany.mockResolvedValue([
        { id: 'm1', fullName: 'A', userId: 'u1' },
        { id: 'm2', fullName: 'B', userId: null }, // chưa có tài khoản
        { id: 'm3', fullName: 'C', userId: 'u3' },
      ]);
      mockPrisma.fundContribution.findMany.mockResolvedValue([]); // không ai đóng
      mockPrisma.attendanceSession.findMany.mockResolvedValue([]); // < 3 buổi → không inactivity
    };

    it('gửi đúng targetUserId, bỏ qua TV không có tài khoản + bản trùng, đếm số thực gửi', async () => {
      setupThreeUnpaidMembers();
      // u1: chưa nhắc → gửi; u3: đã có notif trong 7 ngày → bỏ qua.
      mockPrisma.notification.findFirst.mockImplementation(({ where }: any) =>
        Promise.resolve(where.userId === 'u3' ? { id: 'n-old' } : null),
      );
      mockHermes.dispatch.mockResolvedValue({ dispatched: 1 });

      const res = await service.dispatchRemindersForClub('club-1');

      expect(res).toEqual({ generated: 3, dispatched: 1, skipped: 2 });
      // Chỉ gửi cho u1, đúng targetUserId (không phải undefined).
      expect(mockHermes.dispatch).toHaveBeenCalledTimes(1);
      expect(mockHermes.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'payment_reminder',
          targetUserId: 'u1',
          clubId: 'club-1',
        }),
      );
    });

    it('không có kỳ quỹ đang mở → 0 reminder', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue(null);
      mockPrisma.member.findMany.mockResolvedValue([]);
      const res = await service.dispatchRemindersForClub('club-1');
      expect(res).toEqual({ generated: 0, dispatched: 0, skipped: 0 });
      expect(mockHermes.dispatch).not.toHaveBeenCalled();
    });
  });

  /* ── inactivity đếm PRESENT ── */
  describe('generateRemindersForClub — inactivity dùng PRESENT', () => {
    it('đếm buổi vắng qua status PRESENT + gắn userId', async () => {
      mockPrisma.fundPeriod.findFirst.mockResolvedValue({
        id: 'p1',
        name: 'Q3',
        endDate: null,
      });
      mockPrisma.member.findMany.mockResolvedValue([
        { id: 'm1', fullName: 'A', userId: 'u1' },
      ]);
      mockPrisma.fundContribution.findMany.mockResolvedValue([
        { memberId: 'm1' },
      ]); // đã đóng → không có payment reminder
      mockPrisma.attendanceSession.findMany.mockResolvedValue([
        { id: 's1' },
        { id: 's2' },
        { id: 's3' },
      ]);
      mockPrisma.attendanceRecord.count.mockResolvedValue(0); // vắng cả 3

      const reminders = await service.generateRemindersForClub('club-1');

      expect(mockPrisma.attendanceRecord.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PRESENT' }),
        }),
      );
      expect(reminders).toHaveLength(1);
      expect(reminders[0]).toEqual(
        expect.objectContaining({ type: 'inactivity', userId: 'u1' }),
      );
    });
  });
});
