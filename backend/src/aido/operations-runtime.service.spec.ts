import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OperationsRuntimeService } from './operations-runtime.service';
import { AgentResultsService } from './agent-results.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Test OperationsRuntimeService — runtime THẬT cho AI Operations Center.
 * Kiểm: đếm rule bật/tắt + lịch, runs hôm nay, thành công/lỗi, dedup/cooldown (từ resultJson),
 * breakdown Approval, tỷ lệ notification (chia-0 an toàn), tenant scope, empty data.
 */
describe('OperationsRuntimeService', () => {
  const prisma = {
    workflowRule: { groupBy: jest.fn() },
    workflowRun: { findMany: jest.fn() },
    aiAction: { groupBy: jest.fn(), count: jest.fn() },
    clubMemory: { groupBy: jest.fn() },
    auditLog: { groupBy: jest.fn() },
  };

  const agentResults = { getResults: jest.fn() };
  const config = { get: jest.fn() };

  let svc: OperationsRuntimeService;

  const defaultAgentResults = {
    maika: { actionsToday: 3, briefsToday: 2, insightsToday: 5, recentInsights: [] },
    lisa: { remindersToday: 4, answeredToday: 6 },
    hermes: {
      runsToday: 10,
      waitingApproval: 2,
      running: 1,
      completedToday: 7,
      failedToday: 1,
    },
    mitDac: { executedToday: 8, running: 1, failedToday: 0, averageExecutionMs: 82 },
    notification: {
      sentToday: 19,
      byChannel: { IN_APP: 19, EMAIL: 0, TELEGRAM: 0 },
      failedToday: 0,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    // Mặc định (mỗi test override khi cần) — clearAllMocks KHÔNG reset implementation.
    prisma.workflowRule.groupBy.mockResolvedValue([
      { enabled: true, scheduleType: 'DAILY', _count: { _all: 8 } },
      { enabled: true, scheduleType: 'WEEKLY', _count: { _all: 3 } },
      { enabled: true, scheduleType: 'MANUAL', _count: { _all: 2 } },
      { enabled: false, scheduleType: 'MANUAL', _count: { _all: 1 } },
    ]);
    prisma.workflowRun.findMany.mockResolvedValue([
      { status: 'COMPLETED', resultJson: { skippedDuplicateCount: 2, skippedCooldownCount: 1 } },
      { status: 'COMPLETED', resultJson: { skippedDuplicateCount: 0 } },
      { status: 'FAILED', resultJson: null },
      { status: 'WAITING_APPROVAL', resultJson: { skippedCooldownCount: 4 } },
    ]);
    prisma.aiAction.groupBy.mockResolvedValue([
      { status: 'PENDING_APPROVAL', _count: { _all: 6 } },
      { status: 'APPROVED', _count: { _all: 11 } },
      { status: 'REJECTED', _count: { _all: 1 } },
    ]);
    prisma.aiAction.count.mockResolvedValue(6);
    prisma.clubMemory.groupBy.mockResolvedValue([
      { type: 'KNOWLEDGE', _count: { _all: 205 } },
      { type: 'OPERATIONAL_NOTE', _count: { _all: 24 } },
    ]);
    prisma.auditLog.groupBy.mockResolvedValue([
      { action: 'WORKFLOW', _count: { _all: 215 } },
      { action: 'NOTIFICATION', _count: { _all: 90 } },
      { action: 'APPROVAL', _count: { _all: 42 } },
    ]);
    agentResults.getResults.mockResolvedValue(defaultAgentResults);
    config.get.mockReturnValue('false');

    const mod = await Test.createTestingModule({
      providers: [
        OperationsRuntimeService,
        { provide: PrismaService, useValue: prisma },
        { provide: AgentResultsService, useValue: agentResults },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    svc = mod.get(OperationsRuntimeService);
  });

  it('clubId rỗng → empty summary, KHÔNG truy vấn DB', async () => {
    const r = await svc.getRuntimeSummary('');
    expect(r.overview.activeRules).toBe(0);
    expect(r.overview.runsToday).toBe(0);
    expect(prisma.workflowRule.groupBy).not.toHaveBeenCalled();
    expect(agentResults.getResults).not.toHaveBeenCalled();
    expect(r.generatedAt).toBeTruthy();
  });

  it('đếm rule bật/tắt + tách lịch daily/weekly/manual', async () => {
    const r = await svc.getRuntimeSummary('club-1');
    expect(r.overview.activeRules).toBe(13); // 8+3+2
    expect(r.overview.inactiveRules).toBe(1);
    expect(r.modules.workflowStudio.totalRules).toBe(14);
    expect(r.modules.workflowStudio.disabledRules).toBe(1);
    expect(r.modules.scheduler.daily).toBe(8);
    expect(r.modules.scheduler.weekly).toBe(3);
    expect(r.modules.scheduler.manual).toBe(2); // chỉ MANUAL đang bật
  });

  it('runs hôm nay: tổng + thành công/lỗi + dedup/cooldown từ resultJson', async () => {
    const r = await svc.getRuntimeSummary('club-1');
    expect(r.overview.runsToday).toBe(4);
    expect(r.overview.successfulToday).toBe(2); // 2 COMPLETED
    expect(r.overview.failedToday).toBe(1); // 1 FAILED
    expect(r.overview.duplicateSkippedToday).toBe(2); // 2 + 0
    expect(r.overview.cooldownBlockedToday).toBe(5); // 1 + 4
    expect(r.modules.workflowStudio.health).toBe('warn'); // có lỗi
  });

  it('Approval Center: tổng hôm nay + breakdown theo trạng thái; pending hiện tại riêng', async () => {
    const r = await svc.getRuntimeSummary('club-1');
    expect(r.modules.approvalCenter.totalToday).toBe(18); // 6+11+1
    expect(r.modules.approvalCenter.pending).toBe(6);
    expect(r.modules.approvalCenter.approvedToday).toBe(11);
    expect(r.modules.approvalCenter.rejectedToday).toBe(1);
    expect(r.modules.approvalCenter.expiredToday).toBe(0);
    expect(r.overview.aiActionsCreatedToday).toBe(18);
    expect(r.overview.pendingApprovals).toBe(6); // count() riêng (toàn cục open)
  });

  it('tỷ lệ notification an toàn khi 0 lần gửi (chia-0)', async () => {
    agentResults.getResults.mockResolvedValue({
      ...defaultAgentResults,
      notification: {
        sentToday: 0,
        byChannel: { IN_APP: 0, EMAIL: 0, TELEGRAM: 0 },
        failedToday: 0,
      },
    });
    const r = await svc.getRuntimeSummary('club-1');
    expect(r.agents.notification.successRate).toBe(0);
    expect(Number.isNaN(r.agents.notification.successRate)).toBe(false);
  });

  it('tỷ lệ notification = sent/(sent+failed)', async () => {
    agentResults.getResults.mockResolvedValue({
      ...defaultAgentResults,
      notification: {
        sentToday: 18,
        byChannel: { IN_APP: 18, EMAIL: 0, TELEGRAM: 0 },
        failedToday: 2,
      },
    });
    const r = await svc.getRuntimeSummary('club-1');
    expect(r.agents.notification.successRate).toBe(90); // 18/20
  });

  it('Club Memory + Audit Logs tổng hợp; agents map đúng vai trò', async () => {
    const r = await svc.getRuntimeSummary('club-1');
    expect(r.modules.clubMemory.total).toBe(229); // 205+24
    expect(r.modules.auditLogs.total).toBe(347); // 215+90+42
    expect(r.modules.auditLogs.byAction[0]).toEqual({ name: 'WORKFLOW', count: 215 });
    expect(r.agents.maika.analyses).toBe(5);
    expect(r.agents.mitDac.avgMs).toBe(82);
    expect(r.agents.hermes.completed).toBe(7);
  });

  it('scheduler.autoEnabled đọc từ config HERMES_SCHEDULER_ENABLED', async () => {
    config.get.mockReturnValue('true');
    const r = await svc.getRuntimeSummary('club-1');
    expect(r.modules.scheduler.autoEnabled).toBe(true);
  });

  it('tenant scope: MỌI truy vấn dùng đúng clubId', async () => {
    await svc.getRuntimeSummary('club-xyz');
    expect(prisma.workflowRule.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clubId: 'club-xyz' } }),
    );
    expect(prisma.workflowRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clubId: 'club-xyz' }),
      }),
    );
    expect(prisma.aiAction.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clubId: 'club-xyz',
          status: 'PENDING_APPROVAL',
        }),
      }),
    );
    expect(prisma.aiAction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clubId: 'club-xyz' }),
      }),
    );
    expect(prisma.clubMemory.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clubId: 'club-xyz' } }),
    );
    expect(prisma.auditLog.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clubId: 'club-xyz' }),
      }),
    );
    expect(agentResults.getResults).toHaveBeenCalledWith('club-xyz');
  });
});
