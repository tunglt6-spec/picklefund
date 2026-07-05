import { HermesActionExecutor } from './hermes-action-executor';
import type { ExecutableAction } from './action-executor';
import type { PrismaService } from '../prisma/prisma.service';
import type { NotificationRuntimeService } from '../notification-runtime/notification-runtime.service';

/**
 * HermesActionExecutor — executor THẬT Mít Đặc.
 * Phủ 3 nhánh fan-out IN_APP (DEBT/EVENT/REPORT): đúng đối tượng, đếm notified/skipped,
 * idempotent per-user, không dữ liệu → không gửi; action lạ → no-op.
 */
describe('HermesActionExecutor', () => {
  const fundPeriodFindFirst = jest.fn();
  const memberFindMany = jest.fn();
  const fundContributionFindMany = jest.fn();
  const attendanceSessionFindFirst = jest.fn();
  const dispatch = jest.fn();

  const prisma = {
    fundPeriod: { findFirst: fundPeriodFindFirst },
    member: { findMany: memberFindMany },
    fundContribution: { findMany: fundContributionFindMany },
    attendanceSession: { findFirst: attendanceSessionFindFirst },
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

  // ---------- DEBT_ESCALATION ----------
  it('DEBT_ESCALATION: fan-out IN_APP tới member chưa đóng CÓ tài khoản; skip member không có tài khoản', async () => {
    fundPeriodFindFirst.mockResolvedValue({ id: 'p1', name: 'Kỳ 1' });
    memberFindMany.mockResolvedValue([
      { id: 'm1', userId: 'u1' },
      { id: 'm2', userId: null },
      { id: 'm3', userId: 'u3' },
    ]);
    fundContributionFindMany.mockResolvedValue([{ memberId: 'm3' }]);

    const res = await executor.execute(baseAction());

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

  it('DEBT_ESCALATION: duplicate (idempotent) KHÔNG tính là gửi mới', async () => {
    fundPeriodFindFirst.mockResolvedValue({ id: 'p1', name: 'Kỳ 1' });
    memberFindMany.mockResolvedValue([{ id: 'm1', userId: 'u1' }]);
    fundContributionFindMany.mockResolvedValue([]);
    dispatch.mockResolvedValue({ status: 'READY', duplicate: true });

    const res = await executor.execute(baseAction());
    expect(res.message).toContain('đã gửi 0/1');
  });

  it('DEBT_ESCALATION: không có kỳ quỹ active → không gửi, báo rõ', async () => {
    fundPeriodFindFirst.mockResolvedValue(null);

    const res = await executor.execute(baseAction());
    expect(dispatch).not.toHaveBeenCalled();
    expect(res.mode).toBe('live');
    expect(res.message).toContain('Không có kỳ quỹ đang mở');
  });

  // ---------- EVENT_REMINDER ----------
  it('EVENT_REMINDER: broadcast buổi tập sắp tới tới TẤT CẢ member có tài khoản', async () => {
    attendanceSessionFindFirst.mockResolvedValue({
      sessionDate: new Date('2026-08-01T00:00:00.000Z'),
      startTime: '19:00',
      endTime: '21:00',
      courtName: 'Sân A',
    });
    memberFindMany.mockResolvedValue([
      { userId: 'u1' },
      { userId: null },
      { userId: 'u3' },
    ]);

    const res = await executor.execute(
      baseAction({
        actionType: 'workflow:EVENT_REMINDER',
        targetModule: 'sessions',
      }),
    );

    // u1 + u3 (u2 không tài khoản bị loại)
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(res.mode).toBe('live');
    expect(res.message).toContain('1/8/2026');
    expect(res.message).toContain('đã gửi 2/2');
  });

  it('EVENT_REMINDER: không có buổi tập sắp tới → không gửi', async () => {
    attendanceSessionFindFirst.mockResolvedValue(null);

    const res = await executor.execute(
      baseAction({ actionType: 'workflow:EVENT_REMINDER' }),
    );
    expect(dispatch).not.toHaveBeenCalled();
    expect(res.message).toContain('Không có buổi tập sắp tới');
  });

  // ---------- REPORT_DISPATCH ----------
  it('REPORT_DISPATCH: báo kỳ đã chốt tới tất cả member có tài khoản', async () => {
    fundPeriodFindFirst.mockResolvedValue({ name: 'Quý 2' });
    memberFindMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u3' }]);

    const res = await executor.execute(
      baseAction({
        actionType: 'workflow:REPORT_DISPATCH',
        targetModule: 'reports',
      }),
    );

    expect(fundPeriodFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clubId: 'club-1', status: 'finalized' },
      }),
    );
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(res.message).toContain('Quý 2');
    expect(res.message).toContain('đã gửi 2/2');
  });

  it('REPORT_DISPATCH: chưa có kỳ finalized → không gửi', async () => {
    fundPeriodFindFirst.mockResolvedValue(null);

    const res = await executor.execute(
      baseAction({ actionType: 'workflow:REPORT_DISPATCH' }),
    );
    expect(dispatch).not.toHaveBeenCalled();
    expect(res.message).toContain('Chưa có kỳ quỹ nào chốt');
  });

  // ---------- no-op ----------
  it('actionType không hỗ trợ → no-op, không gửi', async () => {
    const res = await executor.execute(
      baseAction({ actionType: 'workflow:SOMETHING_ELSE' }),
    );
    expect(dispatch).not.toHaveBeenCalled();
    expect(res.mode).toBe('no-op');
  });
});
