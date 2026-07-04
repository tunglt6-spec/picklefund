import { Test, TestingModule } from '@nestjs/testing';
import { HermesEventPublisher } from './hermes-event.publisher';
import { HermesWorkflowService } from './hermes-workflow.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiActionsService } from '../ai-actions/ai-actions.service';

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('HermesEventPublisher (EPIC7)', () => {
  describe('unit — hợp đồng an toàn với business module', () => {
    let publisher: HermesEventPublisher;
    const hermes = { dispatchTrigger: jest.fn() };

    beforeEach(async () => {
      jest.clearAllMocks();
      hermes.dispatchTrigger.mockResolvedValue({
        triggerType: 'EXPENSE_RECORDED',
        totalRules: 1,
        matchedRules: 1,
        createdRuns: 1,
        createdActions: 1,
        failedRuns: 0,
        skippedDuplicate: false,
      });
      const mod: TestingModule = await Test.createTestingModule({
        providers: [
          HermesEventPublisher,
          { provide: HermesWorkflowService, useValue: hermes },
        ],
      }).compile();
      publisher = mod.get(HermesEventPublisher);
    });

    it('publish → dispatchTrigger nhận đúng clubId/trigger/actor/context/key', async () => {
      publisher.publish({
        clubId: 'club-1',
        userId: 'u1',
        triggerType: 'EXPENSE_RECORDED',
        context: { expenseId: 'exp-1' },
        idempotencyKey: 'EXPENSE_RECORDED:exp-1',
      });
      await flush();
      expect(hermes.dispatchTrigger).toHaveBeenCalledWith(
        'club-1',
        'EXPENSE_RECORDED',
        { userId: 'u1', clubId: 'club-1' },
        { expenseId: 'exp-1' },
        'EXPENSE_RECORDED:exp-1',
      );
    });

    it('dispatch reject → publish KHÔNG throw (business đã commit, chỉ log)', async () => {
      hermes.dispatchTrigger.mockRejectedValue(new Error('HERMES_DOWN'));
      expect(() =>
        publisher.publish({
          clubId: 'club-1',
          userId: 'u1',
          triggerType: 'EXPENSE_RECORDED',
        }),
      ).not.toThrow();
      await flush(); // lỗi async được nuốt trong .catch — không unhandled rejection
      expect(hermes.dispatchTrigger).toHaveBeenCalledTimes(1);
    });

    it('thiếu clubId hoặc userId → bỏ qua an toàn, KHÔNG dispatch', async () => {
      publisher.publish({ clubId: null, userId: 'u1', triggerType: 'X' });
      publisher.publish({ clubId: 'club-1', userId: '', triggerType: 'X' });
      await flush();
      expect(hermes.dispatchTrigger).not.toHaveBeenCalled();
    });
  });

  describe('integration chain — event → Hermes engine thật → Run + AiAction', () => {
    const prisma = {
      workflowRule: { findMany: jest.fn() },
      workflowRun: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const aiActions = { create: jest.fn() };

    it('ATTENDANCE_COMPLETED khớp rule → WorkflowRun tạo + AiAction (HERMES) tạo', async () => {
      jest.clearAllMocks();
      prisma.workflowRun.findFirst.mockResolvedValue(null);
      prisma.workflowRun.create.mockImplementation(
        (arg: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'run-1', ...arg.data }),
      );
      prisma.workflowRun.update.mockImplementation(
        (arg: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'run-1', ...arg.data }),
      );
      aiActions.create.mockResolvedValue({ id: 'act-1' });
      prisma.workflowRule.findMany.mockResolvedValue([
        {
          id: 'r1',
          clubId: 'club-1',
          name: 'Nhắc chi phí sau buổi tập',
          triggerType: 'ATTENDANCE_COMPLETED',
          enabled: true,
          conditionsJson: {
            all: [{ field: 'presentCount', op: 'gte', value: 1 }],
          },
          actionsJson: [
            {
              type: 'CREATE_AI_ACTION',
              targetModule: 'attendance',
              riskLevel: 'LOW',
              title: 'Nhắc nhập chi phí sân',
            },
          ],
        },
      ]);

      const mod: TestingModule = await Test.createTestingModule({
        providers: [
          HermesEventPublisher,
          HermesWorkflowService,
          { provide: PrismaService, useValue: prisma },
          { provide: AiActionsService, useValue: aiActions },
        ],
      }).compile();
      const publisher = mod.get(HermesEventPublisher);

      publisher.publish({
        clubId: 'club-1',
        userId: 'u1',
        triggerType: 'ATTENDANCE_COMPLETED',
        context: { sessionId: 's1', presentCount: 6 },
        idempotencyKey: 'ATTENDANCE_COMPLETED:s1',
      });
      await flush();

      // WorkflowRun được tạo với idempotencyKey + tenant scope.
      const runData: unknown = expect.objectContaining({
        clubId: 'club-1',
        triggerType: 'ATTENDANCE_COMPLETED',
        idempotencyKey: 'ATTENDANCE_COMPLETED:s1',
      });
      expect(prisma.workflowRun.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: runData }),
      );
      // AiAction đi qua Action Center với requestedByAi HERMES (không thực thi trực tiếp).
      const actArg: unknown = expect.objectContaining({
        requestedByAi: 'HERMES',
      });
      expect(aiActions.create).toHaveBeenCalledWith('club-1', 'u1', actArg);
    });

    it('idempotencyKey đã dùng → không tạo run/action mới (dispatch trùng bị skip)', async () => {
      jest.clearAllMocks();
      prisma.workflowRun.findFirst.mockResolvedValue({ id: 'run-old' });

      const mod: TestingModule = await Test.createTestingModule({
        providers: [
          HermesEventPublisher,
          HermesWorkflowService,
          { provide: PrismaService, useValue: prisma },
          { provide: AiActionsService, useValue: aiActions },
        ],
      }).compile();
      const publisher = mod.get(HermesEventPublisher);

      publisher.publish({
        clubId: 'club-1',
        userId: 'u1',
        triggerType: 'ATTENDANCE_COMPLETED',
        context: { sessionId: 's1' },
        idempotencyKey: 'ATTENDANCE_COMPLETED:s1',
      });
      await flush();

      expect(prisma.workflowRun.create).not.toHaveBeenCalled();
      expect(aiActions.create).not.toHaveBeenCalled();
    });
  });
});
