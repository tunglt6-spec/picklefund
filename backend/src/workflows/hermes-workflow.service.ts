import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiActionsService } from '../ai-actions/ai-actions.service';
import { AiActionRisk, Prisma } from '@prisma/client';
import { WORKFLOW_TEMPLATES } from './workflow-templates';
import type {
  CreateWorkflowRuleDto,
  UpdateWorkflowRuleDto,
} from './workflows.dto';

export interface WorkflowActor {
  userId: string;
  clubId: string | null;
}

/** Trigger type hỗ trợ runtime dispatch (Epic 6) — mở rộng bằng cách thêm phần tử. */
export const SUPPORTED_TRIGGER_TYPES = [
  'DEBT_ESCALATION',
  'EVENT_REMINDER',
  'REPORT_DISPATCH',
  // AIDO Workflow Rules Expansion — Phase 2 (lô Tài chính).
  'FUND_BALANCE_RISK',
  'PAYMENT_DUE_REMINDER',
  'MISSING_FINANCE_DOCUMENT',
  // Phase 3 (lô Hoạt động CLB).
  'LOW_SESSION_REGISTRATION',
  'ATTENDANCE_NOT_CLOSED',
  'SESSION_CAPACITY_RISK',
  'LOW_MEMBER_ATTENDANCE',
  // Phase 4 (lô Điều phối + Thi đấu + Báo cáo) — hoàn tất 13 rule.
  'APPROVAL_OVERDUE',
  'MATCH_RESULT_MISSING',
  'WEEKLY_CLUB_HEALTH_REPORT',
  // Business events (Epic 7) — publish bởi HermesEventPublisher sau transaction thành công.
  'ATTENDANCE_COMPLETED',
  'CONTRIBUTION_CONFIRMED',
  'EXPENSE_RECORDED',
  'FUND_PERIOD_CLOSED',
  'MINIGAME_COMPLETED',
] as const;
export type SupportedTriggerType = (typeof SUPPORTED_TRIGGER_TYPES)[number];

/** Tóm tắt dispatch AN TOÀN — chỉ số đếm, không context/payload/error thô. */
export interface DispatchSummary {
  triggerType: string;
  totalRules: number;
  matchedRules: number;
  createdRuns: number;
  createdActions: number;
  // Phase 2: AI Action bị bỏ qua do trùng/cooldown (không tạo mới); action tự đóng do auto-resolve.
  skippedActions: number;
  autoResolvedActions: number;
  failedRuns: number;
  skippedDuplicate: boolean;
}

interface WfCondition {
  field?: string;
  op?: string;
  value?: unknown;
  all?: unknown[];
  any?: unknown[];
}

interface WfAction {
  type?: string;
  targetModule?: string;
  targetEntityType?: string;
  targetEntityId?: string;
  riskLevel?: string;
  title?: string;
  summary?: string;
  requestPayload?: Record<string, unknown>;
  /** Phase 2: cooldown (phút) cho AI Action nhắc — không tạo lại cùng dedup key trong cửa sổ. */
  cooldownMinutes?: number;
}

const VALID_RISK: AiActionRisk[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

@Injectable()
export class HermesWorkflowService {
  private readonly logger = new Logger(HermesWorkflowService.name);

  constructor(
    private prisma: PrismaService,
    private aiActions: AiActionsService,
  ) {}

  // ---------- Sanitization (POLISH) ----------
  /** Metadata AN TOÀN của 1 object — chỉ tên trường/số trường/kích thước, KHÔNG giá trị. */
  private summarizeObject(obj: unknown) {
    if (!obj || typeof obj !== 'object') {
      return { fieldNames: [] as string[], fieldCount: 0, approxSizeBytes: 0 };
    }
    const fieldNames = Object.keys(obj);
    return {
      fieldNames,
      fieldCount: fieldNames.length,
      approxSizeBytes: JSON.stringify(obj).length,
    };
  }

  /** actionsJson → actionSummary (không lộ requestPayload values). */
  private summarizeActions(actionsJson: unknown) {
    const arr = Array.isArray(actionsJson) ? (actionsJson as unknown[]) : [];
    return arr.map((raw) => {
      const a = (raw ?? {}) as {
        type?: string;
        targetModule?: string;
        riskLevel?: string;
        requestPayload?: unknown;
      };
      const p = this.summarizeObject(a.requestPayload);
      return {
        type: a.type ?? null,
        targetModule: a.targetModule ?? null,
        riskLevel: a.riskLevel ?? null,
        payloadFieldNames: p.fieldNames,
        payloadFieldCount: p.fieldCount,
        payloadSizeBytes: p.approxSizeBytes,
      };
    });
  }

  /** Bỏ actionsJson thô khỏi response rule; chỉ trả actionSummary (giữ conditionsJson — config logic). */
  private toRuleResponse(rule: Record<string, unknown>) {
    const { actionsJson, ...safe } = rule;
    return { ...safe, actionSummary: this.summarizeActions(actionsJson) };
  }

  /** Bỏ contextJson thô khỏi response run; chỉ trả contextSummary (resultJson đã an toàn: ids/matched). */
  private toRunResponse(run: Record<string, unknown>) {
    const { contextJson, ...safe } = run;
    return { ...safe, contextSummary: this.summarizeObject(contextJson) };
  }

  /** KHÔNG lưu raw Error.message — log server-side, trả thông báo generic an toàn. */
  private sanitizeError(e: unknown): string {
    const detail = e instanceof Error ? (e.stack ?? e.message) : String(e);
    this.logger.error(`Workflow run failed: ${detail}`);
    return 'Workflow thất bại. Xem log máy chủ.';
  }

  private requireClub(clubId: string | null): string {
    if (!clubId)
      throw new ForbiddenException('Tài khoản chưa gắn với CLB nào.');
    return clubId;
  }

  private async requireRule(id: string, clubId: string) {
    const rule = await this.prisma.workflowRule.findFirst({
      where: { id, clubId },
    });
    if (!rule) throw new NotFoundException('Không tìm thấy workflow rule.');
    return rule;
  }

  // ---------- Rules CRUD ----------
  async listRules(clubIdRaw: string | null) {
    const clubId = this.requireClub(clubIdRaw);
    const rules = await this.prisma.workflowRule.findMany({
      where: { clubId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
    return rules.map((r) => this.toRuleResponse(r));
  }

  async createRule(
    clubIdRaw: string | null,
    userId: string,
    dto: CreateWorkflowRuleDto,
  ) {
    const clubId = this.requireClub(clubIdRaw);
    const scopeKey = dto.scopeKey?.trim() ? dto.scopeKey.trim() : null;

    // Phase 1 — chống tạo Rule TRÙNG khi bấm template nhiều lần: nếu đã có rule cùng
    // (clubId + triggerType + scopeKey) mà người dùng KHÔNG xác nhận tạo biến thể →
    // trả 409 kèm id rule hiện có để FE mở rule đó thay vì tạo bản trùng.
    if (!dto.allowDuplicate) {
      const existing = await this.prisma.workflowRule.findFirst({
        where: { clubId, triggerType: dto.triggerType, scopeKey },
        orderBy: [{ createdAt: 'asc' }],
        select: { id: true, name: true },
      });
      if (existing) {
        throw new ConflictException({
          code: 'RULE_EXISTS',
          message: 'Rule cùng loại đã tồn tại cho CLB này.',
          existingRuleId: existing.id,
          existingRuleName: existing.name,
        });
      }
    }

    const rule = await this.prisma.workflowRule.create({
      data: {
        clubId,
        name: dto.name,
        triggerType: dto.triggerType,
        scopeKey,
        conditionsJson: (dto.conditionsJson ??
          undefined) as Prisma.InputJsonValue,
        actionsJson: (dto.actionsJson ?? undefined) as Prisma.InputJsonValue,
        enabled: dto.enabled ?? true,
        priority: dto.priority ?? 100,
        scheduleType: dto.scheduleType ?? 'MANUAL',
        createdById: userId,
      },
    });
    await this.snapshotRuleVersion(rule, userId, 'Tạo mới');
    return this.toRuleResponse(rule);
  }

  /** Ghi 1 snapshot phiên bản rule (best-effort, không chặn luồng chính). */
  private async snapshotRuleVersion(
    rule: {
      id: string; clubId: string; name: string; triggerType: string;
      scopeKey: string | null; conditionsJson: unknown; actionsJson: unknown;
      scheduleType: string; enabled: boolean; priority: number;
    },
    userId: string | null | undefined,
    note: string,
  ) {
    try {
      const count = await this.prisma.workflowRuleVersion.count({ where: { ruleId: rule.id } });
      await this.prisma.workflowRuleVersion.create({
        data: {
          ruleId: rule.id,
          clubId: rule.clubId,
          version: count + 1,
          name: rule.name,
          triggerType: rule.triggerType,
          scopeKey: rule.scopeKey ?? null,
          conditionsJson: (rule.conditionsJson ?? undefined) as Prisma.InputJsonValue,
          actionsJson: (rule.actionsJson ?? undefined) as Prisma.InputJsonValue,
          scheduleType: rule.scheduleType,
          enabled: rule.enabled,
          priority: rule.priority,
          changedBy: userId ?? null,
          changeNote: note.slice(0, 200),
        },
      });
    } catch {
      // snapshot lỗi không được chặn tạo/sửa rule.
    }
  }

  /** Danh sách phiên bản của 1 rule (mới nhất trước). Rule tạo TRƯỚC khi có versioning chưa có
   * snapshot → tự backfill 1 "Phiên bản hiện tại" để lịch sử không rỗng + có mốc rollback. */
  async listRuleVersions(id: string, clubIdRaw: string | null) {
    const clubId = this.requireClub(clubIdRaw);
    const rule = await this.requireRule(id, clubId);
    const existing = await this.prisma.workflowRuleVersion.count({ where: { ruleId: id, clubId } });
    if (existing === 0) {
      await this.snapshotRuleVersion(
        rule as any,
        (rule as { createdById?: string | null }).createdById ?? null,
        'Phiên bản hiện tại',
      );
    }
    return this.prisma.workflowRuleVersion.findMany({
      where: { ruleId: id, clubId },
      orderBy: { version: 'desc' },
    });
  }

  /** Khôi phục rule về 1 phiên bản cũ (rollback) + ghi snapshot mới ghi nhận thao tác. */
  async rollbackRule(
    id: string,
    versionId: string,
    clubIdRaw: string | null,
    userId: string,
  ) {
    const clubId = this.requireClub(clubIdRaw);
    await this.requireRule(id, clubId);
    const v = await this.prisma.workflowRuleVersion.findFirst({
      where: { id: versionId, ruleId: id, clubId },
    });
    if (!v) throw new NotFoundException('Không tìm thấy phiên bản để khôi phục.');
    const rule = await this.prisma.workflowRule.update({
      where: { id },
      data: {
        name: v.name,
        triggerType: v.triggerType,
        scopeKey: v.scopeKey ?? null,
        conditionsJson: (v.conditionsJson ?? undefined) as Prisma.InputJsonValue,
        actionsJson: (v.actionsJson ?? undefined) as Prisma.InputJsonValue,
        scheduleType: v.scheduleType,
        enabled: v.enabled,
        priority: v.priority,
      },
    });
    await this.snapshotRuleVersion(rule, userId, `Khôi phục v${v.version}`);
    return this.toRuleResponse(rule);
  }

  async updateRule(
    id: string,
    clubIdRaw: string | null,
    dto: UpdateWorkflowRuleDto,
    userId?: string,
  ) {
    const clubId = this.requireClub(clubIdRaw);
    await this.requireRule(id, clubId);
    const rule = await this.prisma.workflowRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.triggerType !== undefined
          ? { triggerType: dto.triggerType }
          : {}),
        ...(dto.conditionsJson !== undefined
          ? { conditionsJson: dto.conditionsJson as Prisma.InputJsonValue }
          : {}),
        ...(dto.actionsJson !== undefined
          ? { actionsJson: dto.actionsJson as Prisma.InputJsonValue }
          : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.scheduleType !== undefined
          ? { scheduleType: dto.scheduleType }
          : {}),
      },
    });
    await this.snapshotRuleVersion(rule, userId, 'Cập nhật');
    return this.toRuleResponse(rule);
  }

  /** Xoá rule; run lịch sử giữ lại (workflowRuleId → NULL theo FK SetNull). */
  async deleteRule(id: string, clubIdRaw: string | null) {
    const clubId = this.requireClub(clubIdRaw);
    await this.requireRule(id, clubId);
    await this.prisma.workflowRule.delete({ where: { id } });
    return { deleted: true, id };
  }

  // ---------- Runs ----------

  /** TTL duyệt AiAction (giờ) — khớp AiActionsService.approvalTtlHours để đồng bộ "chờ duyệt". */
  private approvalTtlHours(): number {
    const raw = Number(process.env.AI_ACTION_APPROVAL_TTL_HOURS);
    return Number.isFinite(raw) && raw > 0 ? raw : 168; // mặc định 7 ngày
  }

  /**
   * Hạ WorkflowRun khỏi WAITING_APPROVAL → COMPLETED khi KHÔNG còn AiAction con nào thực sự chờ
   * duyệt (đã duyệt/từ chối/hết hạn, hoặc quá TTL). Chạy lazy khi list runs — đồng bộ KPI "Chờ duyệt"
   * với Approval Center (vốn tự auto-expire AiAction). Trước đây run set WAITING_APPROVAL một lần rồi
   * treo mãi dù action con đã xử lý → KPI lệch (35 vs 0).
   */
  private async resolveStaleApprovalRuns(clubId: string): Promise<void> {
    const waiting = await this.prisma.workflowRun.findMany({
      where: { clubId, status: 'WAITING_APPROVAL' as never },
      select: { id: true, resultJson: true },
    });
    if (waiting.length === 0) return;
    const runActions = waiting.map((r) => {
      const rj = r.resultJson as { createdActionIds?: string[] } | null;
      return {
        id: r.id,
        actionIds: Array.isArray(rj?.createdActionIds) ? rj!.createdActionIds! : [],
      };
    });
    const allIds = [...new Set(runActions.flatMap((r) => r.actionIds))];
    const cutoff = new Date(Date.now() - this.approvalTtlHours() * 3_600_000);
    const stillPending = allIds.length
      ? await this.prisma.aiAction.findMany({
          where: {
            clubId,
            id: { in: allIds },
            status: 'PENDING_APPROVAL' as never,
            createdAt: { gte: cutoff },
          },
          select: { id: true },
        })
      : [];
    const pendingSet = new Set(stillPending.map((a) => a.id));
    const resolvedRunIds = runActions
      .filter((r) => !r.actionIds.some((aid) => pendingSet.has(aid)))
      .map((r) => r.id);
    if (resolvedRunIds.length > 0) {
      await this.prisma.workflowRun.updateMany({
        where: { id: { in: resolvedRunIds } },
        data: { status: 'COMPLETED' as never, completedAt: new Date() },
      });
    }
  }

  async listRuns(
    clubIdRaw: string | null,
    filters: { status?: string; ruleId?: string },
  ) {
    const clubId = this.requireClub(clubIdRaw);
    // Đồng bộ trạng thái run treo trước khi liệt kê (khớp Approval Center).
    await this.resolveStaleApprovalRuns(clubId);
    const runs = await this.prisma.workflowRun.findMany({
      where: {
        clubId,
        ...(filters.status ? { status: filters.status as never } : {}),
        ...(filters.ruleId ? { workflowRuleId: filters.ruleId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return runs.map((r) => this.toRunResponse(r));
  }

  /**
   * Thống kê run cho KPI trang Hermes Workflows — đếm TỔNG toàn bộ (không cap 100 như listRuns).
   * "Chờ duyệt" = AiAction PENDING_APPROVAL trong TTL (khớp Approval Center), KHÔNG đếm WorkflowRun
   * WAITING_APPROVAL. "Hoàn tất"/"Lỗi" = tổng WorkflowRun COMPLETED/FAILED toàn CLB.
   */
  async runsSummary(clubIdRaw: string | null) {
    const clubId = this.requireClub(clubIdRaw);
    await this.resolveStaleApprovalRuns(clubId);
    const [byStatus, waiting] = await Promise.all([
      this.prisma.workflowRun.groupBy({
        by: ['status'],
        where: { clubId },
        _count: { _all: true },
      }),
      this.prisma.aiAction.count({
        where: {
          clubId,
          status: 'PENDING_APPROVAL' as never,
          createdAt: {
            gte: new Date(Date.now() - this.approvalTtlHours() * 3_600_000),
          },
        },
      }),
    ]);
    const c = (s: string) =>
      byStatus.find((x) => x.status === s)?._count._all ?? 0;
    return {
      total: byStatus.reduce((a, x) => a + x._count._all, 0),
      waitingApproval: waiting,
      completed: c('COMPLETED'),
      failed: c('FAILED'),
    };
  }

  async findRun(id: string, clubIdRaw: string | null) {
    const clubId = this.requireClub(clubIdRaw);
    const run = await this.prisma.workflowRun.findFirst({
      where: { id, clubId },
    });
    if (!run) throw new NotFoundException('Không tìm thấy workflow run.');
    return this.toRunResponse(run);
  }

  /**
   * GIẢI TRÌNH 1 lần chạy (AI observability — Phase 1/2). Gộp mọi dữ kiện ĐÃ CÓ để trả lời 8 câu:
   * rule nào · agent nào · tạo bao nhiêu AI Action · thành/bại · dedup/cooldown · human approval ·
   * chi phí AI · outcome nghiệp vụ (thông báo). KHÔNG lộ payload thô (chỉ id/loại/trạng thái/đếm).
   */
  async runTrace(id: string, clubIdRaw: string | null) {
    const clubId = this.requireClub(clubIdRaw);
    const run = await this.prisma.workflowRun.findFirst({ where: { id, clubId } });
    if (!run) throw new NotFoundException('Không tìm thấy workflow run.');

    const rj = (run.resultJson ?? {}) as {
      matched?: boolean;
      createdActionIds?: string[];
      skippedActionCount?: number;
      skippedDuplicateCount?: number;
      skippedCooldownCount?: number;
      autoResolvedCount?: number;
    };
    const actionIds = Array.isArray(rj.createdActionIds) ? rj.createdActionIds : [];

    const [rule, actions, jobs, usage] = await Promise.all([
      run.workflowRuleId
        ? this.prisma.workflowRule.findUnique({
            where: { id: run.workflowRuleId },
            select: { id: true, name: true, triggerType: true, scheduleType: true },
          })
        : Promise.resolve(null),
      actionIds.length
        ? this.prisma.aiAction.findMany({
            where: { id: { in: actionIds }, clubId },
            select: {
              id: true, actionType: true, riskLevel: true, status: true, title: true,
              approvalRequired: true, approvedAt: true, rejectedAt: true,
              executorAgent: true, executionDuration: true,
            },
          })
        : Promise.resolve([] as any[]),
      actionIds.length
        ? this.prisma.notificationJob.findMany({
            where: { clubId, aiActionId: { in: actionIds } },
            select: { channel: true, status: true, aiActionId: true },
          })
        : Promise.resolve([] as any[]),
      // Chi phí AI gắn theo run qua correlationId (= run.id). Engine rule-based nên thường rỗng ($0).
      this.prisma.aiUsageLog.findMany({
        where: { correlationId: id },
        select: {
          agent: true, provider: true, model: true, totalTokens: true,
          estimatedCostUsd: true, latencyMs: true, source: true, success: true,
        },
      }),
    ]);

    const durationMs =
      run.startedAt && run.completedAt
        ? new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
        : null;

    // Q2 — agent tham gia
    const agents = new Set<string>(['HERMES']);
    for (const a of actions) if (a.executorAgent) agents.add(a.executorAgent);
    for (const u of usage) agents.add((u.source ?? u.agent ?? '').toUpperCase());

    // Q6 — human approval
    const approval = {
      required: actions.filter((a) => a.approvalRequired).length,
      approved: actions.filter((a) => a.approvedAt).length,
      rejected: actions.filter((a) => a.rejectedAt).length,
      pending: actions.filter((a) => a.status === 'PENDING_APPROVAL').length,
    };

    // Q7 — chi phí AI
    const cost = {
      calls: usage.length,
      totalTokens: usage.reduce((s, u) => s + (u.totalTokens ?? 0), 0),
      estimatedCostUsd: usage.reduce((s, u) => s + Number(u.estimatedCostUsd ?? 0), 0),
      note:
        usage.length === 0
          ? 'Engine rule-based — không gọi LLM trong lần chạy này (chi phí AI ≈ $0).'
          : undefined,
    };

    // Q8 — outcome nghiệp vụ (thông báo phát sinh)
    const byChannel: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const j of jobs) {
      byChannel[j.channel] = (byChannel[j.channel] ?? 0) + 1;
      byStatus[j.status] = (byStatus[j.status] ?? 0) + 1;
    }

    return {
      run: {
        id: run.id,
        triggerType: run.triggerType,
        status: run.status,
        ruleId: run.workflowRuleId,
        ruleName: rule?.name ?? null,
        scheduleType: rule?.scheduleType ?? null,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        durationMs,
        idempotencyKey: run.idempotencyKey,
        matched: rj.matched ?? null,
        error: (run as { errorMessage?: string | null }).errorMessage ?? null,
      },
      // 8 câu hỏi giải trình
      q1_rule: { ruleId: run.workflowRuleId, ruleName: rule?.name ?? null, triggerType: run.triggerType },
      q2_agents: [...agents].filter(Boolean),
      q3_actions: {
        created: actions.length,
        items: actions.map((a) => ({
          id: a.id,
          actionType: a.actionType,
          riskLevel: a.riskLevel,
          status: a.status,
          title: a.title,
          executionDurationMs: a.executionDuration ?? null,
        })),
      },
      q4_result: { status: run.status, matched: rj.matched ?? null },
      q5_dedup: {
        skippedDuplicate: rj.skippedDuplicateCount ?? 0,
        skippedCooldown: rj.skippedCooldownCount ?? 0,
        skippedOther: rj.skippedActionCount ?? 0,
        autoResolved: rj.autoResolvedCount ?? 0,
      },
      q6_approval: approval,
      q7_cost: cost,
      q8_business: { notifications: { total: jobs.length, byChannel, byStatus } },
    };
  }

  /**
   * TỔNG QUAN observability (Phase 2 cost + KPI): 30 ngày gần nhất, scope theo clubId.
   * Runs: tổng/thành công/thất bại/chờ duyệt · tỷ lệ thành công · thời lượng TB · dedup/cooldown.
   * Chi phí AI: gộp AiUsageLog theo `source` (maika/lisa/harness/…) — token + cost USD ước tính.
   */
  async observabilitySummary(clubIdRaw: string | null) {
    const clubId = this.requireClub(clubIdRaw);
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const runs = await this.prisma.workflowRun.findMany({
      where: { clubId, startedAt: { gte: since } },
      select: { status: true, startedAt: true, completedAt: true, resultJson: true },
    });
    const total = runs.length;
    const failed = runs.filter((r) => r.status === 'FAILED').length;
    const waitingApproval = runs.filter((r) => r.status === 'WAITING_APPROVAL').length;
    const completed = runs.filter((r) => r.status === 'COMPLETED').length;
    // CHỈ đo thời lượng ENGINE (chạy đồng bộ). Run tạo AI Action → WAITING_APPROVAL, completedAt
    // được set lúc RESOLVE (hàng giờ sau) → phản ánh thời gian CHỜ DUYỆT, không phải engine.
    // Lọc ngưỡng 60s để loại pollution chờ-duyệt (engine thực tế chỉ ~ms).
    const ENGINE_MAX_MS = 60_000;
    const durations = runs
      .filter((r) => r.startedAt && r.completedAt)
      .map((r) => new Date(r.completedAt as Date).getTime() - new Date(r.startedAt as Date).getTime())
      .filter((d) => d >= 0 && d <= ENGINE_MAX_MS);
    const avgDurationMs = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;
    let skippedDuplicate = 0;
    let skippedCooldown = 0;
    for (const r of runs) {
      const rj = (r.resultJson ?? {}) as { skippedDuplicateCount?: number; skippedCooldownCount?: number };
      skippedDuplicate += rj.skippedDuplicateCount ?? 0;
      skippedCooldown += rj.skippedCooldownCount ?? 0;
    }

    const where = { clubId, createdAt: { gte: since } };
    const [bySourceRaw, byModelRaw, byAgentRaw] = await Promise.all([
      this.prisma.aiUsageLog.groupBy({ by: ['source'], where, _sum: { totalTokens: true, estimatedCostUsd: true }, _count: { _all: true } }),
      this.prisma.aiUsageLog.groupBy({ by: ['model'], where, _sum: { totalTokens: true, estimatedCostUsd: true }, _count: { _all: true } }),
      this.prisma.aiUsageLog.groupBy({ by: ['agent'], where, _sum: { totalTokens: true, estimatedCostUsd: true }, _count: { _all: true } }),
    ]);
    const mapRows = <K extends string>(rows: any[], key: K) =>
      rows
        .map((u) => ({
          [key]: u[key] ?? 'unknown',
          calls: u._count._all,
          totalTokens: u._sum.totalTokens ?? 0,
          estimatedCostUsd: Number(u._sum.estimatedCostUsd ?? 0),
        }))
        .sort((a: any, b: any) => b.estimatedCostUsd - a.estimatedCostUsd || b.calls - a.calls);
    const bySource = mapRows(bySourceRaw, 'source');
    const byModel = mapRows(byModelRaw, 'model');
    const byAgent = mapRows(byAgentRaw, 'agent');
    const aiCost = {
      calls: bySource.reduce((s, x) => s + x.calls, 0),
      totalTokens: bySource.reduce((s, x) => s + x.totalTokens, 0),
      estimatedCostUsd: bySource.reduce((s, x) => s + x.estimatedCostUsd, 0),
      bySource,
      byModel,
      byAgent,
    };

    return {
      periodDays: 30,
      runs: {
        total,
        completed,
        failed,
        waitingApproval,
        successRate: total ? Math.round(((total - failed) / total) * 100) : 0,
        avgDurationMs,
        skippedDuplicate,
        skippedCooldown,
      },
      aiCost,
    };
  }

  listTemplates() {
    return WORKFLOW_TEMPLATES;
  }

  // ---------- Engine ----------
  /**
   * Test-trigger 1 rule thủ công. Tạo WorkflowRun theo dõi vòng đời.
   * - rule disabled → CANCELLED (không chạy).
   * - điều kiện không khớp → COMPLETED (matched=false).
   * - điều kiện lỗi → FAILED (safe, không ném lỗi ra ngoài).
   * - khớp → tạo AiAction (HERMES) qua Action Center cho action operational →
   *   WAITING_APPROVAL (không thực thi trực tiếp).
   */
  async testTrigger(
    ruleId: string,
    clubIdRaw: string | null,
    actor: WorkflowActor,
    contextJson?: Record<string, unknown>,
  ) {
    const clubId = this.requireClub(clubIdRaw);
    const rule = await this.requireRule(ruleId, clubId);
    const context = contextJson ?? {};

    if (!rule.enabled) {
      const cancelled = await this.prisma.workflowRun.create({
        data: {
          clubId,
          workflowRuleId: rule.id,
          triggerType: rule.triggerType,
          status: 'CANCELLED',
          contextJson: context as Prisma.InputJsonValue,
          resultJson: { skipped: true, reason: 'Rule disabled' },
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });
      return this.toRunResponse(cancelled);
    }

    const finished = await this.executeRuleRun(rule, clubId, actor, context);
    return this.toRunResponse(finished);
  }

  /**
   * Runtime dispatch (Epic 6): đánh giá TẤT CẢ rule enabled của clubId + triggerType.
   * - Mỗi rule tạo 1 WorkflowRun (kể cả không khớp → COMPLETED matched=false, để audit).
   * - Rule khớp → tạo AiAction qua Action Center (KHÔNG thực thi trực tiếp).
   * - 1 rule lỗi → run đó FAILED, các rule khác vẫn chạy (partial summary).
   * - idempotencyKey (tuỳ chọn): key đã dùng → skip toàn bộ, không tạo run mới.
   * - options.scheduleType (POLISH Epic 9): CHỈ đánh giá rule có đúng scheduleType
   *   đó (scheduler dùng để rule MANUAL không bao giờ tự chạy khi trùng triggerType).
   *   Không truyền → ngữ nghĩa business event Epic 7 giữ nguyên (mọi rule enabled).
   * - Trả về DispatchSummary AN TOÀN (chỉ số đếm, không context/error thô).
   */
  async dispatchTrigger(
    clubIdRaw: string | null,
    triggerType: string,
    actor: WorkflowActor,
    contextJson?: Record<string, unknown>,
    idempotencyKey?: string,
    options?: { scheduleType?: string },
  ): Promise<DispatchSummary> {
    const clubId = this.requireClub(clubIdRaw);
    if (
      !SUPPORTED_TRIGGER_TYPES.includes(triggerType as SupportedTriggerType)
    ) {
      throw new BadRequestException(
        `Trigger type không hỗ trợ: ${SUPPORTED_TRIGGER_TYPES.join(', ')}.`,
      );
    }
    const context = contextJson ?? {};
    const key = idempotencyKey?.trim() ? idempotencyKey.trim() : null;

    const summary: DispatchSummary = {
      triggerType,
      totalRules: 0,
      matchedRules: 0,
      createdRuns: 0,
      createdActions: 0,
      skippedActions: 0,
      autoResolvedActions: 0,
      failedRuns: 0,
      skippedDuplicate: false,
    };

    // Idempotency guard cấp service: key đã dùng cho club này → không dispatch lại.
    if (key) {
      const dup = await this.prisma.workflowRun.findFirst({
        where: { clubId, idempotencyKey: key },
        select: { id: true },
      });
      if (dup) {
        summary.skippedDuplicate = true;
        return summary;
      }
    }

    const rules = await this.prisma.workflowRule.findMany({
      where: {
        clubId,
        triggerType,
        enabled: true,
        // Scheduled dispatch lọc đúng scheduleType — rule MANUAL bị loại.
        ...(options?.scheduleType
          ? { scheduleType: options.scheduleType }
          : {}),
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
    summary.totalRules = rules.length;

    for (const rule of rules) {
      try {
        const run = await this.executeRuleRun(
          rule,
          clubId,
          actor,
          context,
          key,
        );
        summary.createdRuns += 1;
        if (run.status === 'FAILED') summary.failedRuns += 1;
        const res = (run.resultJson ?? {}) as {
          matched?: boolean;
          createdActionIds?: string[];
          skippedActionCount?: number;
          autoResolvedCount?: number;
        };
        summary.skippedActions += res.skippedActionCount ?? 0;
        summary.autoResolvedActions += res.autoResolvedCount ?? 0;
        if (res.matched === true) {
          summary.matchedRules += 1;
          summary.createdActions += res.createdActionIds?.length ?? 0;
        }
      } catch (e) {
        // Race 2 dispatch cùng key: unique index (clubId, ruleId, key) chặn — coi là duplicate.
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          summary.skippedDuplicate = true;
          continue;
        }
        // Lỗi ngoài run-lifecycle (hiếm): log server-side, đếm failed, tiếp tục rule khác.
        this.sanitizeError(e);
        summary.failedRuns += 1;
      }
    }
    return summary;
  }

  /**
   * Xây ngữ cảnh trigger từ DỮ LIỆU THẬT của CLB (để rule khớp thực tế, không rỗng).
   * Trả về CHỈ số đếm/cờ tổng hợp của CLB (không PII) — an toàn hiển thị cho admin.
   */
  async buildLiveContext(
    clubId: string,
    triggerType: string,
  ): Promise<Record<string, unknown>> {
    if (triggerType === 'DEBT_ESCALATION') {
      const period = await this.prisma.fundPeriod.findFirst({
        where: { clubId, status: 'active', type: 'chung' },
        orderBy: { startDate: 'desc' },
        select: { id: true },
      });
      if (!period) return { unpaidCount: 0, hasActivePeriod: false };
      const [memberCount, paidRows] = await Promise.all([
        this.prisma.member.count({ where: { clubId, isDeleted: false } }),
        this.prisma.fundContribution.findMany({
          where: {
            clubId,
            fundPeriodId: period.id,
            fundSource: 'COMMON',
            isConfirmed: true,
            memberId: { not: null },
          },
          select: { memberId: true },
          distinct: ['memberId'],
        }),
      ]);
      const unpaidCount = Math.max(0, memberCount - paidRows.length);
      return {
        unpaidCount,
        memberCount,
        paidCount: paidRows.length,
        hasActivePeriod: true,
      };
    }
    if (triggerType === 'EVENT_REMINDER') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcomingSessions = await this.prisma.attendanceSession.count({
        where: { clubId, sessionDate: { gte: today } },
      });
      return { upcomingSessions };
    }
    if (triggerType === 'REPORT_DISPATCH') {
      const finalizedCount = await this.prisma.fundPeriod.count({
        where: { clubId, status: 'finalized' },
      });
      return { periodFinalized: finalizedCount > 0, finalizedCount };
    }
    // ── Phase 2 (lô Tài chính) — dữ liệu thật, KHÔNG suy diễn ──
    if (triggerType === 'FUND_BALANCE_RISK') {
      // Số dư Quỹ Chính toàn thời gian = clubAssets (Σ thu COMMON đã xác nhận − Σ chi COMMON
      // approved/paid). Bao gồm carryForward vì cộng dồn mọi kỳ; KHÔNG cộng Quỹ Phụ (MINI).
      const [incomeAgg, expenseAgg] = await Promise.all([
        this.prisma.fundContribution.aggregate({
          where: { clubId, fundSource: 'COMMON', isConfirmed: true },
          _sum: { amount: true },
        }),
        this.prisma.livingExpense.aggregate({
          where: {
            clubId,
            fundSource: 'COMMON',
            status: { in: ['approved', 'paid'] },
          },
          _sum: { amount: true },
        }),
      ]);
      const fundBalance =
        Number(incomeAgg._sum.amount ?? 0) - Number(expenseAgg._sum.amount ?? 0);
      return {
        fundBalance,
        balanceNegative: fundBalance < 0,
        dedupScope: 'fund', // 1 cảnh báo quỹ đang mở / CLB (số dư là mức toàn CLB)
      };
    }
    if (triggerType === 'PAYMENT_DUE_REMINDER') {
      // Nhắc TRƯỚC hạn: kỳ chung đang mở, còn thành viên chưa đóng, còn ngày tới hạn (endDate kỳ).
      const period = await this.prisma.fundPeriod.findFirst({
        where: { clubId, status: 'active', type: 'chung' },
        orderBy: { startDate: 'desc' },
        select: { id: true, endDate: true },
      });
      if (!period) return { hasActivePeriod: false, unpaidCount: 0 };
      const [memberCount, paidRows] = await Promise.all([
        this.prisma.member.count({ where: { clubId, isDeleted: false } }),
        this.prisma.fundContribution.findMany({
          where: {
            clubId,
            fundPeriodId: period.id,
            fundSource: 'COMMON',
            isConfirmed: true,
            memberId: { not: null },
          },
          select: { memberId: true },
          distinct: ['memberId'],
        }),
      ]);
      const unpaidCount = Math.max(0, memberCount - paidRows.length);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(period.endDate);
      due.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.round(
        (due.getTime() - today.getTime()) / 86_400_000,
      );
      return {
        hasActivePeriod: true,
        unpaidCount,
        daysUntilDue,
        beforeDue: daysUntilDue >= 0, // >=0: trước/đến hạn (quá hạn → DEBT_ESCALATION lo)
        dedupScope: period.id,
      };
    }
    if (triggerType === 'MISSING_FINANCE_DOCUMENT') {
      // Chi Quỹ Chính đã duyệt/đã chi, tồn tại quá 3 ngày nhưng CHƯA có chứng từ (receiptUrl null).
      const cutoff = new Date(Date.now() - 3 * 86_400_000);
      const missingDocCount = await this.prisma.livingExpense.count({
        where: {
          clubId,
          fundSource: 'COMMON',
          status: { in: ['approved', 'paid'] },
          receiptUrl: null,
          createdAt: { lte: cutoff },
        },
      });
      return { missingDocCount, dedupScope: 'docs' };
    }
    // ── Phase 3 (lô Hoạt động CLB) — dữ liệu thật ──
    if (triggerType === 'LOW_SESSION_REGISTRATION') {
      // Buổi sắp diễn ra (hôm nay/ngày mai, chưa hủy/chưa qua) có ít người đăng ký.
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const horizon = new Date(today);
      horizon.setDate(horizon.getDate() + 1);
      const session = await this.prisma.attendanceSession.findFirst({
        where: {
          clubId,
          status: 'scheduled',
          sessionDate: { gte: today, lte: horizon },
        },
        orderBy: { sessionDate: 'asc' },
        select: { id: true },
      });
      if (!session) return { hasUpcomingSoon: false, registeredCount: 0 };
      const registeredCount = await this.prisma.sessionRegistration.count({
        where: { clubId, attendanceSessionId: session.id },
      });
      return {
        hasUpcomingSoon: true,
        sessionId: session.id,
        registeredCount,
        dedupScope: session.id,
      };
    }
    if (triggerType === 'ATTENDANCE_NOT_CLOSED') {
      // Buổi đã qua ngày nhưng còn 'scheduled' (chưa chốt = chưa completed/cancelled).
      const cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0);
      const notClosedCount = await this.prisma.attendanceSession.count({
        where: { clubId, status: 'scheduled', sessionDate: { lt: cutoff } },
      });
      return { notClosedCount, dedupScope: 'attendance' };
    }
    if (triggerType === 'SESSION_CAPACITY_RISK') {
      // Buổi sắp tới có SỐ ĐĂNG KÝ cao nhất (ngưỡng sức chứa nằm ở conditionsJson của rule).
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sessions = await this.prisma.attendanceSession.findMany({
        where: { clubId, status: 'scheduled', sessionDate: { gte: today } },
        select: { id: true, _count: { select: { registrations: true } } },
        orderBy: { sessionDate: 'asc' },
        take: 30,
      });
      let top: { id: string; count: number } | null = null;
      for (const s of sessions) {
        const c = s._count.registrations;
        if (!top || c > top.count) top = { id: s.id, count: c };
      }
      if (!top) return { hasUpcoming: false, registeredCount: 0 };
      return {
        hasUpcoming: true,
        sessionId: top.id,
        registeredCount: top.count,
        dedupScope: top.id,
      };
    }
    if (triggerType === 'LOW_MEMBER_ATTENDANCE') {
      // Chuyên cần thấp trong kỳ active: đủ buổi ĐÃ CHỐT (completed) mới đánh giá; dùng
      // điểm danh THỰC TẾ (PRESENT), KHÔNG dùng đăng ký. Ngưỡng mặc định < 50%.
      const period = await this.prisma.fundPeriod.findFirst({
        where: { clubId, status: 'active', type: 'chung' },
        orderBy: { startDate: 'desc' },
        select: { id: true },
      });
      if (!period) return { hasActivePeriod: false, lowAttendanceCount: 0 };
      const sessions = await this.prisma.attendanceSession.findMany({
        where: { clubId, fundPeriodId: period.id, status: 'completed' },
        select: { id: true },
      });
      const totalCompleted = sessions.length;
      if (totalCompleted < 3) {
        return { hasActivePeriod: true, totalCompleted, lowAttendanceCount: 0 };
      }
      const [members, present] = await Promise.all([
        this.prisma.member.findMany({
          where: { clubId, isDeleted: false, status: 'active' },
          select: { id: true },
        }),
        this.prisma.attendanceRecord.groupBy({
          by: ['memberId'],
          where: {
            clubId,
            status: 'PRESENT',
            attendanceSessionId: { in: sessions.map((s) => s.id) },
          },
          _count: { _all: true },
        }),
      ]);
      const presentMap = new Map<string, number>(
        present.map((p) => [p.memberId, p._count._all]),
      );
      let lowAttendanceCount = 0;
      for (const m of members) {
        const rate = (presentMap.get(m.id) ?? 0) / totalCompleted;
        if (rate < 0.5) lowAttendanceCount += 1;
      }
      return {
        hasActivePeriod: true,
        totalCompleted,
        lowAttendanceCount,
        dedupScope: period.id,
      };
    }
    // ── Phase 4 (lô Điều phối + Thi đấu + Báo cáo) ──
    if (triggerType === 'APPROVAL_OVERDUE') {
      // AI Action còn chờ duyệt quá 48h (loại chính rule này để không tự tham chiếu).
      const cutoff = new Date(Date.now() - 48 * 3_600_000);
      const overdueApprovalCount = await this.prisma.aiAction.count({
        where: {
          clubId,
          status: 'PENDING_APPROVAL',
          createdAt: { lte: cutoff },
          NOT: { actionType: 'workflow:APPROVAL_OVERDUE' },
        },
      });
      return { overdueApprovalCount, dedupScope: 'approvals' };
    }
    if (triggerType === 'MATCH_RESULT_MISSING') {
      // Trận trong giải ĐANG diễn ra (>1 ngày) chưa có kết quả (scoreA null, chưa hoàn tất/hủy).
      const cutoff = new Date(Date.now() - 1 * 86_400_000);
      const missingResultCount = await this.prisma.minigameMatch.count({
        where: {
          minigame: { clubId, status: 'ACTIVE', startedAt: { lte: cutoff } },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          scoreA: null,
        },
      });
      return { missingResultCount, dedupScope: 'matches' };
    }
    if (triggerType === 'WEEKLY_CLUB_HEALTH_REPORT') {
      // Ảnh chụp sức khỏe CLB (Maika phân tích — dữ liệu thật): quỹ, công nợ, buổi sắp tới.
      const [incomeAgg, expenseAgg, period, upcoming] = await Promise.all([
        this.prisma.fundContribution.aggregate({
          where: { clubId, fundSource: 'COMMON', isConfirmed: true },
          _sum: { amount: true },
        }),
        this.prisma.livingExpense.aggregate({
          where: {
            clubId,
            fundSource: 'COMMON',
            status: { in: ['approved', 'paid'] },
          },
          _sum: { amount: true },
        }),
        this.prisma.fundPeriod.findFirst({
          where: { clubId, status: 'active', type: 'chung' },
          orderBy: { startDate: 'desc' },
          select: { id: true },
        }),
        (() => {
          const t = new Date();
          t.setHours(0, 0, 0, 0);
          return this.prisma.attendanceSession.count({
            where: { clubId, status: 'scheduled', sessionDate: { gte: t } },
          });
        })(),
      ]);
      let unpaidCount = 0;
      if (period) {
        const [memberCount, paidRows] = await Promise.all([
          this.prisma.member.count({ where: { clubId, isDeleted: false } }),
          this.prisma.fundContribution.findMany({
            where: {
              clubId,
              fundPeriodId: period.id,
              fundSource: 'COMMON',
              isConfirmed: true,
              memberId: { not: null },
            },
            select: { memberId: true },
            distinct: ['memberId'],
          }),
        ]);
        unpaidCount = Math.max(0, memberCount - paidRows.length);
      }
      const fundBalance =
        Number(incomeAgg._sum.amount ?? 0) - Number(expenseAgg._sum.amount ?? 0);
      return {
        reportingWeek: this.isoWeekKey(new Date()),
        fundBalance,
        unpaidCount,
        upcomingSessions: upcoming,
        dedupScope: this.isoWeekKey(new Date()),
      };
    }
    return {};
  }

  /** Khoá tuần ISO `YYYY-Www` (deterministic) — dùng cho dedup báo cáo tuần. */
  private isoWeekKey(d: Date): string {
    const date = new Date(
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()),
    );
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(
      ((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
    );
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  /**
   * Dispatch dùng ngữ cảnh DỮ LIỆU THẬT (admin bấm "Chạy dữ liệu thật").
   * Không idempotencyKey → mỗi lần chạy tạo run mới (hành động thủ công có chủ đích).
   * Trả về summary + liveContext (số liệu CLB) để admin thấy vì sao khớp/không.
   */
  async dispatchLive(
    clubIdRaw: string | null,
    triggerType: string,
    actor: WorkflowActor,
  ): Promise<DispatchSummary & { liveContext: Record<string, unknown> }> {
    const clubId = this.requireClub(clubIdRaw);
    if (
      !SUPPORTED_TRIGGER_TYPES.includes(triggerType as SupportedTriggerType)
    ) {
      throw new BadRequestException(
        `Trigger type không hỗ trợ: ${SUPPORTED_TRIGGER_TYPES.join(', ')}.`,
      );
    }
    const liveContext = await this.buildLiveContext(clubId, triggerType);
    const summary = await this.dispatchTrigger(
      clubId,
      triggerType,
      actor,
      liveContext,
    );
    return { ...summary, liveContext };
  }

  /**
   * Lõi engine dùng chung (test-trigger + runtime dispatch): tạo run RUNNING →
   * đánh giá điều kiện → tạo AiAction (HERMES) nếu khớp → cập nhật trạng thái cuối.
   * KHÔNG ném lỗi đánh giá ra ngoài — run FAILED với errorMessage generic.
   */
  private async executeRuleRun(
    rule: {
      id: string;
      name: string;
      triggerType: string;
      conditionsJson: unknown;
      actionsJson: unknown;
    },
    clubId: string,
    actor: WorkflowActor,
    context: Record<string, unknown>,
    idempotencyKey: string | null = null,
  ) {
    const run = await this.prisma.workflowRun.create({
      data: {
        clubId,
        workflowRuleId: rule.id,
        triggerType: rule.triggerType,
        status: 'RUNNING',
        contextJson: context as Prisma.InputJsonValue,
        idempotencyKey,
        startedAt: new Date(),
      },
    });

    try {
      const matched = this.evaluateConditions(rule.conditionsJson, context);
      // Phase 2: dedupScope do buildLiveContext cung cấp (nếu có) → khoá dedup ổn định.
      const dedupScope =
        typeof context.dedupScope === 'string' ? context.dedupScope : null;
      const dedupKey = dedupScope
        ? `${rule.triggerType}:${dedupScope}`
        : null;

      if (!matched) {
        // Auto-resolve: nguyên nhân không còn → đóng AI Action chờ duyệt cùng dedupKey.
        let autoResolvedCount = 0;
        if (dedupKey) {
          autoResolvedCount = await this.aiActions.resolveByDedupKey(
            clubId,
            dedupKey,
          );
        }
        return await this.prisma.workflowRun.update({
          where: { id: run.id },
          data: {
            status: 'COMPLETED',
            resultJson: { matched: false, createdActionIds: [], autoResolvedCount },
            completedAt: new Date(),
          },
        });
      }

      const actions = Array.isArray(rule.actionsJson)
        ? (rule.actionsJson as unknown[])
        : [];
      const createdActionIds: string[] = [];
      let skippedActionCount = 0;
      // Ghi nhận TỐI THIỂU tách nguyên nhân bỏ qua (dedup vs cooldown) vào chính resultJson
      // hiện có — KHÔNG bảng/subsystem mới, KHÔNG migration. AI Operations Center đọc lại để
      // hiển thị KPI "Bỏ qua trùng" (duplicate) và "Bị chặn cooldown" (cooldown) theo ngày.
      let skippedDuplicateCount = 0;
      let skippedCooldownCount = 0;
      for (const raw of actions) {
        const a = (raw ?? {}) as WfAction;
        if (a.type !== 'CREATE_AI_ACTION') continue; // chỉ tạo AiAction; type khác bỏ qua (an toàn)
        const created = await this.aiActions.create(
          clubId,
          actor.userId,
          {
            requestedByAi: 'HERMES',
            actionType: a.title
              ? `workflow:${rule.triggerType}`
              : 'workflow-action',
            targetModule: a.targetModule,
            targetEntityType: a.targetEntityType,
            targetEntityId: a.targetEntityId,
            riskLevel: this.normalizeRisk(a.riskLevel),
            title: a.title ?? rule.name,
            summary: a.summary,
            requestPayload: a.requestPayload,
          },
          // Chỉ bật dedup/cooldown khi rule cung cấp dedupScope (rule Phase 2).
          dedupKey
            ? { key: dedupKey, cooldownMinutes: a.cooldownMinutes }
            : undefined,
        );
        if ('skipped' in created) {
          skippedActionCount += 1; // trùng/cooldown → không tạo mới
          if (created.skipped === 'SKIPPED_COOLDOWN') skippedCooldownCount += 1;
          else skippedDuplicateCount += 1;
        } else {
          createdActionIds.push(created.id);
        }
      }

      return await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          // Có AiAction chờ duyệt → WAITING_APPROVAL; không có action operational → COMPLETED.
          status:
            createdActionIds.length > 0 ? 'WAITING_APPROVAL' : 'COMPLETED',
          resultJson: {
            matched: true,
            createdActionIds,
            actionCount: createdActionIds.length,
            skippedActionCount,
            skippedDuplicateCount,
            skippedCooldownCount,
          },
          completedAt: new Date(),
        },
      });
    } catch (e) {
      // KHÔNG lưu raw Error.message — generic + log server-side.
      return await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          errorMessage: this.sanitizeError(e),
          completedAt: new Date(),
        },
      });
    }
  }

  private normalizeRisk(risk?: string): AiActionRisk {
    const up = (risk ?? '').toUpperCase() as AiActionRisk;
    return VALID_RISK.includes(up) ? up : 'MEDIUM';
  }

  /** Đánh giá điều kiện JSON AN TOÀN (deterministic, KHÔNG eval/Function). */
  private evaluateConditions(
    cond: unknown,
    ctx: Record<string, unknown>,
  ): boolean {
    if (cond === null || cond === undefined) return true; // không điều kiện → luôn khớp
    if (typeof cond !== 'object') {
      throw new BadRequestException('Điều kiện workflow không hợp lệ.');
    }
    const c = cond as WfCondition;
    if (Array.isArray(c.all))
      return c.all.every((x) => this.evaluateConditions(x, ctx));
    if (Array.isArray(c.any))
      return c.any.some((x) => this.evaluateConditions(x, ctx));
    if (typeof c.field === 'string' && typeof c.op === 'string') {
      return this.evalLeaf(c.field, c.op, c.value, ctx);
    }
    throw new BadRequestException('Điều kiện workflow không hợp lệ.');
  }

  private evalLeaf(
    field: string,
    op: string,
    value: unknown,
    ctx: Record<string, unknown>,
  ): boolean {
    const actual = ctx[field];
    switch (op) {
      case 'eq':
        return actual === value;
      case 'ne':
        return actual !== value;
      case 'exists':
        return actual !== undefined && actual !== null;
      case 'gt':
        return (
          typeof actual === 'number' &&
          typeof value === 'number' &&
          actual > value
        );
      case 'gte':
        return (
          typeof actual === 'number' &&
          typeof value === 'number' &&
          actual >= value
        );
      case 'lt':
        return (
          typeof actual === 'number' &&
          typeof value === 'number' &&
          actual < value
        );
      case 'lte':
        return (
          typeof actual === 'number' &&
          typeof value === 'number' &&
          actual <= value
        );
      default:
        throw new BadRequestException(`Toán tử điều kiện không hỗ trợ: ${op}`);
    }
  }
}
