import { ZaloIntakeService } from './zalo-intake.service';
import { ZaloIntakeController } from './zalo-intake.controller';
import { RolesGuard } from '../common/guards/roles.guard';
import { Reflector } from '@nestjs/core';
const actor: any = { userId: 'admin', clubId: 'club', role: 'CLUB_ADMIN' };
const c = {
  version: 'v1',
  chatId: 'group',
  webhookReady: true,
  intakeEnabled: true,
};
const payload: any = {
  amount: 450000,
  description: 'Tiền sân',
  date: '2026-10-31',
  fundSource: 'COMMON',
  fundPeriodId: 'period',
  costType: 'COURT',
  allocationRule: 'EQUAL',
};
describe('Zalo financial intake boundaries', () => {
  let p: any,
    svc: ZaloIntakeService,
    contributions: any,
    expenses: any,
    calculator: any,
    events: any,
    draft: any,
    role: string;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-31T10:00:00Z'));
    role = 'CLUB_ADMIN';
    draft = {
      id: 'draft',
      clubId: 'club',
      botVersion: 'v1',
      chatId: 'group',
      messageId: 'msg',
      senderUserId: 'admin',
      senderZaloId: 'zuser',
      kind: 'EXPENSE',
      payload,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 86400000),
    };
    p = {
      user: {
        findFirst: jest.fn(async () =>
          ['CLUB_ADMIN', 'CLUB_TREASURER'].includes(role)
            ? { id: 'admin', clubId: 'club', role }
            : null,
        ),
      },
      systemSetting: {
        findUnique: jest.fn(async () => ({ value: JSON.stringify(c) })),
      },
      zaloIdentity: {
        findFirst: jest.fn(async () => ({
          userId: 'admin',
          zaloUserId: 'zuser',
        })),
        findUnique: jest.fn(async () => null),
      },
      zaloLinkChallenge: {
        findUnique: jest.fn(async () => null),
        updateMany: jest.fn(async () => ({ count: 1 })),
        upsert: jest.fn(async (x) => x.create),
      },
      zaloFinanceDraft: {
        findUnique: jest.fn(async () => null),
        count: jest.fn(async () => 0),
        create: jest.fn(async ({ data }) => ({ ...data, id: 'draft' })),
        findFirst: jest.fn(async () => draft),
        findMany: jest.fn(async () => [draft]),
        updateMany: jest.fn(async () => ({ count: 1 })),
        update: jest.fn(async (x) => x.data),
      },
      member: {
        findMany: jest.fn(async () => []),
        findFirst: jest.fn(async () => ({ id: 'member' })),
      },
      fundPeriod: {
        updateMany: jest.fn(async () => ({ count: 1 })),
        findMany: jest.fn(async () => [{ id: 'period' }]),
        findFirst: jest.fn(async () => ({ id: 'period' })),
      },
      auditLog: { create: jest.fn(async () => ({})) },
    };
    p.$transaction = jest.fn(async (fn) => fn(p));
    contributions = { create: jest.fn(async () => ({ id: 'income' })) };
    expenses = { create: jest.fn(async () => ({ id: 'expense' })) };
    calculator = { invalidateClosingBalances: jest.fn(async () => {}) };
    events = { publish: jest.fn() };
    svc = new ZaloIntakeService(p, contributions, expenses, calculator, events);
  });
  afterEach(() => jest.useRealTimers());
  const message = () => ({
    message_id: 'msg',
    from: { id: 'zuser', is_bot: false },
    chat: { id: 'group', chat_type: 'GROUP' },
    text: '@Bot /chi 450000 | Tiền sân | quỹ chính | 31/10/2026',
  });
  it('only creates a draft on a valid group command, never a financial entry', async () => {
    expect(await svc.receive('club', c, message())).toContain(
      'Chưa ghi vào sổ quỹ',
    );
    expect(p.zaloFinanceDraft.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clubId: 'club',
          senderUserId: 'admin',
          messageId: 'msg',
        }),
      }),
    );
    expect(expenses.create).not.toHaveBeenCalled();
    expect(contributions.create).not.toHaveBeenCalled();
  });
  it('ignores private, other-group and bot messages, and disabled intake', async () => {
    for (const m of [
      { ...message(), chat: { id: 'private', chat_type: 'PRIVATE' } },
      { ...message(), chat: { id: 'other', chat_type: 'GROUP' } },
      { ...message(), from: { id: 'bot', is_bot: true } },
    ])
      expect(await svc.receive('club', c, m)).toBeNull();
    expect(
      await svc.receive('club', { ...c, intakeEnabled: false }, message()),
    ).toBeNull();
    expect(p.zaloFinanceDraft.create).not.toHaveBeenCalled();
  });
  it('requires linked identity and current active financial role', async () => {
    p.zaloIdentity.findFirst.mockResolvedValue(null);
    expect(await svc.receive('club', c, message())).toContain('Chưa liên kết');
    p.zaloIdentity.findFirst.mockResolvedValue({ userId: 'admin' });
    role = 'MEMBER_VIEW';
    await expect(svc.receive('club', c, message())).rejects.toThrow();
    expect(p.zaloFinanceDraft.create).not.toHaveBeenCalled();
  });
  it('deduplicates webhook retries and handles unique-key races', async () => {
    p.zaloFinanceDraft.findUnique.mockResolvedValue(draft);
    expect(await svc.receive('club', c, message())).toBeNull();
    expect(p.zaloFinanceDraft.create).not.toHaveBeenCalled();
    p.zaloFinanceDraft.findUnique.mockResolvedValue(null);
    p.zaloFinanceDraft.create.mockRejectedValue({ code: 'P2002' });
    expect(await svc.receive('club', c, message())).toBeNull();
  });
  it('keeps an ambiguous member unresolved for human selection', async () => {
    p.member.findMany.mockResolvedValue([{ id: 'one' }, { id: 'two' }]);
    await svc.receive('club', c, {
      ...message(),
      text: '/thu 300000 | Trùng tên | quỹ chính | 31/10/2026',
    });
    expect(
      p.zaloFinanceDraft.create.mock.calls[0][0].data.payload.memberId,
    ).toBeUndefined();
  });
  it('rejects a link challenge from a different club or group without claiming it', async () => {
    p.zaloLinkChallenge.findUnique.mockResolvedValue({
      clubId: 'other',
      botVersion: 'v1',
      chatId: 'group',
      expiresAt: new Date(Date.now() + 60000),
    });
    expect(
      await svc.receive('club', c, {
        ...message(),
        chat: { id: 'private', chat_type: 'PRIVATE' },
        text: '/lienket 1234567890ABCDEF',
      }),
    ).toContain('không hợp lệ');
    expect(p.zaloLinkChallenge.updateMany).not.toHaveBeenCalled();
  });
  it('captures a candidate once but does not silently create an identity', async () => {
    p.zaloLinkChallenge.findUnique.mockResolvedValue({
      id: 'q',
      clubId: 'club',
      botVersion: 'v1',
      chatId: 'group',
      expiresAt: new Date(Date.now() + 60000),
    });
    expect(
      await svc.receive('club', c, {
        ...message(),
        chat: { id: 'private', chat_type: 'PRIVATE' },
        text: '/lienket 1234567890ABCDEF',
      }),
    ).toContain('xác nhận liên kết');
    expect(
      p.zaloLinkChallenge.updateMany.mock.calls[0][0].where.candidateId,
    ).toBeNull();
  });
  it('never accepts a personal linking code exposed in a group', async () => {
    expect(
      await svc.receive('club', c, {
        ...message(),
        text: '/lienket 1234567890ABCDEF',
      }),
    ).toContain('trò chuyện riêng');
    expect(p.zaloLinkChallenge.findUnique).not.toHaveBeenCalled();
  });
  it('records through shared services using the same transaction, then invalidates totals and publishes after commit', async () => {
    await svc.decide(actor, 'draft', false, payload);
    expect(expenses.create).toHaveBeenCalledWith(
      'club',
      'admin',
      expect.objectContaining({ amount: 450000, costType: 'COURT' }),
      p,
    );
    expect(p.zaloFinanceDraft.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'RECORDED',
          recordId: 'expense',
        }),
      }),
    );
    expect(events.publish).toHaveBeenCalled();
    expect(calculator.invalidateClosingBalances).toHaveBeenCalledWith('club');
  });
  it('keeps income unconfirmed even after review', async () => {
    draft.kind = 'INCOME';
    await svc.decide(actor, 'draft', false, { ...payload, memberId: 'member' });
    expect(contributions.create).toHaveBeenCalledWith(
      'club',
      'admin',
      expect.objectContaining({ isConfirmed: false }),
      p,
    );
    expect(events.publish).not.toHaveBeenCalled();
  });
  it('refuses expired, processed and concurrently claimed drafts', async () => {
    draft.expiresAt = new Date(0);
    await expect(svc.decide(actor, 'draft', false, payload)).rejects.toThrow();
    draft.expiresAt = new Date(Date.now() + 60000);
    draft.status = 'RECORDED';
    await expect(svc.decide(actor, 'draft', false, payload)).rejects.toThrow();
    draft.status = 'PENDING';
    p.zaloFinanceDraft.updateMany.mockResolvedValue({ count: 0 });
    await expect(svc.decide(actor, 'draft', false, payload)).rejects.toThrow();
    expect(expenses.create).not.toHaveBeenCalled();
  });
  it('blocks recording into closed/other-club periods, invalid members, or revoked identities', async () => {
    p.fundPeriod.findFirst.mockResolvedValue(null);
    await expect(svc.decide(actor, 'draft', false, payload)).rejects.toThrow();
    p.fundPeriod.findFirst.mockResolvedValue({ id: 'period' });
    draft.kind = 'INCOME';
    p.member.findFirst.mockResolvedValue(null);
    await expect(
      svc.decide(actor, 'draft', false, { ...payload, memberId: 'other' }),
    ).rejects.toThrow();
    p.zaloIdentity.findFirst.mockResolvedValue(null);
    await expect(svc.decide(actor, 'draft', false, payload)).rejects.toThrow();
    expect(expenses.create).not.toHaveBeenCalled();
    expect(contributions.create).not.toHaveBeenCalled();
  });
  it('rejects malformed edited descriptions rather than skipping date validation', async () => {
    await expect(svc.decide(actor, 'draft', false, {...payload, fundSource: 'MINI', description: 'Nước\nngọt', date: '2099-01-01'})).rejects.toThrow();
    expect(expenses.create).not.toHaveBeenCalled();
  });
  it('does not run post-commit effects on transaction failure', async () => {
    expenses.create.mockRejectedValue(new Error('write failed'));
    await expect(svc.decide(actor, 'draft', false, payload)).rejects.toThrow(
      'write failed',
    );
    expect(events.publish).not.toHaveBeenCalled();
    expect(calculator.invalidateClosingBalances).not.toHaveBeenCalled();
  });
  it('limits treasurers to their own drafts', async () => {
    role = 'CLUB_TREASURER';
    draft.senderUserId = 'someone-else';
    await expect(svc.decide(actor, 'draft', false, payload)).rejects.toThrow();
    await svc.list(actor);
    expect(
      p.zaloFinanceDraft.findMany.mock.calls[0][0].where.senderUserId,
    ).toBe('admin');
  });
  it('does not mutate finances when a draft is rejected', async () => {
    expect(await svc.decide(actor, 'draft', true)).toEqual({ rejected: true });
    expect(expenses.create).not.toHaveBeenCalled();
    expect(contributions.create).not.toHaveBeenCalled();
    expect(p.auditLog.create).toHaveBeenCalled();
  });
  it('denies Member and global Super Admin on every intake controller', () => {
    const guard = new RolesGuard(new Reflector());
    for (const method of [
      'state',
      'code',
      'confirm',
      'unlink',
      'drafts',
      'record',
      'reject',
    ]) {
      const ctx = (role: string) =>
        ({
          getHandler: () => ZaloIntakeController.prototype[method],
          getClass: () => ZaloIntakeController,
          switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
        }) as any;
      for (const role of ['MEMBER_VIEW', 'SUPER_ADMIN'])
        expect(() => guard.canActivate(ctx(role))).toThrow();
      expect(guard.canActivate(ctx('CLUB_TREASURER'))).toBe(true);
    }
  });
});
