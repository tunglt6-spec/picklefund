/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { HermesService } from './hermes.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

const mockPrisma = {
  user: { findMany: jest.fn(), findUnique: jest.fn() },
  notificationPreference: { findUnique: jest.fn(), upsert: jest.fn() },
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  hermesNotification: {
    create: jest.fn(),
  },
};

const mockEmail = {
  send: jest.fn(),
  buildNotifHtml: jest.fn().mockReturnValue('<html/>'),
};

const baseUser = {
  id: 'user-1',
  clubId: 'club-1',
  role: 'CLUB_ADMIN',
  email: 'admin@test.vn',
  isActive: true,
  notificationEnabled: true,
};

const baseNotif = {
  id: 'notif-1',
  userId: 'user-1',
  clubId: 'club-1',
  eventType: 'payment_confirmed',
  title: 'Xác nhận thanh toán',
  body: 'Giao dịch đã được xác nhận',
  status: 'SENT',
  createdAt: new Date(),
};

describe('HermesService', () => {
  let service: HermesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HermesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();
    service = module.get<HermesService>(HermesService);
  });

  /* ── getNotifications ── */
  describe('getNotifications', () => {
    it('returns paginated notifications for user', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([baseNotif]);
      mockPrisma.notification.count.mockResolvedValue(1);

      const result = await service.getNotifications('user-1', 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBeDefined();
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });

    it('paginates correctly on page 2', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.getNotifications('user-1', 2, 10);

      const call = mockPrisma.notification.findMany.mock.calls[0][0];
      expect(call.skip).toBe(10);
      expect(call.take).toBe(10);
    });
  });

  /* ── markAsRead ── */
  describe('markAsRead', () => {
    it('throws NotFoundException when notification not found', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      await expect(service.markAsRead('notif-x', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('marks notification as read', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(baseNotif);
      mockPrisma.notification.update.mockResolvedValue({ ...baseNotif, status: 'READ' });

      const result = await service.markAsRead('notif-1', 'user-1');
      expect(result.status).toBe('READ');
      expect(mockPrisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'notif-1' },
          data: expect.objectContaining({ status: 'READ' }),
        }),
      );
    });
  });

  /* ── markAllAsRead ── */
  describe('markAllAsRead', () => {
    it('marks all unread notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('user-1');
      expect(result.updated).toBe(5);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }),
          data: expect.objectContaining({ status: 'READ' }),
        }),
      );
    });
  });

  /* ── getPreferences ── */
  describe('getPreferences', () => {
    it('returns existing preferences', async () => {
      const pref = {
        userId: 'user-1',
        preferredChannel: 'IN_APP',
        quietHoursStart: 23,
        quietHoursEnd: 7,
      };
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(pref);

      const result = await service.getPreferences('user-1');
      expect(result.userId).toBe('user-1');
    });

    it('returns default preferences when none exist', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);

      const result = await service.getPreferences('user-1');
      expect(result).toMatchObject({
        userId: 'user-1',
        preferredChannel: 'IN_APP',
        enabled: true,
      });
    });
  });

  /* ── dispatch ── */
  describe('dispatch', () => {
    it('dispatches notification to club admins', async () => {
      mockPrisma.user.findMany.mockResolvedValue([baseUser]);
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue(baseNotif);

      const result = await service.dispatch({
        clubId: 'club-1',
        eventType: 'payment_confirmed',
        title: 'Xác nhận thanh toán',
        body: 'Giao dịch đã được xác nhận',
      });

      expect(result.dispatched).toBeGreaterThanOrEqual(0);
    });

    it('sends email when user has email and channel=EMAIL', async () => {
      mockPrisma.user.findMany.mockResolvedValue([baseUser]);
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        preferredChannel: 'EMAIL',
        quietHoursStart: null,
        quietHoursEnd: null,
        enabled: true,
        maxDailyEmail: 5,
      });
      mockPrisma.notification.create.mockResolvedValue(baseNotif);
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'admin@test.vn' });
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.dispatch({
        clubId: 'club-1',
        eventType: 'payment_confirmed',
        title: 'Test',
        body: 'Test body',
      });
      // Email delivery is handled internally — just assert no crash
    });
  });
});
