import { BadRequestException } from '@nestjs/common';
import { PlanRenewalReminderService, monthsElapsed } from './plan-renewal-reminder.service';
import { buildVietQrPayload, crc16 } from './platform-qr';

describe('monthsElapsed', () => {
  it('đếm tháng trọn kể từ ngày mở, kẹp cuối tháng', () => {
    expect(monthsElapsed(new Date(2026, 0, 15), new Date(2026, 1, 14))).toBe(0);
    expect(monthsElapsed(new Date(2026, 0, 15), new Date(2026, 1, 15))).toBe(1);
    expect(monthsElapsed(new Date(2026, 0, 31), new Date(2026, 1, 28))).toBe(1);
    expect(monthsElapsed(new Date(2026, 0, 10), new Date(2026, 9, 11))).toBe(9);
  });
});

describe('platform-qr', () => {
  it('CRC16 chuẩn + payload TPB hợp lệ, ngân hàng lạ → null', () => {
    expect(crc16('123456789')).toBe('29B1');
    const p = buildVietQrPayload({ code: 'TPB', account: '00584047001', name: 'X' }, 99000, 'GIA HAN B32 PRO 1T')!;
    expect(p).toContain('0006970423');
    expect(p.slice(-4)).toBe(crc16(p.slice(0, -4)));
    expect(buildVietQrPayload({ code: 'ZZZ', account: '123456', name: 'X' }, 1, '')).toBeNull();
  });
});

describe('PlanRenewalReminderService.run', () => {
  const now = new Date();
  const monthsAgo = (m: number) => { const d = new Date(now); d.setMonth(d.getMonth() - m); d.setDate(Math.max(1, d.getDate() - 1)); return d; };
  const mk = (clubs: any[], dup = false, settings: Record<string, string> = {}) => {
    const rows = Object.entries({ renewal_reminder_enabled: 'true', renewal_reminder_cadence: 'BOTH', platform_bank_code: 'ZZZ', platform_bank_account_number: '123456', platform_bank_account_name: 'SA', ...settings }).map(([key, value]) => ({ key, value }));
    const prisma: any = {
      systemSetting: { findMany: jest.fn().mockResolvedValue(rows) },
      club: { findMany: jest.fn().mockResolvedValue(clubs) },
      notification: { findFirst: jest.fn().mockResolvedValue(dup ? { id: 'n' } : null), create: jest.fn() },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'u1', email: 'a@b.com', notificationEnabled: true, notificationPref: null }]) },
    };
    const email: any = { isEnabled: false, send: jest.fn() };
    const config: any = { get: jest.fn().mockReturnValue('') };
    return { svc: new PlanRenewalReminderService(prisma, email, config), prisma };
  };
  const soon = new Date(Date.now() + 10 * 86400000);
  const club = (over: any = {}) => ({ id: 'c1', name: 'CLB A', code: 'A', plan: 'PRO', planExpiresAt: soon, createdAt: monthsAgo(3), ...over });

  it('chưa cấu hình tài khoản nhận → 400', async () => {
    const { svc } = mk([club()], false, { platform_bank_code: '' });
    await expect(svc.run()).rejects.toBeInstanceOf(BadRequestException);
  });

  it('tròn quý + gói sắp hết hạn → nhắc 3 tháng, ghi chuông cho Admin', async () => {
    const { svc, prisma } = mk([club()]);
    const r = await svc.run();
    expect(r.reminded).toBe(1);
    const data = prisma.notification.create.mock.calls[0][0].data;
    expect(data.eventType).toBe('plan_renewal_reminder');
    expect(data.metadata).toMatchObject({ periodKey: 'M3', months: 3, amount: 297000 });
    expect(data.body).toContain('Số tài khoản: 123456');
  });

  it('đã nhắc mốc này / gói còn lâu / chưa đủ tháng → bỏ qua', async () => {
    expect((await mk([club()], true).svc.run()).reminded).toBe(0);
    expect((await mk([club({ planExpiresAt: new Date(Date.now() + 200 * 86400000) })]).svc.run()).reminded).toBe(0);
    expect((await mk([club({ createdAt: new Date() })]).svc.run()).reminded).toBe(0);
  });

  it('cadence QUARTER: tháng thứ 2 không nhắc', async () => {
    const { svc } = mk([club({ createdAt: monthsAgo(2) })], false, { renewal_reminder_cadence: 'QUARTER' });
    expect((await svc.run()).reminded).toBe(0);
  });
});
