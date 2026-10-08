import { ApprovalHousekeepingScheduler } from './approval-housekeeping.scheduler';

describe('ApprovalHousekeepingScheduler', () => {
  it('chạy expire + resolve cho từng CLB có việc chờ (gộp trùng), lỗi 1 CLB không chặn CLB khác', async () => {
    const prisma = {
      aiAction: { findMany: jest.fn().mockResolvedValue([{ clubId: 'c1' }, { clubId: 'c2' }]) },
      workflowRun: { findMany: jest.fn().mockResolvedValue([{ clubId: 'c2' }]) },
    };
    const actions = { expireStale: jest.fn().mockImplementation(async (id: string) => { if (id === 'c1') throw new Error('x'); }) };
    const workflows = { resolveStaleApprovalRuns: jest.fn().mockResolvedValue(undefined) };
    const s = new ApprovalHousekeepingScheduler(prisma as never, actions as never, workflows as never);
    expect(await s.run()).toEqual({ clubs: 2 });
    expect(actions.expireStale).toHaveBeenCalledTimes(2);
    expect(workflows.resolveStaleApprovalRuns).toHaveBeenCalledTimes(1);
    expect(workflows.resolveStaleApprovalRuns).toHaveBeenCalledWith('c2');
  });
});
