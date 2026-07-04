import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MaikaCore } from '../ai/maika/maika.service';
import { NotificationRuntimeService } from '../notification-runtime/notification-runtime.service';
import { AiActionRisk, Prisma } from '@prisma/client';
import type { CreateAiActionDto } from './ai-actions.dto';
import { ACTION_EXECUTOR, type ActionExecutor } from './action-executor';

/** JWT actor — scope suy từ token, không nhận từ client. */
export interface ActionActor {
  userId: string;
  clubId: string | null;
  username: string;
  role: string;
}

const RISK_TO_POLICY: Record<
  AiActionRisk,
  'low' | 'medium' | 'high' | 'critical'
> = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

export interface ListFilters {
  status?: string;
  requestedByAi?: string;
  riskLevel?: string;
  targetModule?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AiActionsService {
  private readonly logger = new Logger(AiActionsService.name);

  constructor(
    private prisma: PrismaService,
    private maika: MaikaCore,
    private notifications: NotificationRuntimeService,
    @Inject(ACTION_EXECUTOR) private executor: ActionExecutor,
  ) {}

  /** Che các chuỗi giống secret (token/password/JWT/api-key/bearer) trong text hiển thị. */
  private redactSecrets(input: string): string {
    return input
      .replace(/(bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED]')
      .replace(
        /\b[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
        '[REDACTED_JWT]',
      )
      .replace(
        /((?:token|password|passwd|secret|api[_-]?key|jwt|authorization)["'\s]*[:=]["'\s]*)\S+/gi,
        '$1[REDACTED]',
      )
      .slice(0, 300);
  }

  /**
   * BLOCKER 3 — Sanitize executor result ở tầng service: CHỈ whitelist field an toàn.
   * Field ngoài whitelist (secretToken, password, requestPayload, ...) bị loại bỏ.
   * targetModule/entity lấy từ ACTION (không tin field executor trả).
   */
  private sanitizeExecutionResult(
    raw: unknown,
    action: {
      targetModule: string | null;
      targetEntityType: string | null;
      targetEntityId: string | null;
    },
    completedAt: Date,
  ) {
    const r =
      raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const okRaw = r.ok ?? r.executed;
    const modeRaw = r.mode;
    const msgRaw = r.message ?? r.note;
    return {
      ok: typeof okRaw === 'boolean' ? okRaw : true,
      executor: 'MIT_DAT',
      mode: typeof modeRaw === 'string' ? modeRaw.slice(0, 40) : 'NO_OP',
      message: this.redactSecrets(
        typeof msgRaw === 'string' ? msgRaw : 'Executed',
      ),
      targetModule: action.targetModule,
      targetEntityType: action.targetEntityType,
      targetEntityId: action.targetEntityId,
      completedAt: completedAt.toISOString(),
    };
  }

  /**
   * BLOCKER 4 — KHÔNG bao giờ lưu raw Error.message (có thể chứa token/secret).
   * Log chi tiết ở server (Nest Logger), trả thông báo an toàn cho DB/API/event.
   */
  private sanitizeExecutionError(e: unknown): string {
    const detail = e instanceof Error ? (e.stack ?? e.message) : String(e);
    this.logger.error(`AI action execution failed: ${detail}`);
    return 'Thực thi thất bại. Xem log máy chủ.';
  }

  /** clubId bắt buộc (tenant isolation). SUPER_ADMIN không gắn CLB sẽ bị chặn ở đây. */
  private requireClub(clubId: string | null): string {
    if (!clubId)
      throw new ForbiddenException('Tài khoản chưa gắn với CLB nào.');
    return clubId;
  }

  /** Lấy action trong đúng club (chống truy cập chéo club). */
  private async requireAction(id: string, clubId: string) {
    const action = await this.prisma.aiAction.findFirst({
      where: { id, clubId },
    });
    if (!action) throw new NotFoundException('Không tìm thấy hành động AI.');
    return action;
  }

  private async addEvent(
    actionId: string,
    clubId: string,
    type: string,
    message: string,
    actorUserId?: string,
  ) {
    await this.prisma.aiActionEvent.create({
      data: {
        actionId,
        clubId,
        type,
        message,
        actorUserId: actorUserId ?? null,
      },
    });
  }

  private async audit(
    userId: string,
    clubId: string,
    action: string,
    resourceId: string,
    detail: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        clubId,
        action,
        resource: 'ai_action',
        resourceId,
        detail,
      },
    });
  }

  async list(clubIdRaw: string | null, f: ListFilters) {
    const clubId = this.requireClub(clubIdRaw);
    const page = Math.max(1, Number(f.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(f.limit) || 20));
    const where: Prisma.AiActionWhereInput = {
      clubId,
      ...(f.status ? { status: f.status as never } : {}),
      ...(f.requestedByAi ? { requestedByAi: f.requestedByAi as never } : {}),
      ...(f.riskLevel ? { riskLevel: f.riskLevel as never } : {}),
      ...(f.targetModule ? { targetModule: f.targetModule } : {}),
      ...(f.from || f.to
        ? {
            createdAt: {
              ...(f.from ? { gte: new Date(f.from) } : {}),
              ...(f.to ? { lte: new Date(f.to) } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.aiAction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.aiAction.count({ where }),
    ]);
    return { items: items.map((a) => this.toListItem(a)), total, page, limit };
  }

  /**
   * Tóm tắt payload AN TOÀN — chỉ metadata (tên trường, số trường, kích thước xấp xỉ).
   * KHÔNG bao giờ trả giá trị payload thô.
   */
  private summarizePayload(payload: unknown) {
    if (!payload || typeof payload !== 'object') {
      return { fieldNames: [] as string[], fieldCount: 0, approxSizeBytes: 0 };
    }
    const fieldNames = Object.keys(payload);
    return {
      fieldNames,
      fieldCount: fieldNames.length,
      approxSizeBytes: JSON.stringify(payload).length,
    };
  }

  async findOne(id: string, clubIdRaw: string | null) {
    const clubId = this.requireClub(clubIdRaw);
    const action = await this.prisma.aiAction.findFirst({
      where: { id, clubId },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
    if (!action) throw new NotFoundException('Không tìm thấy hành động AI.');
    // Loại bỏ requestPayload thô khỏi response; chỉ trả metadata an toàn.
    const { requestPayload, ...safe } = action;
    return { ...safe, payloadSummary: this.summarizePayload(requestPayload) };
  }

  async create(
    clubIdRaw: string | null,
    userId: string,
    dto: CreateAiActionDto,
  ) {
    const clubId = this.requireClub(clubIdRaw);
    const policy =
      this.maika
        .listApprovalPolicies()
        .find((p) => p.riskLevel === RISK_TO_POLICY[dto.riskLevel]) ?? null;
    const approvalRequired = (policy?.requiredApprovalCount ?? 1) > 0;

    const action = await this.prisma.aiAction.create({
      data: {
        clubId,
        requestedByAi: dto.requestedByAi,
        actionType: dto.actionType,
        targetModule: dto.targetModule ?? null,
        targetEntityType: dto.targetEntityType ?? null,
        targetEntityId: dto.targetEntityId ?? null,
        riskLevel: dto.riskLevel,
        title: dto.title,
        summary: dto.summary ?? null,
        requestPayload: (dto.requestPayload ??
          undefined) as Prisma.InputJsonValue,
        status: 'PENDING_APPROVAL',
        approvalRequired,
        approvalPolicy: (policy ??
          undefined) as unknown as Prisma.InputJsonValue,
        createdById: userId,
      },
    });
    await this.addEvent(
      action.id,
      clubId,
      'CREATED',
      `${dto.requestedByAi} tạo yêu cầu: ${dto.title}`,
      userId,
    );
    await this.addEvent(
      action.id,
      clubId,
      'EVALUATED',
      `Cần ${policy?.requiredApprovalCount ?? 1} phê duyệt (rủi ro ${dto.riskLevel}).`,
      userId,
    );
    await this.audit(
      userId,
      clubId,
      'AI_ACTION_CREATE',
      action.id,
      `${dto.requestedByAi} · ${dto.actionType} · ${dto.riskLevel}`,
    );
    return this.findOne(action.id, clubId);
  }

  /**
   * Chuyển trạng thái NGUYÊN TỬ có điều kiện + ghi sự kiện trong 1 transaction.
   * updateMany chỉ khớp khi status === fromStatus → chỉ 1 request song song "acquire" được
   * (count===1); còn lại count===0 → BadRequest (chống double-approve/reject/retry).
   * Ghi sự kiện lỗi → rollback (state + event nhất quán).
   */
  private async atomicTransition(
    id: string,
    clubId: string,
    fromStatus: string,
    data: Prisma.AiActionUpdateManyMutationInput,
    eventType: string,
    eventMsg: string,
    actorUserId: string,
    notAcquiredMsg: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const res = await tx.aiAction.updateMany({
        where: { id, clubId, status: fromStatus as never },
        data,
      });
      if (res.count !== 1) throw new BadRequestException(notAcquiredMsg);
      await tx.aiActionEvent.create({
        data: {
          actionId: id,
          clubId,
          type: eventType,
          message: eventMsg,
          actorUserId,
        },
      });
    });
  }

  async approve(id: string, clubIdRaw: string | null, actor: ActionActor) {
    const clubId = this.requireClub(clubIdRaw);
    const action = await this.requireAction(id, clubId);
    await this.atomicTransition(
      id,
      clubId,
      'PENDING_APPROVAL',
      { status: 'APPROVED', approvedBy: actor.userId, approvedAt: new Date() },
      'APPROVED',
      `Đã duyệt bởi ${actor.username}.`,
      actor.userId,
      'Chỉ duyệt được hành động đang chờ duyệt (có thể đã được xử lý).',
    );
    await this.audit(
      actor.userId,
      clubId,
      'AI_ACTION_APPROVE',
      id,
      `Approve ${action.actionType}`,
    );
    return this.findOne(id, clubId);
  }

  async reject(
    id: string,
    clubIdRaw: string | null,
    actor: ActionActor,
    reason?: string,
  ) {
    const clubId = this.requireClub(clubIdRaw);
    const action = await this.requireAction(id, clubId);
    await this.atomicTransition(
      id,
      clubId,
      'PENDING_APPROVAL',
      {
        status: 'REJECTED',
        rejectedBy: actor.userId,
        rejectedAt: new Date(),
        rejectionReason: reason ?? null,
      },
      'REJECTED',
      `Từ chối bởi ${actor.username}${reason ? `: ${reason}` : ''}.`,
      actor.userId,
      'Chỉ từ chối được hành động đang chờ duyệt (có thể đã được xử lý).',
    );
    await this.audit(
      actor.userId,
      clubId,
      'AI_ACTION_REJECT',
      id,
      `Reject ${action.actionType}`,
    );
    return this.findOne(id, clubId);
  }

  async retry(id: string, clubIdRaw: string | null, actor: ActionActor) {
    const clubId = this.requireClub(clubIdRaw);
    const action = await this.requireAction(id, clubId);
    await this.atomicTransition(
      id,
      clubId,
      'FAILED',
      {
        status: 'RETRY_PENDING',
        retryCount: { increment: 1 },
        errorMessage: null,
      },
      'RETRY_REQUESTED',
      `Yêu cầu chạy lại bởi ${actor.username} (lần ${action.retryCount + 1}).`,
      actor.userId,
      'Chỉ chạy lại được hành động đã thất bại (có thể đã được xử lý).',
    );
    await this.audit(
      actor.userId,
      clubId,
      'AI_ACTION_RETRY',
      id,
      `Retry ${action.actionType}`,
    );
    return this.findOne(id, clubId);
  }

  /**
   * Execution Bridge (Mít Đặc) — thực thi 1 hành động ĐÃ DUYỆT.
   * CHỈ khi status == APPROVED (đúng tenant). Không bao giờ bỏ qua duyệt, không tự quyết định.
   * Luồng: APPROVED → EXECUTING → EXECUTED | FAILED. Ghi timing + executor + sự kiện + audit.
   */
  async execute(id: string, clubIdRaw: string | null, actor: ActionActor) {
    const clubId = this.requireClub(clubIdRaw);
    // Tồn tại + đúng club (404 nếu cross-club). Dùng làm ngữ cảnh executor (field bất biến khi đổi trạng thái).
    const action = await this.requireAction(id, clubId);

    const startedAt = new Date();
    // BLOCKER 1+2: chuyển trạng thái NGUYÊN TỬ + ghi EXECUTION_STARTED trong 1 transaction.
    // updateMany có điều kiện status=APPROVED: chỉ 1 request "acquire" được (count===1);
    // request song song thứ 2 thấy count===0 → BadRequest, KHÔNG chạy executor.
    // Nếu ghi event lỗi → cả transaction rollback → KHÔNG kẹt EXECUTING, executor KHÔNG chạy.
    await this.prisma.$transaction(async (tx) => {
      const res = await tx.aiAction.updateMany({
        where: { id, clubId, status: 'APPROVED' },
        data: {
          status: 'EXECUTING',
          executorAgent: 'MIT_DAT',
          executorStartedAt: startedAt,
          errorMessage: null,
        },
      });
      if (res.count !== 1) {
        throw new BadRequestException(
          'Chỉ thực thi được hành động đã DUYỆT (APPROVED) và chưa/không đang thực thi.',
        );
      }
      await tx.aiActionEvent.create({
        data: {
          actionId: id,
          clubId,
          type: 'EXECUTION_STARTED',
          message: 'Mít Đặc bắt đầu thực thi.',
          actorUserId: actor.userId,
        },
      });
    });

    // Đã acquire EXECUTING (atomic). Chạy executor NGOÀI transaction DB.
    try {
      const raw = await this.executor.execute({
        id: action.id,
        actionType: action.actionType,
        targetModule: action.targetModule,
        requestPayload: action.requestPayload,
      });
      const finishedAt = new Date();
      const duration = finishedAt.getTime() - startedAt.getTime();
      const result = this.sanitizeExecutionResult(raw, action, finishedAt);
      await this.prisma.$transaction([
        this.prisma.aiAction.update({
          where: { id },
          data: {
            status: 'EXECUTED',
            executorFinishedAt: finishedAt,
            executionDuration: duration,
            executionResult: result,
          },
        }),
        this.prisma.aiActionEvent.create({
          data: {
            actionId: id,
            clubId,
            type: 'EXECUTION_COMPLETED',
            message: `Hoàn tất bởi Mít Đặc (${duration}ms).`,
            actorUserId: actor.userId,
          },
        }),
      ]);
      await this.audit(
        actor.userId,
        clubId,
        'AI_ACTION_EXECUTE',
        id,
        `Executed ${action.actionType} (${duration}ms)`,
      );
      // Epic 8: action notification ĐÃ DUYỆT + ĐÃ THỰC THI → tạo NotificationJob
      // qua runtime (DRY_RUN/READY theo channel). Fire-and-forget — lỗi runtime
      // KHÔNG ảnh hưởng kết quả execute (đã EXECUTED, không rollback).
      this.enqueueNotificationIfNeeded(clubId, action);
    } catch (e) {
      const finishedAt = new Date();
      const duration = finishedAt.getTime() - startedAt.getTime();
      // BLOCKER 4: KHÔNG lưu raw Error.message (có thể chứa token/secret) — dùng thông báo an toàn.
      const safeMsg = this.sanitizeExecutionError(e);
      await this.prisma.$transaction([
        this.prisma.aiAction.update({
          where: { id },
          data: {
            status: 'FAILED',
            executorFinishedAt: finishedAt,
            executionDuration: duration,
            errorMessage: safeMsg,
          },
        }),
        this.prisma.aiActionEvent.create({
          data: {
            actionId: id,
            clubId,
            type: 'EXECUTION_FAILED',
            message: safeMsg,
            actorUserId: actor.userId,
          },
        }),
      ]);
      await this.audit(
        actor.userId,
        clubId,
        'AI_ACTION_EXECUTE_FAILED',
        id,
        `Failed ${action.actionType}`,
      );
    }
    return this.findOne(id, clubId);
  }

  /**
   * Epic 8: action notification (targetModule='notifications' hoặc actionType
   * bắt đầu 'notify') SAU khi EXECUTED → tạo NotificationJob qua Notification
   * Runtime. Fire-and-forget: lỗi runtime chỉ log, KHÔNG ảnh hưởng execute.
   * KHÔNG bypass Action Center — chỉ chạy trên action đã duyệt + đã thực thi.
   */
  private enqueueNotificationIfNeeded(
    clubId: string,
    action: {
      id: string;
      actionType: string;
      targetModule: string | null;
      title: string;
      summary: string | null;
      requestPayload: unknown;
    },
  ): void {
    const isNotification =
      action.targetModule === 'notifications' ||
      action.actionType.toLowerCase().startsWith('notify');
    if (!isNotification) return;
    const payload = (action.requestPayload ?? {}) as Record<string, unknown>;
    const channel =
      typeof payload.channel === 'string' ? payload.channel : 'IN_APP';
    const targetId =
      typeof payload.targetUserId === 'string' ? payload.targetUserId : null;
    void this.notifications
      .dispatch(clubId, {
        channel,
        targetType: 'USER',
        targetId,
        title: action.title,
        bodySummary: action.summary ?? undefined,
        payload,
        idempotencyKey: `AI_ACTION:${action.id}`,
        aiActionId: action.id,
      })
      .catch((e: unknown) => {
        const detail = e instanceof Error ? (e.stack ?? e.message) : String(e);
        this.logger.error(
          `Notification runtime lỗi (không ảnh hưởng execute): ${detail}`,
        );
      });
  }

  /** KPI tổng hợp — CHỈ dữ liệu DB thật; không có dữ liệu → 0/[]. */
  async summary(clubIdRaw: string | null) {
    const clubId = this.requireClub(clubIdRaw);
    const [byStatus, byAi, byRisk] = await Promise.all([
      this.prisma.aiAction.groupBy({
        by: ['status'],
        where: { clubId },
        _count: { _all: true },
      }),
      this.prisma.aiAction.groupBy({
        by: ['requestedByAi'],
        where: { clubId },
        _count: { _all: true },
      }),
      this.prisma.aiAction.groupBy({
        by: ['riskLevel'],
        where: { clubId },
        _count: { _all: true },
      }),
    ]);
    const countOf = (s: string) =>
      byStatus.find((x) => x.status === s)?._count._all ?? 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const executedToday = await this.prisma.aiAction.count({
      where: { clubId, status: 'EXECUTED', updatedAt: { gte: todayStart } },
    });

    const approved = await this.prisma.aiAction.findMany({
      where: { clubId, status: 'APPROVED', approvedAt: { not: null } },
      select: { createdAt: true, approvedAt: true },
    });
    const avgSeconds = approved.length
      ? Math.round(
          approved.reduce(
            (s, a) =>
              s + ((a.approvedAt as Date).getTime() - a.createdAt.getTime()),
            0,
          ) /
            approved.length /
            1000,
        )
      : 0;

    const recentEvents = await this.prisma.aiActionEvent.findMany({
      where: { clubId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        actionId: true,
        type: true,
        message: true,
        createdAt: true,
      },
    });

    // Executor (Mít Đặc) stats — DB thật.
    const [running, failedToday, executedRows] = await Promise.all([
      this.prisma.aiAction.count({ where: { clubId, status: 'EXECUTING' } }),
      this.prisma.aiAction.count({
        where: { clubId, status: 'FAILED', updatedAt: { gte: todayStart } },
      }),
      this.prisma.aiAction.findMany({
        where: { clubId, status: 'EXECUTED', executionDuration: { not: null } },
        select: { executionDuration: true },
      }),
    ]);
    const avgExecutionMs = executedRows.length
      ? Math.round(
          executedRows.reduce((s, r) => s + (r.executionDuration ?? 0), 0) /
            executedRows.length,
        )
      : 0;

    return {
      pendingApprovals: countOf('PENDING_APPROVAL'),
      approvedActions: countOf('APPROVED'),
      rejectedActions: countOf('REJECTED'),
      failedActions: countOf('FAILED'),
      executedToday,
      averageApprovalTime: avgSeconds,
      actionsByAi: byAi.map((x) => ({
        ai: x.requestedByAi,
        count: x._count._all,
      })),
      actionsByRisk: byRisk.map((x) => ({
        risk: x.riskLevel,
        count: x._count._all,
      })),
      recentActivities: recentEvents,
      executor: {
        agent: 'MIT_DAT',
        running,
        executedToday,
        failedToday,
        averageExecutionMs: avgExecutionMs,
      },
    };
  }

  /** Danh sách rút gọn (KHÔNG lộ requestPayload thô). */
  private toListItem(a: {
    id: string;
    requestedByAi: string;
    actionType: string;
    targetModule: string | null;
    riskLevel: string;
    title: string;
    summary: string | null;
    status: string;
    approvalRequired: boolean;
    retryCount: number;
    createdAt: Date;
  }) {
    return {
      id: a.id,
      requestedByAi: a.requestedByAi,
      actionType: a.actionType,
      targetModule: a.targetModule,
      riskLevel: a.riskLevel,
      title: a.title,
      summary: a.summary,
      status: a.status,
      approvalRequired: a.approvalRequired,
      retryCount: a.retryCount,
      createdAt: a.createdAt,
    };
  }
}
