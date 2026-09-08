import { Test, TestingModule } from '@nestjs/testing';
import { AccountNotifyService } from './account-notify.service';
import { EmailService } from '../email/email.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';

describe('AccountNotifyService', () => {
  let service: AccountNotifyService;
  let email: { isEnabled: boolean; send: jest.Mock; buildNotifHtml: jest.Mock };
  let settings: { getAll: jest.Mock };

  beforeEach(async () => {
    email = {
      isEnabled: true,
      send: jest.fn().mockResolvedValue(true),
      buildNotifHtml: jest.fn((t: string, b: string) => `<${t}>${b}`),
    };
    settings = {
      getAll: jest
        .fn()
        .mockResolvedValue({ emailNotifications: 'true', supportEmail: 'ops@clb.vn' }),
    };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        AccountNotifyService,
        { provide: EmailService, useValue: email },
        { provide: SystemSettingsService, useValue: settings },
      ],
    }).compile();
    service = mod.get(AccountNotifyService);
  });

  it('SMTP tắt → không gửi gì, không lỗi', async () => {
    email.isEnabled = false;
    await service.onNewAccount({
      email: 'new@user.vn',
      displayName: 'Anh A',
      username: 'anha',
      role: 'CLUB_ADMIN',
      source: 'register',
    });
    expect(email.send).not.toHaveBeenCalled();
  });

  it('email thật + toggle bật → gửi CẢ welcome (tài khoản) LẪN báo super (supportEmail)', async () => {
    await service.onNewAccount({
      email: 'new@user.vn',
      displayName: 'Anh A',
      username: 'anha',
      role: 'CLUB_ADMIN',
      clubName: 'CLB B32',
      source: 'register',
    });
    const recipients = email.send.mock.calls.map((c) => c[0]);
    expect(recipients).toContain('new@user.vn'); // welcome
    expect(recipients).toContain('ops@clb.vn'); // báo super
    expect(email.send).toHaveBeenCalledTimes(2);
  });

  it('email placeholder nội bộ (@picklefund.vn) → KHÔNG gửi welcome, VẪN báo super', async () => {
    await service.onNewAccount({
      email: 'anha@picklefund.vn',
      displayName: 'Anh A',
      username: 'anha',
      role: 'CLUB_ADMIN',
      source: 'register',
    });
    const recipients = email.send.mock.calls.map((c) => c[0]);
    expect(recipients).not.toContain('anha@picklefund.vn');
    expect(recipients).toEqual(['ops@clb.vn']);
  });

  it('emailNotifications=false → KHÔNG báo super (chỉ welcome cho tài khoản thật)', async () => {
    settings.getAll.mockResolvedValue({
      emailNotifications: 'false',
      supportEmail: 'ops@clb.vn',
    });
    await service.onNewAccount({
      email: 'new@user.vn',
      displayName: 'Anh A',
      username: 'anha',
      role: 'CLUB_ADMIN',
      source: 'super-user',
    });
    const recipients = email.send.mock.calls.map((c) => c[0]);
    expect(recipients).toEqual(['new@user.vn']);
  });

  it('email.send lỗi → nuốt lỗi, KHÔNG throw', async () => {
    email.send.mockRejectedValue(new Error('SMTP down'));
    await expect(
      service.onNewAccount({
        email: 'new@user.vn',
        displayName: 'Anh A',
        username: 'anha',
        role: 'CLUB_ADMIN',
        source: 'register',
      }),
    ).resolves.toBeUndefined();
  });
});
