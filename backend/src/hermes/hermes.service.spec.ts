/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  send: jest.fn().mockResolvedValue(true),
  buildNotifHtml: jest.fn().mockReturnValue('<html/>'),
};

const mockConfig = {
  get: jest.fn().mockReturnValue('test-bot-token'),
};

// Giờ hiện tại KHÔNG rơi vào quiet-hours mặc định (23–7). Test dùng pref quiet 0..0 (tắt).
const NO_QUIET = { quietHoursStart: 0, quietHoursEnd: 0 };

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
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get<HermesService>(HermesService);
    // fetch mock cho Telegram (Node global)
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
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

  /* ── dispatch: multi-channel ── */
  describe('dispatch (multi-channel)', () => {
    // HIGH event → CLUB_ADMIN nhận qua các kênh đã bật. payment_confirmed = LOW (chỉ IN_APP).
    const HIGH_EVENT = {
      clubId: 'club-1',
      eventType: 'anomaly_alert' as const,
      title: 'Cảnh báo bất thường',
      body: 'Phát hiện giao dịch bất thường',
    };

    /** Set up 1 recipient (admin) với pref channels cho trước; quota rộng; telegram đã link. */
    const setupPref = (channels: string[], extra: Record<string, unknown> = {}) => {
      mockPrisma.user.findMany.mockResolvedValue([baseUser]);
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        userId: 'user-1',
        channels,
        preferredChannel: channels[0] ?? 'IN_APP',
        telegramChatId: 'tg-123',
        enabled: true,
        maxDailyEmail: 5,
        maxDailyTelegram: 5,
        ...NO_QUIET,
        ...extra,
      });
      mockPrisma.notification.create.mockResolvedValue(baseNotif);
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'admin@test.vn' });
      mockPrisma.notification.count.mockResolvedValue(0);
    };

    const notifChannels = () =>
      mockPrisma.notification.create.mock.calls.map(
        (c: any) => c[0].data.channel,
      );

    it('IN_APP only → 1 notif IN_APP, không email, không telegram', async () => {
      setupPref(['IN_APP']);
      await service.dispatch(HIGH_EVENT);
      expect(notifChannels()).toEqual(['IN_APP']);
      expect(mockEmail.send).not.toHaveBeenCalled();
      expect((global as any).fetch).not.toHaveBeenCalled();
    });

    it('EMAIL → notif EMAIL + email.send, không telegram', async () => {
      setupPref(['EMAIL']);
      await service.dispatch(HIGH_EVENT);
      expect(notifChannels()).toEqual(['EMAIL']);
      expect(mockEmail.send).toHaveBeenCalledTimes(1);
      expect((global as any).fetch).not.toHaveBeenCalled();
    });

    it('TELEGRAM → notif TELEGRAM + fetch Telegram API, không email', async () => {
      setupPref(['TELEGRAM']);
      await service.dispatch(HIGH_EVENT);
      expect(notifChannels()).toEqual(['TELEGRAM']);
      expect((global as any).fetch).toHaveBeenCalledTimes(1);
      expect(mockEmail.send).not.toHaveBeenCalled();
    });

    it('IN_APP + EMAIL → 2 notif, email gửi', async () => {
      setupPref(['IN_APP', 'EMAIL']);
      await service.dispatch(HIGH_EVENT);
      expect(notifChannels().sort()).toEqual(['EMAIL', 'IN_APP']);
      expect(mockEmail.send).toHaveBeenCalledTimes(1);
    });

    it('IN_APP + TELEGRAM → 2 notif, telegram gửi', async () => {
      setupPref(['IN_APP', 'TELEGRAM']);
      await service.dispatch(HIGH_EVENT);
      expect(notifChannels().sort()).toEqual(['IN_APP', 'TELEGRAM']);
      expect((global as any).fetch).toHaveBeenCalledTimes(1);
    });

    it('EMAIL + TELEGRAM → 2 notif, cả email và telegram', async () => {
      setupPref(['EMAIL', 'TELEGRAM']);
      await service.dispatch(HIGH_EVENT);
      expect(notifChannels().sort()).toEqual(['EMAIL', 'TELEGRAM']);
      expect(mockEmail.send).toHaveBeenCalledTimes(1);
      expect((global as any).fetch).toHaveBeenCalledTimes(1);
    });

    it('cả 3 kênh → 3 notif, email + telegram', async () => {
      setupPref(['IN_APP', 'EMAIL', 'TELEGRAM']);
      await service.dispatch(HIGH_EVENT);
      expect(notifChannels().sort()).toEqual(['EMAIL', 'IN_APP', 'TELEGRAM']);
      expect(mockEmail.send).toHaveBeenCalledTimes(1);
      expect((global as any).fetch).toHaveBeenCalledTimes(1);
    });

    it('KHÔNG chọn kênh (channels=[]) → fallback IN_APP, không im lặng', async () => {
      setupPref([], { preferredChannel: 'IN_APP' });
      await service.dispatch(HIGH_EVENT);
      expect(notifChannels()).toEqual(['IN_APP']);
    });

    it('enabled=false → không gửi kênh nào', async () => {
      setupPref(['IN_APP', 'EMAIL'], { enabled: false });
      const r = await service.dispatch(HIGH_EVENT);
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
      expect(r.dispatched).toBe(0);
    });

    it('1 channel fail KHÔNG làm fail channel còn lại', async () => {
      setupPref(['IN_APP', 'EMAIL', 'TELEGRAM']);
      mockEmail.send.mockRejectedValueOnce(new Error('SMTP down'));
      await service.dispatch(HIGH_EVENT);
      // Cả 3 record vẫn được tạo; telegram vẫn gửi dù email lỗi.
      expect(notifChannels().sort()).toEqual(['EMAIL', 'IN_APP', 'TELEGRAM']);
      expect((global as any).fetch).toHaveBeenCalledTimes(1);
    });

    it('email.send() trả false (SMTP nuốt lỗi, không throw) → vẫn log/xử lý như FAILED, không chặn telegram', async () => {
      setupPref(['EMAIL', 'TELEGRAM']);
      mockEmail.send.mockResolvedValueOnce(false);
      const r = await service.dispatch(HIGH_EVENT);
      // notif EMAIL vẫn được tạo trước khi gửi thất bại; TELEGRAM không bị ảnh hưởng.
      expect(notifChannels().sort()).toEqual(['EMAIL', 'TELEGRAM']);
      expect((global as any).fetch).toHaveBeenCalledTimes(1);
      expect(r.dispatched).toBe(1); // user vẫn tính "delivered" vì telegram thành công
    });

    it('quota EMAIL đầy → bỏ EMAIL, giữ IN_APP + TELEGRAM (quota per-channel độc lập)', async () => {
      setupPref(['IN_APP', 'EMAIL', 'TELEGRAM']);
      // count trả cao cho EMAIL (>= maxDailyEmail 5), thấp cho các kênh khác.
      mockPrisma.notification.count.mockImplementation((args: any) =>
        Promise.resolve(args.where.channel === 'EMAIL' ? 5 : 0),
      );
      await service.dispatch(HIGH_EVENT);
      expect(notifChannels().sort()).toEqual(['IN_APP', 'TELEGRAM']);
      expect(mockEmail.send).not.toHaveBeenCalled();
    });

    it('quiet hours → chỉ IN_APP dù bật EMAIL/TELEGRAM (giữ nguyên nghiệp vụ)', async () => {
      const hour = new Date().getHours();
      setupPref(['IN_APP', 'EMAIL', 'TELEGRAM'], {
        quietHoursStart: hour,
        quietHoursEnd: (hour + 1) % 24,
      });
      await service.dispatch(HIGH_EVENT);
      expect(notifChannels()).toEqual(['IN_APP']);
      expect(mockEmail.send).not.toHaveBeenCalled();
    });

    it('MIGRATION dữ liệu cũ: channels rỗng, preferredChannel=EMAIL → gửi EMAIL', async () => {
      setupPref([], { preferredChannel: 'EMAIL' });
      await service.dispatch(HIGH_EVENT);
      expect(notifChannels()).toEqual(['EMAIL']);
      expect(mockEmail.send).toHaveBeenCalledTimes(1);
    });

    it('MEDIUM/LOW priority → chỉ IN_APP (anti-fatigue, không đổi)', async () => {
      setupPref(['IN_APP', 'EMAIL', 'TELEGRAM']);
      await service.dispatch({
        clubId: 'club-1',
        eventType: 'payment_confirmed', // LOW
        title: 'Xác nhận',
        body: 'ok',
      });
      expect(notifChannels()).toEqual(['IN_APP']);
      expect(mockEmail.send).not.toHaveBeenCalled();
    });

    it('pref null (chưa có record) → mặc định IN_APP', async () => {
      mockPrisma.user.findMany.mockResolvedValue([baseUser]);
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue(baseNotif);
      await service.dispatch(HIGH_EVENT);
      expect(notifChannels()).toEqual(['IN_APP']);
    });
  });

  /* ── updatePreferences: multi-channel + backward-compat ── */
  describe('updatePreferences', () => {
    it('lưu channels + đồng bộ preferredChannel = channels[0]', async () => {
      mockPrisma.notificationPreference.upsert.mockResolvedValue({});
      await service.updatePreferences('user-1', {
        channels: ['IN_APP', 'EMAIL'],
      });
      const arg = mockPrisma.notificationPreference.upsert.mock.calls[0][0];
      expect(arg.update.channels).toEqual(['IN_APP', 'EMAIL']);
      expect(arg.update.preferredChannel).toBe('IN_APP');
    });

    it('khử trùng lặp + loại kênh ngoài whitelist', async () => {
      mockPrisma.notificationPreference.upsert.mockResolvedValue({});
      await service.updatePreferences('user-1', {
        channels: ['EMAIL', 'EMAIL', 'HACK' as any, 'TELEGRAM'],
      });
      const arg = mockPrisma.notificationPreference.upsert.mock.calls[0][0];
      expect(arg.update.channels).toEqual(['EMAIL', 'TELEGRAM']);
    });

    it('client cũ chỉ gửi preferredChannel → suy channels', async () => {
      mockPrisma.notificationPreference.upsert.mockResolvedValue({});
      await service.updatePreferences('user-1', { preferredChannel: 'EMAIL' });
      const arg = mockPrisma.notificationPreference.upsert.mock.calls[0][0];
      expect(arg.update.channels).toEqual(['EMAIL']);
    });

    it('bỏ chọn hết (channels=[]) → lưu rỗng, preferredChannel đồng bộ về IN_APP', async () => {
      mockPrisma.notificationPreference.upsert.mockResolvedValue({});
      await service.updatePreferences('user-1', { channels: [] });
      const arg = mockPrisma.notificationPreference.upsert.mock.calls[0][0];
      expect(arg.update.channels).toEqual([]);
      expect(arg.update.preferredChannel).toBe('IN_APP');
    });

    it('không đụng tới channels khi chỉ đổi quietHours (partial update)', async () => {
      mockPrisma.notificationPreference.upsert.mockResolvedValue({});
      await service.updatePreferences('user-1', { quietHoursStart: 22 });
      const arg = mockPrisma.notificationPreference.upsert.mock.calls[0][0];
      expect(arg.update).not.toHaveProperty('channels');
      expect(arg.update).not.toHaveProperty('preferredChannel');
      expect(arg.update.quietHoursStart).toBe(22);
    });
  });
});
