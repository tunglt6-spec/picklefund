import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BillingManualService, addMonths } from './billing-manual.service';

describe('addMonths', () => {
  it('giữ ngày, kẹp cuối tháng ngắn', () => {
    expect(addMonths(new Date(2026, 0, 31), 1).getDate()).toBe(28);
    expect(addMonths(new Date(2026, 0, 31), 1).getMonth()).toBe(1);
    expect(addMonths(new Date(2026, 9, 8), 12).getFullYear()).toBe(2027);
    expect(addMonths(new Date(2026, 10, 15), 3).getMonth()).toBe(1);
  });
});

describe('BillingManualService.record', () => {
  const build = (club: any, dup: any = null) => {
    const tx = {
      paymentOrder: { create: jest.fn().mockImplementation(async ({ data }) => ({ id: 'o1', ...data })) },
      club: { update: jest.fn() }, subscription: { upsert: jest.fn() }, invoice: { create: jest.fn() },
    };
    const prisma: any = {
      club: { findUnique: jest.fn().mockResolvedValue(club) },
      paymentOrder: { findFirst: jest.fn().mockResolvedValue(dup) },
      $transaction: jest.fn().mockImplementation(async (fn: any) => fn(tx)),
    };
    const audit: any = { log: jest.fn() };
    return { svc: new BillingManualService(prisma, audit), tx, audit };
  };
  const dto: any = { clubId: 'c1', planTier: 'PRO', months: 3, amount: 297000, method: 'BANK_TRANSFER' };

  it('CLB không tồn tại → 404', async () => {
    const { svc } = build(null);
    await expect(svc.record('u', dto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('trùng mã tham chiếu → 400', async () => {
    const { svc } = build({ id: 'c1', name: 'A', plan: 'STARTER', planExpiresAt: null }, { orderCode: 'MN1', club: { name: 'B' } });
    await expect(svc.record('u', { ...dto, reference: 'FT123' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ngày thu ở tương lai → 400', async () => {
    const { svc } = build({ id: 'c1', name: 'A', plan: 'STARTER', planExpiresAt: null });
    await expect(svc.record('u', { ...dto, paidAt: '2099-01-01' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cùng gói còn hạn → cộng tiếp từ ngày hết hạn; ghi order PAID/MANUAL + invoice + club + subscription', async () => {
    const exp = new Date(); exp.setMonth(exp.getMonth() + 2);
    const { svc, tx, audit } = build({ id: 'c1', name: 'A', plan: 'PRO', planExpiresAt: exp });
    const r = await svc.record('u', dto);
    expect(r.expiresAt!.getTime()).toBe(addMonths(exp, 3).getTime());
    expect(tx.paymentOrder.create.mock.calls[0][0].data).toMatchObject({ gateway: 'MANUAL', status: 'PAID', method: 'BANK_TRANSFER', months: 3 });
    expect(tx.club.update).toHaveBeenCalled();
    expect(tx.subscription.upsert).toHaveBeenCalled();
    expect(tx.invoice.create).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalled();
  });

  it('gói vô hạn do Admin cấp → giữ vô hạn', async () => {
    const { svc } = build({ id: 'c1', name: 'A', plan: 'PRO', planExpiresAt: null });
    expect((await svc.record('u', dto)).expiresAt).toBeNull();
  });

  it('khác gói/đã hết hạn → tính từ hôm nay', async () => {
    const { svc } = build({ id: 'c1', name: 'A', plan: 'STARTER', planExpiresAt: null });
    const r = await svc.record('u', dto);
    expect(Math.abs(r.expiresAt!.getTime() - addMonths(new Date(), 3).getTime())).toBeLessThan(5000);
  });
});

describe('BillingManualService — yêu cầu từ CLB Admin', () => {
  const mk = (over: any = {}) => {
    const tx = {
      paymentOrder: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      club: { update: jest.fn() }, subscription: { upsert: jest.fn() }, invoice: { create: jest.fn() },
    };
    const prisma: any = {
      club: { findUnique: jest.fn().mockResolvedValue({ id: 'c1', name: 'A' }) },
      paymentOrder: {
        count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async ({ data }) => ({ id: 'o1', ...data })),
        findUnique: jest.fn().mockResolvedValue(null), updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 's1' }]) },
      notification: { createMany: jest.fn() },
      $transaction: jest.fn().mockImplementation(async (fn: any) => fn(tx)),
      ...over,
    };
    return { svc: new BillingManualService(prisma, { log: jest.fn() } as any), prisma, tx };
  };
  const dto: any = { planTier: 'PRO', months: 1, amount: 99000, method: 'BANK_TRANSFER' };

  it('gửi yêu cầu → PENDING (không đổi gói), báo Super Admin', async () => {
    const { svc, prisma, tx } = mk();
    const r = await svc.requestPayment('u', 'c1', dto);
    expect(r.status).toBe('PENDING');
    expect(prisma.paymentOrder.create.mock.calls[0][0].data).toMatchObject({ status: 'PENDING', gateway: 'MANUAL', clubId: 'c1' });
    expect(tx.club.update).not.toHaveBeenCalled();
    expect(prisma.notification.createMany).toHaveBeenCalled();
  });

  it('quá 5 yêu cầu chờ → 400', async () => {
    const { svc } = mk({ paymentOrder: { count: jest.fn().mockResolvedValue(5), findFirst: jest.fn(), create: jest.fn() } });
    await expect(svc.requestPayment('u', 'c1', dto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('xác nhận → PAID + kích hoạt gói; đã xử lý rồi → 400', async () => {
    const order = { id: 'o1', clubId: 'c1', orderCode: 'MN1', gateway: 'MANUAL', status: 'PENDING', planTier: 'PRO', months: 1, billingCycle: 'MONTHLY', amount: 99000, club: { id: 'c1', name: 'A', plan: 'STARTER', planExpiresAt: null } };
    const { svc, prisma, tx } = mk();
    prisma.paymentOrder.findUnique.mockResolvedValue(order);
    await svc.confirmRequest('s1', 'MN1');
    expect(tx.club.update).toHaveBeenCalled();
    expect(tx.invoice.create).toHaveBeenCalled();
    prisma.paymentOrder.findUnique.mockResolvedValue({ ...order, status: 'PAID' });
    await expect(svc.confirmRequest('s1', 'MN1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('từ chối → CANCELLED, không đụng gói', async () => {
    const { svc, prisma, tx } = mk();
    prisma.paymentOrder.findUnique.mockResolvedValue({ id: 'o1', clubId: 'c1', gateway: 'MANUAL', status: 'PENDING', amount: 1, note: null });
    await svc.rejectRequest('s1', 'MN1', 'Chưa nhận được tiền');
    expect(prisma.paymentOrder.updateMany.mock.calls[0][0].data.status).toBe('CANCELLED');
    expect(tx.club.update).not.toHaveBeenCalled();
  });
});

describe('BillingManualService — gói vô hạn + resetExpiry', () => {
  it('resetExpiry=true chuyển gói vô hạn sang có hạn từ hôm nay', async () => {
    const tx = { paymentOrder: { create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'o', ...data })) }, club: { update: jest.fn() }, subscription: { upsert: jest.fn() }, invoice: { create: jest.fn() } };
    const prisma: any = {
      club: { findUnique: jest.fn().mockResolvedValue({ id: 'c1', name: 'A', plan: 'PRO', planExpiresAt: null }) },
      paymentOrder: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn().mockImplementation(async (fn: any) => fn(tx)),
    };
    const svc = new BillingManualService(prisma, { log: jest.fn() } as any);
    const r = await svc.record('u', { clubId: 'c1', planTier: 'PRO', months: 2, amount: 198000, method: 'CASH', resetExpiry: true } as any);
    expect(r.expiresAt).not.toBeNull();
    expect(Math.abs(r.expiresAt!.getTime() - addMonths(new Date(), 2).getTime())).toBeLessThan(5000);
  });
});
