import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HermesSchedulerService } from './hermes-scheduler.service';
import { HermesWorkflowService } from './hermes-workflow.service';
import { AiActionsService } from '../ai-actions/ai-actions.service';
import { AgentActivityService } from '../aido/agent-activity.service';
import { PrismaService } from '../prisma/prisma.service';

const prisma = { workflowRule: { findMany: jest.fn() } };

// track() phải GỌI fn() để dispatchTrigger vẫn chạy (giữ nguyên hành vi kiểm thử).
const activity = {
  track: jest.fn(
    (_clubId: unknown, _agent: unknown, _task: unknown, fn: () => unknown) =>
      fn(),
  ),
};

/** Tuple args + kết quả của dispatchTrigger — mock CÓ KIỂU, không unsafe-assignment. */
type DispatchArgs = [
  string,
  string,
  { userId: string; clubId: string },
  (Record<string, unknown> | undefined)?,
  (string | undefined)?,
  ({ scheduleType?: string } | undefined)?,
];
interface DispatchResult {
  triggerType: string;
  totalRules: number;
  matchedRules: number;
  createdRuns: number;
  createdActions: number;
  failedRuns: number;
  skippedDuplicate: boolean;
}

const hermes = {
  dispatchTrigger: jest.fn<Promise<DispatchResult>, DispatchArgs>(),
  listRuns: jest.fn(),
};

const dispatchCalls = (): DispatchArgs[] => hermes.dispatchTrigger.mock.calls;

const OK_SUMMARY = {
  triggerType: 'DEBT_ESCALATION',
  totalRules: 1,
  matchedRules: 1,
  createdRuns: 1,
  createdActions: 1,
  failedRuns: 0,
  skippedDuplicate: false,
};

async function makeService(enabled = false): Promise<HermesSchedulerService> {
  const config = {
    get: jest.fn().mockReturnValue(enabled ? 'true' : undefined),
  };
  const mod: TestingModule = await Test.createTestingModule({
    providers: [
      HermesSchedulerService,
      { provide: PrismaService, useValue: prisma },
      { provide: HermesWorkflowService, useValue: hermes },
      { provide: AgentActivityService, useValue: activity },
      { provide: ConfigService, useValue: config },
    ],
  }).compile();
  return mod.get(HermesSchedulerService);
}

const RULE = {
  id: 'r1',
  clubId: 'club-1',
  triggerType: 'DEBT_ESCALATION',
  scheduleType: 'DAILY',
  createdById: 'u1',
};

describe('HermesSchedulerService (EPIC9)', () => {
  let service: HermesSchedulerService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.workflowRule.findMany.mockResolvedValue([]);
    hermes.dispatchTrigger.mockResolvedValue({ ...OK_SUMMARY });
    hermes.listRuns.mockResolvedValue([]);
    service = await makeService(false);
  });

  describe('timer gating (an toàn dev/test)', () => {
    it('mặc định TẮT — onModuleInit không tạo timer', async () => {
      const s = await makeService(false);
      s.onModuleInit();
      // Không timer → onModuleDestroy không có gì để clear, không throw.
      expect(() => s.onModuleDestroy()).not.toThrow();
      expect(s.status().enabled).toBe(false);
    });

    it('BẬT qua env → status enabled, destroy dọn timer', async () => {
      const s = await makeService(true);
      s.onModuleInit();
      expect(s.status().enabled).toBe(true);
      s.onModuleDestroy(); // clear timer — test không bị treo
    });
  });

  describe('periodKey (chống trùng theo kỳ)', () => {
    const d = new Date('2026-07-04T10:00:00Z');
    it('DAILY/WEEKLY/MONTHLY format chuẩn', () => {
      expect(service.periodKey('DAILY', d)).toBe('2026-07-04');
      expect(service.periodKey('MONTHLY', d)).toBe('2026-07');
      expect(service.periodKey('WEEKLY', d)).toBe('2026-W27');
    });
  });

  describe('tick — scheduler execution', () => {
    it('chỉ quét rule enabled + scheduleType tự động (MANUAL bị loại từ query)', async () => {
      await service.tick();
      expect(prisma.workflowRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            enabled: true,
            scheduleType: { in: ['DAILY', 'WEEKLY', 'MONTHLY'] },
          },
        }),
      );
    });

    it('dispatch qua Workflow Engine với idempotencyKey theo kỳ (không thực thi business trực tiếp)', async () => {
      prisma.workflowRule.findMany.mockResolvedValue([RULE]);
      const now = new Date('2026-07-04T10:00:00Z');
      const s = await service.tick(now);
      expect(hermes.dispatchTrigger).toHaveBeenCalledWith(
        'club-1',
        'DEBT_ESCALATION',
        { userId: 'u1', clubId: 'club-1' },
        { scheduled: true, scheduleType: 'DAILY' },
        'SCHED:DEBT_ESCALATION:DAILY:2026-07-04',
        { scheduleType: 'DAILY' }, // POLISH-001: engine lọc đúng scheduleType
      );
      expect(s.dispatched).toBe(1);
      expect(s.failedGroups).toBe(0);
    });

    it('tenant isolation: rule 2 club → 2 dispatch riêng, mỗi dispatch đúng clubId', async () => {
      prisma.workflowRule.findMany.mockResolvedValue([
        RULE,
        { ...RULE, id: 'r2', clubId: 'club-2', createdById: 'u2' },
      ]);
      await service.tick(new Date('2026-07-04T10:00:00Z'));
      expect(hermes.dispatchTrigger).toHaveBeenCalledTimes(2);
      const clubs = dispatchCalls().map((c) => c[0]);
      expect(clubs.sort()).toEqual(['club-1', 'club-2']);
    });

    it('duplicate prevention: 2 tick cùng kỳ → cùng key; engine trả skippedDuplicate được đếm', async () => {
      prisma.workflowRule.findMany.mockResolvedValue([RULE]);
      const now = new Date('2026-07-04T10:00:00Z');
      await service.tick(now);
      hermes.dispatchTrigger.mockResolvedValue({
        ...OK_SUMMARY,
        skippedDuplicate: true,
        createdRuns: 0,
      });
      const s2 = await service.tick(new Date('2026-07-04T11:00:00Z'));
      // Cùng kỳ DAILY → key giống hệt lần 1 → engine skip.
      const keys = dispatchCalls().map((c) => c[4]);
      expect(keys[0]).toBe(keys[1]);
      expect(s2.skippedDuplicate).toBe(1);
      expect(s2.dispatched).toBe(0);
    });

    it('partial failure: nhóm 1 lỗi → nhóm 2 vẫn dispatch, không throw', async () => {
      prisma.workflowRule.findMany.mockResolvedValue([
        RULE,
        { ...RULE, id: 'r2', clubId: 'club-2', createdById: 'u2' },
      ]);
      hermes.dispatchTrigger
        .mockRejectedValueOnce(new Error('BOOM_SECRET'))
        .mockResolvedValueOnce({ ...OK_SUMMARY });
      const s = await service.tick();
      expect(s.failedGroups).toBe(1);
      expect(s.dispatched).toBe(1);
      expect(hermes.dispatchTrigger).toHaveBeenCalledTimes(2);
    });

    it('rule cùng club + trigger + lịch → gom 1 nhóm, dispatch 1 lần', async () => {
      prisma.workflowRule.findMany.mockResolvedValue([
        RULE,
        { ...RULE, id: 'r2' },
      ]);
      const s = await service.tick();
      expect(s.groups).toBe(1);
      expect(hermes.dispatchTrigger).toHaveBeenCalledTimes(1);
    });
  });

  describe('run-now (manual, tenant-scoped)', () => {
    it('chỉ dispatch rule của CLB actor; idempotent theo kỳ', async () => {
      prisma.workflowRule.findMany.mockResolvedValue([RULE]);
      const r = await service.runNow('club-1', 'admin-1');
      const where: unknown = expect.objectContaining({
        clubId: 'club-1',
        enabled: true,
      });
      expect(prisma.workflowRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where }),
      );
      const call = dispatchCalls()[0];
      expect(call[0]).toBe('club-1');
      expect(call[2]).toEqual({ userId: 'admin-1', clubId: 'club-1' });
      expect(String(call[4])).toMatch(/^SCHED:DEBT_ESCALATION:DAILY:/);
      // POLISH-001: run-now cũng truyền filter scheduleType cho engine.
      expect(call[5]).toEqual({ scheduleType: 'DAILY' });
      expect(r.groups).toBe(1);
      expect(r.failed).toBe(0);
    });

    it('run-now lỗi 1 nhóm → đếm failed, không throw', async () => {
      prisma.workflowRule.findMany.mockResolvedValue([RULE]);
      hermes.dispatchTrigger.mockRejectedValueOnce(new Error('DOWN'));
      const r = await service.runNow('club-1', 'admin-1');
      expect(r.failed).toBe(1);
    });
  });

  describe('history + status', () => {
    it('history: lọc run có idempotencyKey SCHED:* từ listRuns (đã sanitize)', async () => {
      hermes.listRuns.mockResolvedValue([
        {
          id: 'run-1',
          idempotencyKey: 'SCHED:DEBT_ESCALATION:DAILY:2026-07-04',
        },
        { id: 'run-2', idempotencyKey: null },
        { id: 'run-3', idempotencyKey: 'ATTENDANCE_COMPLETED:s1' },
      ]);
      const h = await service.history('club-1');
      expect(hermes.listRuns).toHaveBeenCalledWith('club-1', {});
      expect(h.map((r) => r.id)).toEqual(['run-1']);
    });

    it('status: interval + scheduleTypes + lastTick sau tick', async () => {
      prisma.workflowRule.findMany.mockResolvedValue([RULE]);
      await service.tick(new Date('2026-07-04T10:00:00Z'));
      const st = service.status();
      expect(st.supportedScheduleTypes).toEqual([
        'MANUAL',
        'DAILY',
        'WEEKLY',
        'MONTHLY',
      ]);
      expect(st.lastTick?.dispatched).toBe(1);
    });
  });

  /**
   * Regression POLISH-001 (engine THẬT, không mock dispatchTrigger):
   * rule MANUAL trùng triggerType với rule scheduled KHÔNG được tự chạy.
   * Prisma mock lọc theo where thật (scheduleType/enabled/triggerType/clubId)
   * để chứng minh query của engine loại rule MANUAL.
   */
  describe('regression POLISH-001: MANUAL không tự chạy khi trùng triggerType', () => {
    interface RuleRow {
      id: string;
      clubId: string;
      name: string;
      triggerType: string;
      enabled: boolean;
      scheduleType: string;
      conditionsJson: unknown;
      actionsJson: unknown;
      createdById: string;
      priority: number;
    }
    interface RuleWhere {
      clubId?: string;
      triggerType?: string;
      enabled?: boolean;
      scheduleType?: string | { in: string[] };
    }

    const RULE_MANUAL: RuleRow = {
      id: 'rule-manual',
      clubId: 'club-1',
      name: 'Rule A (MANUAL)',
      triggerType: 'EVENT_REMINDER',
      enabled: true,
      scheduleType: 'MANUAL',
      conditionsJson: null, // luôn khớp — nếu bị đánh giá sẽ tạo run + action
      actionsJson: [
        {
          type: 'CREATE_AI_ACTION',
          targetModule: 'events',
          riskLevel: 'LOW',
          title: 'Manual action',
        },
      ],
      createdById: 'u1',
      priority: 100,
    };
    const RULE_DAILY: RuleRow = {
      ...RULE_MANUAL,
      id: 'rule-daily',
      name: 'Rule B (DAILY)',
      scheduleType: 'DAILY',
    };

    interface RunCreateArg {
      data: { workflowRuleId: string } & Record<string, unknown>;
    }
    const enginePrisma = {
      workflowRule: { findMany: jest.fn() },
      workflowRun: {
        findFirst: jest.fn(),
        create: jest.fn<Promise<Record<string, unknown>>, [RunCreateArg]>(),
        update: jest.fn(),
      },
    };
    const aiActions = { create: jest.fn() };

    const createdRunRuleIds = (): string[] =>
      enginePrisma.workflowRun.create.mock.calls.map(
        (c) => c[0].data.workflowRuleId,
      );

    function matchWhere(r: RuleRow, where: RuleWhere): boolean {
      if (where.clubId !== undefined && r.clubId !== where.clubId) return false;
      if (
        where.triggerType !== undefined &&
        r.triggerType !== where.triggerType
      )
        return false;
      if (where.enabled !== undefined && r.enabled !== where.enabled)
        return false;
      if (where.scheduleType !== undefined) {
        if (typeof where.scheduleType === 'string') {
          if (r.scheduleType !== where.scheduleType) return false;
        } else if (!where.scheduleType.in.includes(r.scheduleType)) {
          return false;
        }
      }
      return true;
    }

    async function makeIntegration(): Promise<{
      scheduler: HermesSchedulerService;
      engine: HermesWorkflowService;
    }> {
      const config = { get: jest.fn().mockReturnValue(undefined) };
      const mod: TestingModule = await Test.createTestingModule({
        providers: [
          HermesSchedulerService,
          HermesWorkflowService, // engine THẬT
          { provide: PrismaService, useValue: enginePrisma },
          { provide: AiActionsService, useValue: aiActions },
          { provide: AgentActivityService, useValue: activity },
          { provide: ConfigService, useValue: config },
        ],
      }).compile();
      return {
        scheduler: mod.get(HermesSchedulerService),
        engine: mod.get(HermesWorkflowService),
      };
    }

    beforeEach(() => {
      jest.clearAllMocks();
      // Query lọc theo where THẬT trên "DB" 2 rule.
      enginePrisma.workflowRule.findMany.mockImplementation(
        (arg: { where: RuleWhere }) =>
          Promise.resolve(
            [RULE_MANUAL, RULE_DAILY].filter((r) => matchWhere(r, arg.where)),
          ),
      );
      enginePrisma.workflowRun.findFirst.mockResolvedValue(null);
      let n = 0;
      enginePrisma.workflowRun.create.mockImplementation(
        (arg: { data: Record<string, unknown> }) => {
          n += 1;
          return Promise.resolve({ id: `run-${n}`, ...arg.data });
        },
      );
      enginePrisma.workflowRun.update.mockImplementation(
        (arg: { where: { id: string }; data: Record<string, unknown> }) =>
          Promise.resolve({ id: arg.where.id, ...arg.data }),
      );
      aiActions.create.mockResolvedValue({ id: 'act-1' });
    });

    it('tick DAILY: CHỈ Rule B tạo WorkflowRun + AiAction; Rule A (MANUAL) tạo 0', async () => {
      const { scheduler } = await makeIntegration();
      const s = await scheduler.tick(new Date('2026-07-04T10:00:00Z'));
      expect(s.dispatched).toBe(1);
      expect(createdRunRuleIds()).toEqual(['rule-daily']); // KHÔNG có rule-manual
      expect(aiActions.create).toHaveBeenCalledTimes(1); // chỉ action của Rule B
    });

    it('run-now: MANUAL cùng triggerType cũng KHÔNG được đánh giá', async () => {
      const { scheduler } = await makeIntegration();
      const r = await scheduler.runNow('club-1', 'admin-1');
      expect(r.groups).toBe(1);
      expect(createdRunRuleIds()).toEqual(['rule-daily']);
    });

    it('business event dispatch (không options) GIỮ NGUYÊN: đánh giá cả MANUAL lẫn DAILY', async () => {
      const { engine } = await makeIntegration();
      const s = await engine.dispatchTrigger(
        'club-1',
        'EVENT_REMINDER',
        { userId: 'u1', clubId: 'club-1' },
        {},
      );
      expect(s.totalRules).toBe(2);
      expect(s.createdRuns).toBe(2);
      expect(createdRunRuleIds().sort()).toEqual(['rule-daily', 'rule-manual']);
    });
  });
});
