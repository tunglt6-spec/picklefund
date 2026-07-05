import { HermesActionExecutor } from './hermes-action-executor';
import type { ExecutableAction } from './action-executor';
import type { PrismaService } from '../prisma/prisma.service';
import type { NotificationRuntimeService } from '../notification-runtime/notification-runtime.service';

/**
 * HermesActionExecutor — executor THẬT Mít Đặc.
 * Trọng tâm: DEBT_ESCALATION fan-out IN_APP đúng đối tượng (chưa đóng + có tài khoản),
 * đếm đúng notified/skipped, idempotent per-user; loại khác no-op; không có kỳ → không gửi.
 */
describe('HermesActionExecutor', () => {
  const fundPeriodFindFirst = jest.fn();
  const memberFindMany = jest.fn();
  const fundContributionFindMany = jest.fn();
  const dispatch = jest.fn();

  const prisma = {
    fundPeriod: { findFirst: fundPeriodFindFirst },
    member: { findMany: memberFindMany },
    fundContribution: { findMany: fundContributionFindMany },
  } as unknown as PrismaService;
  const notifications = {
    dispatch,
  } as unknown as NotificationRuntimeService;

  let executor: HermesActionExecutor;

  const baseAction = (
    over: Partial<ExecutableAction> = {},
  ): ExecutableAction => ({
    id: 'a1',
    clubId: 'club-1',
    actionType: 'workflow:DEBT_ESCALATION',
    targetModule: 'contributions',
    title: 'Nhắc thành viên nợ quỹ',
    summary: null,
    requestPayload: {},
    ...over,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    executor = new HermesActionExecutor(prisma, notifications);
    dispatch.mockResolvedValue({ status: 'READY' });
  });

  it('DEBT_ESCALATION: fan-out IN_APP tới member chưa đóng CÓ tài khoản; skip member không có tài khoản', async () => {
    fundPeriodFindFirst.mockResolvedValue({ id: 'p1', name: 'Kỳ 1' });
    // m1 (có tk, chưa đóng), m2 (không tk, chưa đóng), m3 (có tk, đã đóng)
    memberFindMany.mockResolvedValue([
      { id: 'm1', userId: 'u1' },
      { id: 'm2', userId: null },
      { id: 'm3', userId: 'u3' },
    ]);
    fundContributionFindMany.mockResolvedValue([{ memberId: 'm3' }]);

    const res = await executor.execute(baseAction());

    // Chỉ gửi cho u1 (m1) — m2 không tài khoản (skip), m3 đã đóng (không nhắc).
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      'club-1',
      expect.objectContaining({
        channel: 'IN_APP',
        targetType: 'USER',
        targetId: 'u1',
        idempotencyKey: 'AI_ACTION:a1:USER:u1',
        aiActionId: 'a1',
      }),
    );
    expect(res.mode).toBe('live');
    expect(res.message).toContain('đã gửi 1/2');
    expect(res.message).toContain('1 chưa có tài khoản');
  });

  it('duplicate (idempotent) KHÔNG tính là gửi mới', async () => {
    fundPeriodFindFirst.mockResolvedValue({ id: 'p1', name: 'Kỳ 1' });
    memberFindMany.mockResolvedValue([{ id: 'm1', userId: 'u1' }]);
    fundContributionFindMany.mockResolvedValue([]);
    dispatch.mockResolvedValue({ status: 'READY', duplicate: true });

    const res = await executor.execute(baseAction());
    expect(res.message).toContain('đã gửi 0/1');
  });

  it('không có kỳ quỹ active → không gửi, báo rõ', async () => {
    fundPeriodFindFirst.mockResolvedValue(null);

    const res = await executor.execute(baseAction());
    expect(dispatch).not.toHaveBeenCalled();
    expect(res.mode).toBe('live');
    expect(res.message).toContain('Không có kỳ quỹ đang mở');
  });

  it('actionType khác DEBT_ESCALATION → no-op, không gửi', async () => {
    const res = await executor.execute(
      baseAction({
        actionType: 'workflow:EVENT_REMINDER',
        targetModule: 'sessions',
      }),
    );
    expect(dispatch).not.toHaveBeenCalled();
    expect(res.mode).toBe('no-op');
  });
});
