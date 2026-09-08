import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AccountNotifyService } from './account-notify.service';
import { EmailService } from '../email/email.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AccountNotifyService', () => {
  let service: AccountNotifyService;
  let email: { isEnabled: boolean; send: jest.Mock; buildNotifHtml: jest.Mock };
  let settings: { getAll: jest.Mock };
  let prisma: { user: { findMany: jest.Mock }; notification: { createMany: jest.Mock } };
  let config: { get: jest.Mock };

  const CFG = {
    emailNotifications: 'true',
    supportEmail: 'ops@clb.vn',
    superTelegramChatId: '',
  };

  beforeEach(async () => {
    email = {
      isEnabled: true,
      send: jest.fn().mockResolvedValue(true),
      buildNotifHtml: jest.fn((t: string, b: string) => `<${t}>${b}`),
    };
    settings = { getAll: jest.fn().mockResolvedValue({ ...CFG }) };
    prisma = {
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'super-1' }, { id: 'super-2' }]) },
      notification: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    config = { get: jest.fn().mockReturnValue(undefined) };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        AccountNotifyService,
        { provide: EmailService, useValue: email },
        { provide: SystemSettingsService, useValue: settings },
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = mod.get(AccountNotifyService);
  });

  const base = {
    email: 'new@user.vn',
    displayName: 'Anh A',
    username: 'anha',
    role: 'CLUB_ADMIN',
    clubName: 'CLB B32',
    clubId: 'club-1',
    source: 'register' as const,
  };

  it('email thật + toggle bật → welcome (tài khoản) + email báo super (supportEmail)', async () => {
    await service.onNewAccount(base);
    const recipients = email.send.mock.calls.map((c) => c[0]);
    expect(recipients).toContain('new@user.vn');
    expect(recipients).toContain('ops@clb.vn');
  });

  it('IN-APP: có clubId → tạo Notification cho MỌI SUPER_ADMIN', async () => {
    await service.onNewAccount(base);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: 'SUPER_ADMIN', isActive: true } }),
    );
    expect(prisma.notification.createMany).toHaveBeenCalledTimes(1);
    const rows = prisma.notification.createMany.mock.calls[0][0].data;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      userId: 'super-1',
      clubId: 'club-1',
      eventType: 'system_account_created',
      channel: 'IN_APP',
      status: 'SENT',
    });
  });

  it('IN-APP: KHÔNG có clubId → bỏ qua tạo Notification (email vẫn chạy)', async () => {
    await service.onNewAccount({ ...base, clubId: null });
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
    expect(email.send).toHaveBeenCalled();
  });

  it('TELEGRAM: có superTelegramChatId + bot token → gọi Telegram API', async () => {
    settings.getAll.mockResolvedValue({ ...CFG, superTelegramChatId: '99887766' });
    config.get.mockReturnValue('BOT_TOKEN');
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true } as Response);
    await service.onNewAccount(base);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/botBOT_TOKEN/sendMessage',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.chat_id).toBe('99887766');
    fetchMock.mockRestore();
  });

  it('TELEGRAM: chưa đặt chat ID → không gọi API', async () => {
    config.get.mockReturnValue('BOT_TOKEN');
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    await service.onNewAccount(base);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('SMTP tắt → vẫn tạo IN-APP + Telegram (email độc lập)', async () => {
    email.isEnabled = false;
    settings.getAll.mockResolvedValue({ ...CFG, superTelegramChatId: '123' });
    config.get.mockReturnValue('BOT_TOKEN');
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    await service.onNewAccount(base);
    expect(email.send).not.toHaveBeenCalled();
    expect(prisma.notification.createMany).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockRestore();
  });

  it('emailNotifications=false → không email báo super (in-app vẫn chạy)', async () => {
    settings.getAll.mockResolvedValue({ ...CFG, emailNotifications: 'false' });
    await service.onNewAccount(base);
    const recipients = email.send.mock.calls.map((c) => c[0]);
    expect(recipients).toEqual(['new@user.vn']); // chỉ welcome, không báo super qua email
    expect(prisma.notification.createMany).toHaveBeenCalledTimes(1); // in-app vẫn chạy
  });

  it('email placeholder nội bộ (@picklefund.vn) → không welcome, vẫn báo super', async () => {
    await service.onNewAccount({ ...base, email: 'anha@picklefund.vn' });
    const recipients = email.send.mock.calls.map((c) => c[0]);
    expect(recipients).not.toContain('anha@picklefund.vn');
    expect(recipients).toContain('ops@clb.vn');
  });

  it('một kênh lỗi → nuốt lỗi, KHÔNG throw, kênh khác vẫn chạy', async () => {
    prisma.notification.createMany.mockRejectedValue(new Error('DB down'));
    await expect(service.onNewAccount(base)).resolves.toBeUndefined();
    expect(email.send).toHaveBeenCalled(); // email vẫn chạy dù in-app lỗi
  });
});
