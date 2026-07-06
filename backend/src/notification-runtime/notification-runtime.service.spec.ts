/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { NotificationRuntimeService } from './notification-runtime.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

const prisma = {
  notificationJob: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  notification: { create: jest.fn() },
  user: { findFirst: jest.fn(), findMany: jest.fn() },
  member: { findFirst: jest.fn() },
  club: { findUnique: jest.fn() },
};

const email = {
  isEnabled: false,
  send: jest.fn(),
  buildNotifHtml: jest.fn().mockReturnValue('<html></html>'),
};

async function makeService(): Promise<NotificationRuntimeService> {
  const mod: TestingModule = await Test.createTestingModule({
    providers: [
      NotificationRuntimeService,
      { provide: PrismaService, useValue: prisma },
      { provide: EmailService, useValue: email },
    ],
  }).compile();
  return mod.get(NotificationRuntimeService);
}

describe('NotificationRuntimeService (EPIC8)', () => {
  let service: NotificationRuntimeService;

  beforeEach(async () => {
    jest.clearAllMocks();
    email.isEnabled = false;
    let createdRow: Record<string, unknown> = {};
    prisma.notificationJob.findMany.mockResolvedValue([]);
    prisma.notificationJob.findFirst.mockResolvedValue(null);
    prisma.club.findUnique.mockResolvedValue(null);
    prisma.user.findMany.mockResolvedValue([]);
    prisma.member.findFirst.mockResolvedValue(null);
    // create lưu row; update merge row (mô phỏng Prisma trả full row sau update).
    prisma.notificationJob.create.mockImplementation(
      (arg: { data: Record<string, unknown> }) => {
        createdRow = { id: 'job-1', ...arg.data };
        return Promise.resolve(createdRow);
      },
    );
    prisma.notificationJob.update.mockImplementation(
      (arg: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...createdRow, ...arg.data }),
    );
    service = await makeService();
  });

  describe('tenant isolation', () => {
    it('Forbidden khi không có clubId', async () => {
      await expect(service.listJobs(null)).rejects.toThrow(ForbiddenException);
      await expect(
        service.dispatch(null, { channel: 'IN_APP', title: 'x' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('listJobs scope theo clubId từ JWT', async () => {
      await service.listJobs('club-1');
      expect(prisma.notificationJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clubId: 'club-1' } }),
      );
    });

    it('IN_APP target khác club → DRY_RUN, KHÔNG tạo notification (chặn cross-club)', async () => {
      prisma.user.findFirst.mockResolvedValue(null); // user không thuộc club
      const job = (await service.dispatch('club-1', {
        channel: 'IN_APP',
        targetId: 'user-other-club',
        title: 'Test',
      })) as Record<string, unknown>;
      expect(job.status).toBe('DRY_RUN');
      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-other-club', clubId: 'club-1' },
        }),
      );
    });
  });

  describe('job creation + adapters', () => {
    it('IN_APP target hợp lệ → tạo record notification có sẵn, job READY + sentAt', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      prisma.notification.create.mockResolvedValue({ id: 'n1' });
      const job = (await service.dispatch('club-1', {
        channel: 'IN_APP',
        targetId: 'u1',
        title: 'Nhắc nợ',
        bodySummary: 'Bạn còn 1 khoản chưa đóng',
      })) as Record<string, unknown>;
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u1',
            clubId: 'club-1',
            channel: 'IN_APP',
          }),
        }),
      );
      expect(job.status).toBe('READY');
      expect(job.sentAt).toBeInstanceOf(Date);
    });

    it('EMAIL khi SMTP chưa cấu hình → DRY_RUN, KHÔNG gọi send', async () => {
      email.isEnabled = false;
      const job = (await service.dispatch('club-1', {
        channel: 'EMAIL',
        targetId: 'u1',
        title: 'Báo cáo kỳ',
      })) as Record<string, unknown>;
      expect(job.status).toBe('DRY_RUN');
      expect(email.send).not.toHaveBeenCalled();
    });

    it('EMAIL khi SMTP sẵn sàng + target CÙNG club → gửi qua EmailService, job READY', async () => {
      email.isEnabled = true;
      email.send.mockResolvedValue(true);
      prisma.user.findFirst.mockResolvedValue({ email: 'a@b.vn' });
      const job = (await service.dispatch('club-1', {
        channel: 'EMAIL',
        targetId: 'u1',
        title: 'Báo cáo kỳ',
      })) as Record<string, unknown>;
      // Lookup PHẢI scope theo clubId (POLISH-001).
      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1', clubId: 'club-1' } }),
      );
      expect(email.send).toHaveBeenCalledTimes(1);
      expect(job.status).toBe('READY');
    });

    it('EMAIL targetType=MEMBER → gửi tới Member.email (email Liên hệ), scope clubId', async () => {
      email.isEnabled = true;
      email.send.mockResolvedValue(true);
      prisma.member.findFirst.mockResolvedValue({
        email: 'lienhe@real.vn',
        user: { email: 'account@real.vn' },
      });
      const job = (await service.dispatch('club-1', {
        channel: 'EMAIL',
        targetType: 'MEMBER',
        targetId: 'member-1',
        title: 'Nhắc lịch tập',
      })) as Record<string, unknown>;
      // Lookup member scope clubId (chống cross-club).
      expect(prisma.member.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'member-1', clubId: 'club-1', isDeleted: false },
        }),
      );
      expect(job.status).toBe('READY');
      // Ưu tiên Member.email (Liên hệ), KHÔNG dùng email tài khoản.
      expect(email.send).toHaveBeenCalledWith(
        'lienhe@real.vn',
        'Nhắc lịch tập',
        expect.any(String),
        expect.any(Object),
      );
    });

    it('EMAIL targetType=MEMBER: Member.email trống → fallback email tài khoản', async () => {
      email.isEnabled = true;
      email.send.mockResolvedValue(true);
      prisma.member.findFirst.mockResolvedValue({
        email: null,
        user: { email: 'account@real.vn' },
      });
      const job = (await service.dispatch('club-1', {
        channel: 'EMAIL',
        targetType: 'MEMBER',
        targetId: 'member-1',
        title: 'Nhắc',
      })) as Record<string, unknown>;
      expect(job.status).toBe('READY');
      expect(email.send).toHaveBeenCalledWith(
        'account@real.vn',
        'Nhắc',
        expect.any(String),
        expect.any(Object),
      );
    });

    it('EMAIL "mang danh" CLB: recipient=member, Reply-To=email admin CLB, fromName=tên CLB', async () => {
      email.isEnabled = true;
      email.send.mockResolvedValue(true);
      // target recipient (findFirst) là MEMBER; admin sender (findMany) tách riêng.
      prisma.user.findFirst.mockResolvedValue({ email: 'member@real.vn' });
      prisma.user.findMany.mockResolvedValue([
        { email: 'super@theping.vn', role: 'SUPER_ADMIN' },
        { email: 'admin@theping.vn', role: 'CLUB_ADMIN' },
      ]);
      prisma.club.findUnique.mockResolvedValue({ name: 'THE PING' });
      const job = (await service.dispatch('club-1', {
        channel: 'EMAIL',
        targetId: 'u1',
        title: 'Nhắc lịch tập',
      })) as Record<string, unknown>;
      expect(job.status).toBe('READY');
      // Gửi tới MEMBER; Reply-To ưu tiên CLB_ADMIN (không phải SUPER_ADMIN dù xuất hiện trước).
      expect(email.send).toHaveBeenCalledWith(
        'member@real.vn',
        'Nhắc lịch tập',
        expect.any(String),
        { replyTo: 'admin@theping.vn', fromName: 'THE PING' },
      );
    });

    it('EMAIL tới địa chỉ placeholder .local → DRY_RUN, KHÔNG gọi send (chặn bounce)', async () => {
      email.isEnabled = true;
      email.send.mockResolvedValue(true);
      prisma.user.findFirst.mockResolvedValue({
        email: 'mrshang2@8bc6bf8f.picklefund.local',
      });
      const job = (await service.dispatch('club-1', {
        channel: 'EMAIL',
        targetId: 'u1',
        title: 'Nhắc đóng quỹ',
      })) as Record<string, unknown>;
      expect(job.status).toBe('DRY_RUN');
      expect(email.send).not.toHaveBeenCalled();
    });

    it('EMAIL target KHÁC club → DRY_RUN, KHÔNG gọi send, không tiết lộ user tồn tại (POLISH-001)', async () => {
      email.isEnabled = true;
      // findFirst scope clubId → null dù user tồn tại ở club khác.
      prisma.user.findFirst.mockResolvedValue(null);
      const job = (await service.dispatch('club-1', {
        channel: 'EMAIL',
        targetId: 'user-club-khac',
        title: 'Báo cáo kỳ',
      })) as Record<string, unknown>;
      expect(job.status).toBe('DRY_RUN');
      expect(email.send).not.toHaveBeenCalled();
      // Response không tiết lộ target có tồn tại ở club khác hay không:
      // không errorMessage, không note phân biệt "not found" vs "khác club".
      expect(job.errorMessage ?? null).toBeNull();
      expect(JSON.stringify(job)).not.toMatch(/tồn tại|not found|khác club/i);
    });

    it('TELEGRAM → luôn DRY_RUN (chưa bật gửi thật trong foundation)', async () => {
      const job = (await service.dispatch('club-1', {
        channel: 'TELEGRAM',
        targetId: 'u1',
        title: 'Ping',
      })) as Record<string, unknown>;
      expect(job.status).toBe('DRY_RUN');
    });

    it('channel không hỗ trợ → trả null có kiểm soát, không throw', async () => {
      const r = await service.dispatch('club-1', {
        channel: 'SMOKE_SIGNAL',
        title: 'x',
      });
      expect(r).toBeNull();
      expect(prisma.notificationJob.create).not.toHaveBeenCalled();
    });
  });

  describe('sanitization', () => {
    it('response KHÔNG có payloadJson thô — chỉ payloadSummary metadata', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      prisma.notification.create.mockResolvedValue({ id: 'n1' });
      const job = (await service.dispatch('club-1', {
        channel: 'IN_APP',
        targetId: 'u1',
        title: 'Test',
        payload: { secretToken: 'LEAK_VALUE', memberIds: ['m1'] },
      })) as Record<string, unknown>;
      expect('payloadJson' in job).toBe(false);
      const sum = job.payloadSummary as { fieldNames: string[] };
      expect(sum.fieldNames.sort()).toEqual(['memberIds', 'secretToken']);
      expect(JSON.stringify(job)).not.toContain('LEAK_VALUE');
    });

    it('adapter lỗi → job FAILED với errorMessage generic, dispatch KHÔNG throw', async () => {
      prisma.user.findFirst.mockRejectedValue(
        new Error('DB_SECRET_CONNECTION_STRING'),
      );
      const job = (await service.dispatch('club-1', {
        channel: 'IN_APP',
        targetId: 'u1',
        title: 'Test',
      })) as Record<string, unknown>;
      expect(job.status).toBe('FAILED');
      expect(job.errorMessage).toBe('Gửi thông báo thất bại. Xem log máy chủ.');
      expect(String(job.errorMessage)).not.toContain('DB_SECRET');
    });
  });

  describe('idempotency', () => {
    it('idempotencyKey đã dùng → trả job cũ (duplicate), KHÔNG tạo/gửi lại', async () => {
      prisma.notificationJob.findFirst.mockResolvedValue({
        id: 'job-old',
        clubId: 'club-1',
        status: 'READY',
        payloadJson: { x: 1 },
      });
      const r = (await service.dispatch('club-1', {
        channel: 'IN_APP',
        targetId: 'u1',
        title: 'Test',
        idempotencyKey: 'AI_ACTION:act-1',
      })) as Record<string, unknown>;
      expect(r.duplicate).toBe(true);
      expect(r.id).toBe('job-old');
      expect(prisma.notificationJob.create).not.toHaveBeenCalled();
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('channelStatus trả trạng thái READY/DRY_RUN theo hạ tầng', () => {
      const s = service.channelStatus();
      expect(s.IN_APP.mode).toBe('READY');
      expect(s.EMAIL.mode).toBe('DRY_RUN'); // SMTP off trong test
      expect(s.TELEGRAM.mode).toBe('DRY_RUN');
    });
  });
});
