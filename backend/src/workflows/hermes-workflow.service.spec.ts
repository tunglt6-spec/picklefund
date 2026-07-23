import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  HermesWorkflowService,
  type WorkflowActor,
} from './hermes-workflow.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiActionsService } from '../ai-actions/ai-actions.service';

const prisma = {
  workflowRule: {
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn().mockResolvedValue({}),
  },
  workflowRun: {
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
  },
  fundPeriod: { findFirst: jest.fn(), count: jest.fn() },
  member: { count: jest.fn() },
  fundContribution: { findMany: jest.fn() },
  attendanceSession: { count: jest.fn() },
};

const aiActions = { create: jest.fn().mockResolvedValue({ id: 'act-1' }) };

const ACTOR: WorkflowActor = { userId: 'u1', clubId: 'club-1' };

const RULE_BASE = {
  id: 'r1',
  clubId: 'club-1',
  triggerType: 'DEBT_ESCALATION',
  name: 'Debt',
  enabled: true,
  conditionsJson: { all: [{ field: 'unpaidCount', op: 'gte', value: 1 }] },
  actionsJson: [
    {
      type: 'CREATE_AI_ACTION',
      targetModule: 'contributions',
      riskLevel: 'MEDIUM',
      title: 'Nhắc nợ',
    },
  ],
};

describe('HermesWorkflowService', () => {
  let service: HermesWorkflowService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // clearAllMocks KHÔNG xoá implementation → đặt lại default để dedup-guard (findFirst)
    // không rò rỉ giá trị truthy giữa các test; test cần rule tồn tại tự set lại.
    prisma.workflowRule.findFirst.mockResolvedValue(null);
    prisma.workflowRule.findMany.mockResolvedValue([]);
    prisma.workflowRun.findMany.mockResolvedValue([]);
    aiActions.create.mockResolvedValue({ id: 'act-1' });
    // create/update trả về data đã merge để test đọc status.
    prisma.workflowRun.create.mockImplementation(
      (arg: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'run-1', ...arg.data }),
    );
    prisma.workflowRun.update.mockImplementation(
      (arg: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'run-1', ...arg.data }),
    );
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        HermesWorkflowService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiActionsService, useValue: aiActions },
      ],
    }).compile();
    service = mod.get(HermesWorkflowService);
  });

  describe('tenant isolation', () => {
    it('Forbidden khi không có clubId', async () => {
      await expect(service.listRules(null)).rejects.toThrow(ForbiddenException);
      await expect(service.listRuns(null, {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rule scope theo clubId từ JWT', async () => {
      await service.listRules('club-1');
      expect(prisma.workflowRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clubId: 'club-1' } }),
      );
    });

    it('cross-club → NotFound (findFirst null)', async () => {
      prisma.workflowRule.findFirst.mockResolvedValue(null);
      await expect(service.updateRule('r1', 'club-1', {})).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.workflowRule.findFirst).toHaveBeenCalledWith({
        where: { id: 'r1', clubId: 'club-1' },
      });
    });
  });

  describe('CRUD', () => {
    it('createRule scope clubId + createdBy', async () => {
      prisma.workflowRule.create.mockResolvedValue({ id: 'r1' });
      await service.createRule('club-1', 'u1', {
        name: 'Debt',
        triggerType: 'DEBT_ESCALATION',
      });
      const data: unknown = expect.objectContaining({
        clubId: 'club-1',
        createdById: 'u1',
        name: 'Debt',
      });
      expect(prisma.workflowRule.create).toHaveBeenCalledWith(
        expect.objectContaining({ data }),
      );
    });

    // ── Phase 1: chống tạo Rule TRÙNG (dedup theo clubId + triggerType + scopeKey) ──
    it('createRule CHẶN khi đã có rule trùng (409), KHÔNG tạo bản mới', async () => {
      prisma.workflowRule.findFirst.mockResolvedValue({ id: 'canon', name: 'Debt' });
      await expect(
        service.createRule('club-1', 'u1', {
          name: 'Debt',
          triggerType: 'DEBT_ESCALATION',
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.workflowRule.create).not.toHaveBeenCalled();
      // dedup query đúng scope canonical (scopeKey null)
      expect(prisma.workflowRule.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clubId: 'club-1', triggerType: 'DEBT_ESCALATION', scopeKey: null },
        }),
      );
    });

    it('createRule allowDuplicate=true → BỎ QUA dedup, tạo biến thể', async () => {
      prisma.workflowRule.findFirst.mockResolvedValue({ id: 'canon', name: 'Debt' });
      prisma.workflowRule.create.mockResolvedValue({ id: 'r2' });
      await service.createRule('club-1', 'u1', {
        name: 'Debt v2',
        triggerType: 'DEBT_ESCALATION',
        allowDuplicate: true,
      });
      expect(prisma.workflowRule.findFirst).not.toHaveBeenCalled();
      expect(prisma.workflowRule.create).toHaveBeenCalled();
    });

    it('createRule scopeKey KHÁC → không coi là trùng, vẫn tạo', async () => {
      prisma.workflowRule.findFirst.mockResolvedValue(null); // không có rule cùng scope
      prisma.workflowRule.create.mockResolvedValue({ id: 'r3' });
      await service.createRule('club-1', 'u1', {
        name: 'Debt kỳ Q3',
        triggerType: 'DEBT_ESCALATION',
        scopeKey: 'fundPeriod:q3',
      });
      expect(prisma.workflowRule.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clubId: 'club-1', triggerType: 'DEBT_ESCALATION', scopeKey: 'fundPeriod:q3' },
        }),
      );
      expect(prisma.workflowRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scopeKey: 'fundPeriod:q3' }),
        }),
      );
    });

    it('deleteRule kiểm tra tenant trước khi xoá', async () => {
      prisma.workflowRule.findFirst.mockResolvedValue({
        id: 'r1',
        clubId: 'club-1',
      });
      const r = await service.deleteRule('r1', 'club-1');
      expect(prisma.workflowRule.delete).toHaveBeenCalledWith({
        where: { id: 'r1' },
      });
      expect(r.deleted).toBe(true);
    });
  });

  describe('testTrigger engine', () => {
    it('rule disabled → CANCELLED, KHÔNG tạo AiAction', async () => {
      prisma.workflowRule.findFirst.mockResolvedValue({
        ...RULE_BASE,
        enabled: false,
      });
      const run = await service.testTrigger('r1', 'club-1', ACTOR, {
        unpaidCount: 5,
      });
      expect(run).toMatchObject({ status: 'CANCELLED' });
      expect(aiActions.create).not.toHaveBeenCalled();
    });

    it('điều kiện KHÔNG khớp → COMPLETED matched:false, KHÔNG tạo AiAction', async () => {
      prisma.workflowRule.findFirst.mockResolvedValue(RULE_BASE);
      const run = await service.testTrigger('r1', 'club-1', ACTOR, {
        unpaidCount: 0,
      });
      expect(run).toMatchObject({ status: 'COMPLETED' });
      expect(aiActions.create).not.toHaveBeenCalled();
    });

    it('điều kiện khớp → tạo AiAction (HERMES) qua Action Center → WAITING_APPROVAL', async () => {
      prisma.workflowRule.findFirst.mockResolvedValue(RULE_BASE);
      const run = await service.testTrigger('r1', 'club-1', ACTOR, {
        unpaidCount: 3,
      });
      expect(aiActions.create).toHaveBeenCalledTimes(1);
      const createArg: unknown = expect.objectContaining({
        requestedByAi: 'HERMES',
      });
      expect(aiActions.create).toHaveBeenCalledWith('club-1', 'u1', createArg);
      expect(run).toMatchObject({ status: 'WAITING_APPROVAL' });
    });

    it('điều kiện lỗi (op không hỗ trợ) → FAILED an toàn, không ném ra ngoài', async () => {
      prisma.workflowRule.findFirst.mockResolvedValue({
        ...RULE_BASE,
        conditionsJson: { field: 'x', op: 'BOGUS', value: 1 },
      });
      const run = await service.testTrigger('r1', 'club-1', ACTOR, { x: 1 });
      expect(run).toMatchObject({ status: 'FAILED' });
      expect(aiActions.create).not.toHaveBeenCalled();
    });

    it('không có action operational → COMPLETED (matched, 0 AiAction)', async () => {
      prisma.workflowRule.findFirst.mockResolvedValue({
        ...RULE_BASE,
        actionsJson: [{ type: 'LOG' }],
      });
      const run = await service.testTrigger('r1', 'club-1', ACTOR, {
        unpaidCount: 2,
      });
      expect(run).toMatchObject({ status: 'COMPLETED' });
      expect(aiActions.create).not.toHaveBeenCalled();
    });
  });

  describe('response sanitization (POLISH)', () => {
    it('WorkflowRun response KHÔNG có contextJson; có contextSummary', async () => {
      prisma.workflowRule.findFirst.mockResolvedValue({
        ...RULE_BASE,
        enabled: false,
      });
      const run = (await service.testTrigger('r1', 'club-1', ACTOR, {
        secret: 'X',
        n: 1,
      })) as Record<string, unknown>;
      expect('contextJson' in run).toBe(false);
      const cs = run.contextSummary as {
        fieldNames: string[];
        fieldCount: number;
      };
      expect(cs.fieldCount).toBe(2);
      expect(cs.fieldNames.sort()).toEqual(['n', 'secret']);
      // KHÔNG lộ giá trị context
      expect(JSON.stringify(run)).not.toContain('"X"');
    });

    it('WorkflowRule response KHÔNG có actionsJson thô/requestPayload; có actionSummary', async () => {
      prisma.workflowRule.create.mockResolvedValue({
        id: 'r1',
        name: 'Debt',
        triggerType: 'DEBT_ESCALATION',
        conditionsJson: {},
        actionsJson: [
          {
            type: 'CREATE_AI_ACTION',
            targetModule: 'contributions',
            riskLevel: 'MEDIUM',
            requestPayload: { secretToken: 'LEAK', memberIds: ['m1'] },
          },
        ],
      });
      const rule = (await service.createRule('club-1', 'u1', {
        name: 'Debt',
        triggerType: 'DEBT_ESCALATION',
      })) as Record<string, unknown>;
      expect('actionsJson' in rule).toBe(false);
      const sum = rule.actionSummary as Array<{
        type: string;
        payloadFieldNames: string[];
      }>;
      expect(sum[0].type).toBe('CREATE_AI_ACTION');
      expect(sum[0].payloadFieldNames.sort()).toEqual([
        'memberIds',
        'secretToken',
      ]);
      expect(JSON.stringify(rule)).not.toContain('LEAK');
    });

    it('errorMessage lưu là generic (không raw), không lộ chi tiết op', async () => {
      prisma.workflowRule.findFirst.mockResolvedValue({
        ...RULE_BASE,
        conditionsJson: { field: 'x', op: 'BOGUS_SECRET_OP', value: 1 },
      });
      const run = (await service.testTrigger('r1', 'club-1', ACTOR, {
        x: 1,
      })) as Record<string, unknown>;
      expect(run).toMatchObject({ status: 'FAILED' });
      expect(run.errorMessage).toBe('Workflow thất bại. Xem log máy chủ.');
      expect(String(run.errorMessage)).not.toContain('BOGUS_SECRET_OP');
    });
  });

  describe('dispatchTrigger runtime (EPIC6)', () => {
    const RULE2 = { ...RULE_BASE, id: 'r2', name: 'Debt 2' };

    it('Forbidden khi không có clubId; BadRequest khi triggerType không hỗ trợ', async () => {
      await expect(
        service.dispatchTrigger(null, 'DEBT_ESCALATION', ACTOR),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.dispatchTrigger('club-1', 'NOT_A_TRIGGER', ACTOR),
      ).rejects.toThrow(BadRequestException);
    });

    it('đánh giá NHIỀU rule enabled (query lọc enabled:true), summary đếm đúng', async () => {
      prisma.workflowRule.findMany.mockResolvedValue([RULE_BASE, RULE2]);
      const s = await service.dispatchTrigger(
        'club-1',
        'DEBT_ESCALATION',
        ACTOR,
        { unpaidCount: 3 },
      );
      // Rule disabled bị loại ngay từ query (enabled: true).
      expect(prisma.workflowRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            clubId: 'club-1',
            triggerType: 'DEBT_ESCALATION',
            enabled: true,
          },
        }),
      );
      expect(s.totalRules).toBe(2);
      expect(s.createdRuns).toBe(2);
      expect(s.matchedRules).toBe(2);
      expect(s.createdActions).toBe(2);
      expect(s.failedRuns).toBe(0);
      // Mỗi rule khớp tạo AiAction qua Action Center với requestedByAi HERMES.
      expect(aiActions.create).toHaveBeenCalledTimes(2);
      const hermesArg: unknown = expect.objectContaining({
        requestedByAi: 'HERMES',
      });
      expect(aiActions.create).toHaveBeenCalledWith('club-1', 'u1', hermesArg);
    });

    it('options.scheduleType (POLISH Epic9) → query lọc thêm scheduleType', async () => {
      prisma.workflowRule.findMany.mockResolvedValue([]);
      await service.dispatchTrigger(
        'club-1',
        'DEBT_ESCALATION',
        ACTOR,
        {},
        undefined,
        { scheduleType: 'DAILY' },
      );
      expect(prisma.workflowRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            clubId: 'club-1',
            triggerType: 'DEBT_ESCALATION',
            enabled: true,
            scheduleType: 'DAILY',
          },
        }),
      );
    });

    it('1 rule lỗi → run FAILED, rule khác vẫn chạy (partial summary)', async () => {
      const badRule = {
        ...RULE_BASE,
        id: 'r-bad',
        conditionsJson: { field: 'x', op: 'BOGUS', value: 1 },
      };
      prisma.workflowRule.findMany.mockResolvedValue([badRule, RULE2]);
      const s = await service.dispatchTrigger(
        'club-1',
        'DEBT_ESCALATION',
        ACTOR,
        { unpaidCount: 3, x: 1 },
      );
      expect(s.createdRuns).toBe(2);
      expect(s.failedRuns).toBe(1);
      expect(s.matchedRules).toBe(1);
      expect(s.createdActions).toBe(1);
    });

    it('summary sanitized: chỉ số đếm, không lộ giá trị context', async () => {
      prisma.workflowRule.findMany.mockResolvedValue([RULE_BASE]);
      const s = await service.dispatchTrigger(
        'club-1',
        'DEBT_ESCALATION',
        ACTOR,
        { unpaidCount: 9, secretNote: 'TOP_SECRET_VALUE' },
      );
      expect(Object.keys(s).sort()).toEqual(
        [
          'createdActions',
          'createdRuns',
          'failedRuns',
          'matchedRules',
          'skippedDuplicate',
          'totalRules',
          'triggerType',
        ].sort(),
      );
      expect(JSON.stringify(s)).not.toContain('TOP_SECRET_VALUE');
    });

    it('idempotencyKey đã dùng → skippedDuplicate, KHÔNG tạo run/action mới', async () => {
      prisma.workflowRun.findFirst.mockResolvedValue({ id: 'run-old' });
      const s = await service.dispatchTrigger(
        'club-1',
        'DEBT_ESCALATION',
        ACTOR,
        {},
        'key-1',
      );
      expect(s.skippedDuplicate).toBe(true);
      expect(s.createdRuns).toBe(0);
      expect(prisma.workflowRun.create).not.toHaveBeenCalled();
      expect(aiActions.create).not.toHaveBeenCalled();
    });

    it('idempotencyKey mới → chạy bình thường, key lưu vào run', async () => {
      prisma.workflowRun.findFirst.mockResolvedValue(null);
      prisma.workflowRule.findMany.mockResolvedValue([RULE_BASE]);
      const s = await service.dispatchTrigger(
        'club-1',
        'DEBT_ESCALATION',
        ACTOR,
        { unpaidCount: 3 },
        'key-2',
      );
      expect(s.skippedDuplicate).toBe(false);
      expect(s.createdRuns).toBe(1);
      const dataArg: unknown = expect.objectContaining({
        idempotencyKey: 'key-2',
      });
      expect(prisma.workflowRun.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: dataArg }),
      );
    });
  });

  describe('buildLiveContext (dữ liệu thật)', () => {
    it('DEBT_ESCALATION: unpaidCount = members - đã đóng (period active)', async () => {
      prisma.fundPeriod.findFirst.mockResolvedValue({ id: 'fp-1' });
      prisma.member.count.mockResolvedValue(10);
      prisma.fundContribution.findMany.mockResolvedValue([
        { memberId: 'm1' },
        { memberId: 'm2' },
        { memberId: 'm3' },
      ]);
      const ctx = await service.buildLiveContext('club-1', 'DEBT_ESCALATION');
      expect(ctx).toEqual({
        unpaidCount: 7,
        memberCount: 10,
        paidCount: 3,
        hasActivePeriod: true,
      });
    });

    it('DEBT_ESCALATION: không có period active → unpaidCount 0', async () => {
      prisma.fundPeriod.findFirst.mockResolvedValue(null);
      const ctx = await service.buildLiveContext('club-1', 'DEBT_ESCALATION');
      expect(ctx).toEqual({ unpaidCount: 0, hasActivePeriod: false });
    });

    it('EVENT_REMINDER: đếm session sắp tới', async () => {
      prisma.attendanceSession.count.mockResolvedValue(4);
      const ctx = await service.buildLiveContext('club-1', 'EVENT_REMINDER');
      expect(ctx).toEqual({ upcomingSessions: 4 });
    });

    it('REPORT_DISPATCH: periodFinalized true khi có kỳ chốt', async () => {
      prisma.fundPeriod.count.mockResolvedValue(2);
      const ctx = await service.buildLiveContext('club-1', 'REPORT_DISPATCH');
      expect(ctx).toEqual({ periodFinalized: true, finalizedCount: 2 });
    });
  });

  describe('dispatchLive', () => {
    it('dùng live context để dispatch + trả liveContext; khớp → tạo AiAction', async () => {
      prisma.fundPeriod.findFirst.mockResolvedValue({ id: 'fp-1' });
      prisma.member.count.mockResolvedValue(5);
      prisma.fundContribution.findMany.mockResolvedValue([{ memberId: 'm1' }]);
      prisma.workflowRun.findFirst.mockResolvedValue(null);
      prisma.workflowRule.findMany.mockResolvedValue([RULE_BASE]); // cond unpaidCount>=1
      const r = await service.dispatchLive('club-1', 'DEBT_ESCALATION', ACTOR);
      expect(r.liveContext).toEqual({
        unpaidCount: 4,
        memberCount: 5,
        paidCount: 1,
        hasActivePeriod: true,
      });
      expect(r.matchedRules).toBe(1);
      expect(r.createdActions).toBe(1);
      expect(aiActions.create).toHaveBeenCalled();
    });

    it('trigger không hỗ trợ → BadRequest', async () => {
      await expect(
        service.dispatchLive('club-1', 'NOPE', ACTOR),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
