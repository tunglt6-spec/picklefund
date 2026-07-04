import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
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
    const rule = await this.prisma.workflowRule.create({
      data: {
        clubId,
        name: dto.name,
        triggerType: dto.triggerType,
        conditionsJson: (dto.conditionsJson ??
          undefined) as Prisma.InputJsonValue,
        actionsJson: (dto.actionsJson ?? undefined) as Prisma.InputJsonValue,
        enabled: dto.enabled ?? true,
        priority: dto.priority ?? 100,
        createdById: userId,
      },
    });
    return this.toRuleResponse(rule);
  }

  async updateRule(
    id: string,
    clubIdRaw: string | null,
    dto: UpdateWorkflowRuleDto,
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
      },
    });
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
  async listRuns(
    clubIdRaw: string | null,
    filters: { status?: string; ruleId?: string },
  ) {
    const clubId = this.requireClub(clubIdRaw);
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

  async findRun(id: string, clubIdRaw: string | null) {
    const clubId = this.requireClub(clubIdRaw);
    const run = await this.prisma.workflowRun.findFirst({
      where: { id, clubId },
    });
    if (!run) throw new NotFoundException('Không tìm thấy workflow run.');
    return this.toRunResponse(run);
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

    const run = await this.prisma.workflowRun.create({
      data: {
        clubId,
        workflowRuleId: rule.id,
        triggerType: rule.triggerType,
        status: 'RUNNING',
        contextJson: context as Prisma.InputJsonValue,
        startedAt: new Date(),
      },
    });

    try {
      const matched = this.evaluateConditions(rule.conditionsJson, context);
      if (!matched) {
        const done = await this.prisma.workflowRun.update({
          where: { id: run.id },
          data: {
            status: 'COMPLETED',
            resultJson: { matched: false, createdActionIds: [] },
            completedAt: new Date(),
          },
        });
        return this.toRunResponse(done);
      }

      const actions = Array.isArray(rule.actionsJson)
        ? (rule.actionsJson as unknown[])
        : [];
      const createdActionIds: string[] = [];
      for (const raw of actions) {
        const a = (raw ?? {}) as WfAction;
        if (a.type !== 'CREATE_AI_ACTION') continue; // chỉ tạo AiAction; type khác bỏ qua (an toàn)
        const created = await this.aiActions.create(clubId, actor.userId, {
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
        });
        createdActionIds.push(created.id);
      }

      const finished = await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          // Có AiAction chờ duyệt → WAITING_APPROVAL; không có action operational → COMPLETED.
          status:
            createdActionIds.length > 0 ? 'WAITING_APPROVAL' : 'COMPLETED',
          resultJson: {
            matched: true,
            createdActionIds,
            actionCount: createdActionIds.length,
          },
          completedAt: new Date(),
        },
      });
      return this.toRunResponse(finished);
    } catch (e) {
      // KHÔNG lưu raw Error.message — generic + log server-side.
      const failed = await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          errorMessage: this.sanitizeError(e),
          completedAt: new Date(),
        },
      });
      return this.toRunResponse(failed);
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
