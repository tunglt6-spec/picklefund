import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
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
      expect(run.status).toBe('CANCELLED');
      expect(aiActions.create).not.toHaveBeenCalled();
    });

    it('điều kiện KHÔNG khớp → COMPLETED matched:false, KHÔNG tạo AiAction', async () => {
      prisma.workflowRule.findFirst.mockResolvedValue(RULE_BASE);
      const run = await service.testTrigger('r1', 'club-1', ACTOR, {
        unpaidCount: 0,
      });
      expect(run.status).toBe('COMPLETED');
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
      expect(run.status).toBe('WAITING_APPROVAL');
    });

    it('điều kiện lỗi (op không hỗ trợ) → FAILED an toàn, không ném ra ngoài', async () => {
      prisma.workflowRule.findFirst.mockResolvedValue({
        ...RULE_BASE,
        conditionsJson: { field: 'x', op: 'BOGUS', value: 1 },
      });
      const run = await service.testTrigger('r1', 'club-1', ACTOR, { x: 1 });
      expect(run.status).toBe('FAILED');
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
      expect(run.status).toBe('COMPLETED');
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
      expect(run.status).toBe('FAILED');
      expect(run.errorMessage).toBe('Workflow thất bại. Xem log máy chủ.');
      expect(String(run.errorMessage)).not.toContain('BOGUS_SECRET_OP');
    });
  });
});
