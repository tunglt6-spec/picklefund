import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AiActionsService, type ActionActor } from './ai-actions.service';
import { PrismaService } from '../prisma/prisma.service';
import { MaikaCore } from '../ai/maika/maika.service';
import { NotificationRuntimeService } from '../notification-runtime/notification-runtime.service';
import { ACTION_EXECUTOR } from './action-executor';
import { AidoGateway } from '../aido/aido.gateway';

const prisma = {
  aiAction: {
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  aiActionEvent: {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
  },
  auditLog: { create: jest.fn().mockResolvedValue({}) },
  $transaction: jest.fn(),
};

const maika = {
  listApprovalPolicies: jest.fn().mockReturnValue([
    {
      riskLevel: 'high',
      requiredApprovalCount: 2,
      requiredRoles: ['SUPER_ADMIN', 'CLUB_ADMIN'],
    },
  ]),
};

const executor = { execute: jest.fn().mockResolvedValue({ executed: true }) };

const notifications = { dispatch: jest.fn().mockResolvedValue(null) };

const ACTOR: ActionActor = {
  userId: 'u1',
  clubId: 'club-1',
  username: 'admin',
  role: 'CLUB_ADMIN',
};

describe('AiActionsService', () => {
  let service: AiActionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.aiAction.findMany.mockResolvedValue([]);
    prisma.aiAction.count.mockResolvedValue(0);
    prisma.aiAction.update.mockResolvedValue({});
    prisma.aiAction.groupBy.mockResolvedValue([]);
    prisma.aiActionEvent.create.mockResolvedValue({});
    prisma.aiActionEvent.findMany.mockResolvedValue([]);
    prisma.auditLog.create.mockResolvedValue({});
    prisma.aiAction.updateMany.mockResolvedValue({ count: 1 });
    prisma.aiAction.update.mockResolvedValue({});
    executor.execute.mockResolvedValue({ executed: true });
    // $transaction: hỗ trợ cả interactive (callback) lẫn array form.
    prisma.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: typeof prisma) => Promise<unknown>)(prisma)
        : Promise.all(arg as Promise<unknown>[]),
    );
    notifications.dispatch.mockResolvedValue(null);
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        AiActionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MaikaCore, useValue: maika },
        { provide: NotificationRuntimeService, useValue: notifications },
        { provide: ACTION_EXECUTOR, useValue: executor },
        { provide: AidoGateway, useValue: { emitAgentUpdate: jest.fn() } },
      ],
    }).compile();
    service = mod.get(AiActionsService);
  });

  describe('tenant isolation', () => {
    it('list/summary Forbidden khi tài khoản không có clubId', async () => {
      await expect(service.list(null, {})).rejects.toThrow(ForbiddenException);
      await expect(service.summary(null)).rejects.toThrow(ForbiddenException);
    });

    it('list luôn scope theo clubId từ JWT', async () => {
      await service.list('club-1', { status: 'PENDING_APPROVAL' });
      expect(prisma.aiAction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clubId: 'club-1', status: 'PENDING_APPROVAL' },
        }),
      );
    });

    it('expireStale: list/summary tự chuyển PENDING_APPROVAL quá hạn → EXPIRED', async () => {
      await service.list('club-1', {});
      expect(prisma.aiAction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clubId: 'club-1',
            status: 'PENDING_APPROVAL',
            createdAt: expect.objectContaining({ lt: expect.any(Date) }),
          }),
          data: { status: 'EXPIRED' },
        }),
      );
      jest.clearAllMocks();
      prisma.aiAction.groupBy.mockResolvedValue([]);
      prisma.aiAction.findMany.mockResolvedValue([]);
      await service.summary('club-1');
      expect(prisma.aiAction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'EXPIRED' } }),
      );
    });

    it('approve NotFound khi action thuộc club khác (findFirst null)', async () => {
      prisma.aiAction.findFirst.mockResolvedValue(null);
      await expect(service.approve('a1', 'club-1', ACTOR)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.aiAction.findFirst).toHaveBeenCalledWith({
        where: { id: 'a1', clubId: 'club-1' },
      });
    });
  });

  describe('create', () => {
    it('tạo action PENDING_APPROVAL + ghi sự kiện + audit', async () => {
      prisma.aiAction.create.mockResolvedValue({ id: 'a1' });
      prisma.aiAction.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'PENDING_APPROVAL',
        events: [],
      });
      await service.create('club-1', 'u1', {
        requestedByAi: 'MAIKA',
        actionType: 'send-reminder',
        riskLevel: 'HIGH',
        title: 'Nhắc đóng quỹ',
      } as never);
      const createData: unknown = expect.objectContaining({
        clubId: 'club-1',
        status: 'PENDING_APPROVAL',
        approvalRequired: true,
        createdById: 'u1',
      });
      expect(prisma.aiAction.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: createData }),
      );
      expect(prisma.aiActionEvent.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('findOne payload sanitization', () => {
    it('KHÔNG trả requestPayload thô; trả payloadSummary (tên trường + count + size)', async () => {
      prisma.aiAction.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'PENDING_APPROVAL',
        requestPayload: { memberIds: ['m1', 'm2'], channel: 'email' },
        events: [],
      });
      const r = (await service.findOne('a1', 'club-1')) as Record<
        string,
        unknown
      >;
      expect(r.requestPayload).toBeUndefined();
      const ps = r.payloadSummary as {
        fieldNames: string[];
        fieldCount: number;
        approxSizeBytes: number;
      };
      expect([...ps.fieldNames].sort()).toEqual(['channel', 'memberIds']);
      expect(ps.fieldCount).toBe(2);
      expect(ps.approxSizeBytes).toBeGreaterThan(0);
    });

    it('payload null → summary rỗng', async () => {
      prisma.aiAction.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'APPROVED',
        requestPayload: null,
        events: [],
      });
      const r = (await service.findOne('a1', 'club-1')) as Record<
        string,
        unknown
      >;
      const ps = r.payloadSummary as { fieldCount: number };
      expect(ps.fieldCount).toBe(0);
    });
  });

  describe('approve/reject/retry state guards (atomic)', () => {
    it('approve không acquire được (updateMany count 0) → BadRequest', async () => {
      prisma.aiAction.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'APPROVED',
      });
      prisma.aiAction.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.approve('a1', 'club-1', ACTOR)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('approve PENDING → APPROVED (updateMany có điều kiện + audit)', async () => {
      prisma.aiAction.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'APPROVED',
        actionType: 'x',
        events: [],
      });
      await service.approve('a1', 'club-1', ACTOR);
      const cond: unknown = expect.objectContaining({
        id: 'a1',
        clubId: 'club-1',
        status: 'PENDING_APPROVAL',
      });
      const approveData: unknown = expect.objectContaining({
        status: 'APPROVED',
        approvedBy: 'u1',
      });
      expect(prisma.aiAction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: cond, data: approveData }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('không double-approve: lần 2 count 0 → chỉ 1 lần audit APPROVE', async () => {
      prisma.aiAction.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'APPROVED',
        actionType: 'x',
        events: [],
      });
      prisma.aiAction.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });
      await service.approve('a1', 'club-1', ACTOR);
      await expect(service.approve('a1', 'club-1', ACTOR)).rejects.toThrow(
        BadRequestException,
      );
      const calls = prisma.auditLog.create.mock.calls as Array<
        [{ data?: { action?: string } }]
      >;
      const approveAudits = calls.filter(
        (c) => c[0]?.data?.action === 'AI_ACTION_APPROVE',
      );
      expect(approveAudits).toHaveLength(1);
    });

    it('retry không acquire được → BadRequest; FAILED → RETRY_PENDING (increment)', async () => {
      prisma.aiAction.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'APPROVED',
      });
      prisma.aiAction.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.retry('a1', 'club-1', ACTOR)).rejects.toThrow(
        BadRequestException,
      );

      prisma.aiAction.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'FAILED',
        retryCount: 1,
        actionType: 'x',
        events: [],
      });
      prisma.aiAction.updateMany.mockResolvedValueOnce({ count: 1 });
      await service.retry('a1', 'club-1', ACTOR);
      const retryData: unknown = expect.objectContaining({
        status: 'RETRY_PENDING',
        retryCount: { increment: 1 },
      });
      expect(prisma.aiAction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: retryData }),
      );
    });

    it('reject PENDING → REJECTED với lý do (updateMany có điều kiện)', async () => {
      prisma.aiAction.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'REJECTED',
        actionType: 'x',
        events: [],
      });
      await service.reject('a1', 'club-1', ACTOR, 'không hợp lệ');
      const rejectData: unknown = expect.objectContaining({
        status: 'REJECTED',
        rejectionReason: 'không hợp lệ',
      });
      expect(prisma.aiAction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: rejectData }),
      );
    });
  });

  describe('execute (Mít Đặc bridge)', () => {
    const APPROVED = {
      id: 'a1',
      status: 'APPROVED',
      actionType: 'x',
      targetModule: null,
      targetEntityType: null,
      targetEntityId: null,
      requestPayload: null,
      events: [],
    };

    it('transition không acquire được (updateMany count 0) → BadRequest, KHÔNG chạy executor', async () => {
      prisma.aiAction.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'PENDING_APPROVAL',
      });
      prisma.aiAction.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.execute('a1', 'club-1', ACTOR)).rejects.toThrow(
        BadRequestException,
      );
      expect(executor.execute).not.toHaveBeenCalled();
    });

    it('tenant mismatch → NotFound (findFirst null)', async () => {
      prisma.aiAction.findFirst.mockResolvedValue(null);
      await expect(service.execute('a1', 'club-1', ACTOR)).rejects.toThrow(
        NotFoundException,
      );
      expect(executor.execute).not.toHaveBeenCalled();
    });

    it('APPROVED: transition NGUYÊN TỬ (updateMany status EXECUTING/MIT_DAT) → executor → EXECUTED + audit', async () => {
      prisma.aiAction.findFirst.mockResolvedValue(APPROVED);
      await service.execute('a1', 'club-1', ACTOR);
      expect(executor.execute).toHaveBeenCalledTimes(1);
      const cond: unknown = expect.objectContaining({
        id: 'a1',
        clubId: 'club-1',
        status: { in: ['APPROVED', 'RETRY_PENDING'] },
      });
      const execData: unknown = expect.objectContaining({
        status: 'EXECUTING',
        executorAgent: 'MIT_DAT',
      });
      expect(prisma.aiAction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: cond, data: execData }),
      );
    });

    it('RETRY_PENDING: execute acquire được (nút Chạy lại đi tiếp qua execute, không kẹt)', async () => {
      // Sau retry() action ở RETRY_PENDING. execute() phải acquire được (count=1) → chạy executor.
      prisma.aiAction.findFirst.mockResolvedValue({
        ...APPROVED,
        status: 'RETRY_PENDING',
      });
      prisma.aiAction.updateMany.mockResolvedValue({ count: 1 });
      await service.execute('a1', 'club-1', ACTOR);
      expect(executor.execute).toHaveBeenCalledTimes(1);
      const retryCond: unknown = expect.objectContaining({
        status: { in: ['APPROVED', 'RETRY_PENDING'] },
      });
      expect(prisma.aiAction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: retryCond }),
      );
    });

    it('executor throw → FAILED + audit EXECUTE_FAILED (không ném ra ngoài)', async () => {
      executor.execute.mockRejectedValueOnce(new Error('boom'));
      prisma.aiAction.findFirst.mockResolvedValue({
        ...APPROVED,
        status: 'FAILED',
      });
      await service.execute('a1', 'club-1', ACTOR);
      const failAudit: unknown = expect.objectContaining({
        action: 'AI_ACTION_EXECUTE_FAILED',
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: failAudit }),
      );
    });

    // EPIC8 — Notification Runtime integration
    it('action notification EXECUTED → tạo NotificationJob qua runtime (idempotency theo action)', async () => {
      prisma.aiAction.findFirst.mockResolvedValue({
        ...APPROVED,
        actionType: 'notify:debt-reminder',
        targetModule: 'notifications',
        title: 'Nhắc nợ quỹ',
        summary: 'Gửi nhắc nợ cho thành viên',
        requestPayload: { channel: 'IN_APP', targetUserId: 'u2' },
      });
      await service.execute('a1', 'club-1', ACTOR);
      await new Promise((resolve) => setImmediate(resolve));
      const req: unknown = expect.objectContaining({
        channel: 'IN_APP',
        targetId: 'u2',
        idempotencyKey: 'AI_ACTION:a1',
        aiActionId: 'a1',
      });
      expect(notifications.dispatch).toHaveBeenCalledWith('club-1', req);
    });

    it('action KHÔNG phải notification → KHÔNG gọi runtime', async () => {
      prisma.aiAction.findFirst.mockResolvedValue(APPROVED); // actionType 'x'
      await service.execute('a1', 'club-1', ACTOR);
      await new Promise((resolve) => setImmediate(resolve));
      expect(notifications.dispatch).not.toHaveBeenCalled();
    });

    it('runtime lỗi → execute vẫn hoàn tất EXECUTED (không rollback, chỉ log)', async () => {
      notifications.dispatch.mockRejectedValueOnce(new Error('RUNTIME_DOWN'));
      prisma.aiAction.findFirst.mockResolvedValue({
        ...APPROVED,
        actionType: 'notify:x',
        targetModule: 'notifications',
        title: 'T',
        summary: null,
        requestPayload: {},
      });
      await expect(
        service.execute('a1', 'club-1', ACTOR),
      ).resolves.toBeDefined();
      await new Promise((resolve) => setImmediate(resolve));
      const okAudit: unknown = expect.objectContaining({
        action: 'AI_ACTION_EXECUTE',
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: okAudit }),
      );
    });

    // BLOCKER 1 — không double-execute
    it('không double-execute: lần 2 count 0 → executor gọi đúng 1 lần', async () => {
      prisma.aiAction.findFirst.mockResolvedValue(APPROVED);
      prisma.aiAction.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });
      await service.execute('a1', 'club-1', ACTOR);
      await expect(service.execute('a1', 'club-1', ACTOR)).rejects.toThrow(
        BadRequestException,
      );
      expect(executor.execute).toHaveBeenCalledTimes(1);
    });

    // BLOCKER 2 — ghi EXECUTION_STARTED lỗi → rollback, executor KHÔNG chạy
    it('ghi EXECUTION_STARTED lỗi → transaction rollback, executor KHÔNG chạy', async () => {
      prisma.aiAction.findFirst.mockResolvedValue(APPROVED);
      prisma.aiActionEvent.create.mockRejectedValueOnce(
        new Error('event fail'),
      );
      await expect(service.execute('a1', 'club-1', ACTOR)).rejects.toThrow(
        'event fail',
      );
      expect(executor.execute).not.toHaveBeenCalled();
    });

    // BLOCKER 3 — sanitize executionResult
    it('sanitize executionResult: loại secretToken/password/requestPayload', async () => {
      executor.execute.mockResolvedValueOnce({
        ok: true,
        mode: 'NO_OP',
        message: 'done',
        secretToken: 'LEAK',
        password: 'p',
        requestPayload: { x: 1 },
      });
      let stored: Record<string, unknown> | undefined;
      prisma.aiAction.update.mockImplementation(
        (arg: { data?: Record<string, unknown> }) => {
          if (arg?.data && 'executionResult' in arg.data) {
            stored = arg.data.executionResult as Record<string, unknown>;
          }
          return Promise.resolve({});
        },
      );
      prisma.aiAction.findFirst.mockResolvedValue({
        ...APPROVED,
        targetModule: 'm',
      });
      await service.execute('a1', 'club-1', ACTOR);
      expect(stored).toBeDefined();
      expect(stored?.secretToken).toBeUndefined();
      expect(stored?.password).toBeUndefined();
      expect(stored?.requestPayload).toBeUndefined();
      expect(stored?.ok).toBe(true);
      expect(stored?.executor).toBe('MIT_DAT');
      expect(stored?.targetModule).toBe('m');
    });

    // BLOCKER 4 — sanitize error
    it('sanitize error: errorMessage + event KHÔNG chứa secret trong Error.message', async () => {
      executor.execute.mockRejectedValueOnce(
        new Error('DB fail token=SUPERSECRET password=hunter2'),
      );
      let storedErr: unknown;
      let eventMsg: unknown;
      prisma.aiAction.update.mockImplementation(
        (arg: { data?: Record<string, unknown> }) => {
          if (arg?.data && 'errorMessage' in arg.data)
            storedErr = arg.data.errorMessage;
          return Promise.resolve({});
        },
      );
      prisma.aiActionEvent.create.mockImplementation(
        (arg: { data?: { type?: string; message?: unknown } }) => {
          if (arg?.data?.type === 'EXECUTION_FAILED')
            eventMsg = arg.data.message;
          return Promise.resolve({});
        },
      );
      prisma.aiAction.findFirst.mockResolvedValue({
        ...APPROVED,
        status: 'FAILED',
      });
      await service.execute('a1', 'club-1', ACTOR);
      expect(String(storedErr)).not.toContain('SUPERSECRET');
      expect(String(storedErr)).not.toContain('hunter2');
      expect(String(eventMsg)).not.toContain('SUPERSECRET');
      expect(storedErr).toBe('Thực thi thất bại. Xem log máy chủ.');
    });
  });

  describe('summary', () => {
    it('trả 0/[] khi không có dữ liệu (không bịa số)', async () => {
      const r = await service.summary('club-1');
      expect(r.pendingApprovals).toBe(0);
      expect(r.averageApprovalTime).toBe(0);
      expect(r.actionsByAi).toEqual([]);
      expect(r.recentActivities).toEqual([]);
    });
  });
});
