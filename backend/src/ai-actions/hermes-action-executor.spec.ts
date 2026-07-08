import { HermesActionExecutor } from './hermes-action-executor';
import type { ExecutableAction } from './action-executor';
import type { PrismaService } from '../prisma/prisma.service';
import type { NotificationRuntimeService } from '../notification-runtime/notification-runtime.service';

/**
 * HermesActionExecutor — executor THẬT Mít Đặc.
 * Route thông báo: IN_APP → tài khoản (userId); EMAIL → thành viên (memberId → Member.email
 * "Liên hệ", fallback email tài khoản). Phủ DEBT/EVENT/REPORT + no-op.
 */
type MemberRow = {
  id: string;
  userId: string | null;
  email: string | null;
  user: { email: string | null } | null;
};
const mkMember = (
  id: string,
  userId: string | null,
  email: string | null = null,
  userEmail: string | null = null,
): MemberRow => ({
  id,
  userId,
  email,
  user: userEmail ? { email: userEmail } : null,
});

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
  it('DEBT_ESCALATION (mặc định IN_APP): gửi tài khoản của member chưa đóng; member không tài khoản bị bỏ', async () => {
    fundPeriodFindFirst.mockResolvedValue({ id: 'p1', name: 'Kỳ 1' });
    memberFindMany.mockResolvedValue([
      mkMember('m1', 'u1', 'm1@real.vn'),
      mkMember('m2', null, null), // chưa đóng, không tài khoản
      mkMember('m3', 'u3', 'm3@real.vn'), // đã đóng
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
      }),
    );
    expect(res.mode).toBe('live');
    expect(res.message).toContain('2 thành viên chưa đóng');
    expect(res.message).toContain('[IN_APP:1]');
  });

  it('DEBT_ESCALATION opt-in EMAIL: IN_APP→tài khoản, EMAIL→thành viên (Member.email)', async () => {
    fundPeriodFindFirst.mockResolvedValue({ id: 'p1', name: 'Kỳ 1' });
    memberFindMany.mockResolvedValue([mkMember('m1', 'u1', 'm1@real.vn')]);
    fundContributionFindMany.mockResolvedValue([]);

    const res = await executor.execute(
      baseAction({ requestPayload: { channels: ['IN_APP', 'EMAIL'] } }),
    );

    expect(dispatch).toHaveBeenCalledTimes(2);
    // IN_APP → USER/userId
    expect(dispatch).toHaveBeenCalledWith(
      'club-1',
      expect.objectContaining({
        channel: 'IN_APP',
        targetType: 'USER',
        targetId: 'u1',
        idempotencyKey: 'AI_ACTION:a1:USER:u1',
      }),
    );
    // EMAIL → MEMBER/memberId (để runtime lấy Member.email)
    expect(dispatch).toHaveBeenCalledWith(
      'club-1',
      expect.objectContaining({
        channel: 'EMAIL',
        targetType: 'MEMBER',
        targetId: 'm1',
        idempotencyKey: 'AI_ACTION:a1:MEMBER:m1',
      }),
    );
    expect(res.message).toContain('IN_APP:1');
    expect(res.message).toContain('EMAIL:1');
  });

  it('DEBT_ESCALATION: duplicate (idempotent) KHÔNG tính là gửi mới', async () => {
    fundPeriodFindFirst.mockResolvedValue({ id: 'p1', name: 'Kỳ 1' });
    memberFindMany.mockResolvedValue([mkMember('m1', 'u1', 'm1@real.vn')]);
    fundContributionFindMany.mockResolvedValue([]);
    dispatch.mockResolvedValue({ status: 'READY', duplicate: true });

    const res = await executor.execute(baseAction());
    expect(res.message).toContain('[IN_APP:0]');
  });

  it('DEBT_ESCALATION: không có kỳ quỹ active → không gửi, báo rõ', async () => {
    fundPeriodFindFirst.mockResolvedValue(null);
    const res = await executor.execute(baseAction());
    expect(dispatch).not.toHaveBeenCalled();
    expect(res.message).toContain('Không có kỳ quỹ đang mở');
  });

  // ---------- EVENT_REMINDER ----------
  it('EVENT_REMINDER (mặc định IN_APP): tất cả member; chỉ member có tài khoản nhận in-app', async () => {
    attendanceSessionFindFirst.mockResolvedValue({
      sessionDate: new Date('2026-08-01T00:00:00.000Z'),
      startTime: '19:00',
      endTime: '21:00',
      courtName: 'Sân A',
    });
    memberFindMany.mockResolvedValue([
      mkMember('m1', 'u1', 'e1@x.vn'),
      mkMember('m2', null, 'e2@x.vn'), // có email Liên hệ, không tài khoản
      mkMember('m3', 'u3', null, 'u3acc@x.vn'),
    ]);

    const res = await executor.execute(
      baseAction({
        actionType: 'workflow:EVENT_REMINDER',
        targetModule: 'sessions',
      }),
    );

    // IN_APP: chỉ m1(u1) + m3(u3) → 2; m2 không tài khoản bị bỏ.
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(res.message).toContain('1/8/2026');
    expect(res.message).toContain('3 thành viên');
    expect(res.message).toContain('[IN_APP:2]');
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
  it('REPORT_DISPATCH: kỳ finalized → tất cả member', async () => {
    fundPeriodFindFirst.mockResolvedValue({ name: 'Quý 2' });
    memberFindMany.mockResolvedValue([
      mkMember('m1', 'u1'),
      mkMember('m2', 'u3'),
    ]);

    const res = await executor.execute(
      baseAction({
        actionType: 'workflow:REPORT_DISPATCH',
        targetModule: 'reports',
      }),
    );

    expect(fundPeriodFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clubId: 'club-1', status: 'finalized', type: 'chung' },
      }),
    );
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(res.message).toContain('Quý 2');
    expect(res.message).toContain('2 thành viên');
    expect(res.message).toContain('[IN_APP:2]');
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
