/**
 * ActionLayerService (Sprint 3, Epic 3.4) — orchestrator AI Action Layer.
 *
 * CHỈ proposal / dry-run / validate. KHÔNG execute/persist/write/send. Pipeline:
 * classify → permission → safety → dry-run → audit-preview → ActionProposal.
 * Mọi proposal: readOnly, mutates=false, requiresHumanApproval=true,
 * approvalStatus='required', approvedBy/At=null, executionStatus='not_executed'.
 * Guard assertProposalSafe ép buộc bất biến.
 */
import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ActionPermissionService } from './action-permission.service';
import { ActionSafetyService } from './action-safety.service';
import { ActionDryRunService } from './action-dry-run.service';
import {
  AuditLogPreview,
  PermissionDecision,
  SafetyDecision,
} from './action-audit.types';
import {
  ActionActorContext,
  ActionProposal,
  ActionRequestInput,
  ActionType,
  ActionTypeClassification,
  RiskLevel,
} from './action-layer.types';

const TITLES: Record<ActionType, string> = {
  [ActionType.MEMBER_REVIEW_PROPOSAL]: 'Đề xuất rà soát thành viên',
  [ActionType.SEASON_PREPARATION_PROPOSAL]: 'Đề xuất chuẩn bị kỳ/mùa',
  [ActionType.FUND_REVIEW_PROPOSAL]: 'Đề xuất rà soát quỹ (tài chính)',
  [ActionType.DATA_QUALITY_PROPOSAL]: 'Đề xuất rà soát chất lượng dữ liệu',
  [ActionType.TOURNAMENT_REVIEW_PROPOSAL]: 'Đề xuất rà soát giải đấu',
};

@Injectable()
export class ActionLayerService {
  constructor(
    private readonly permission: ActionPermissionService,
    private readonly safety: ActionSafetyService,
    private readonly dryRunner: ActionDryRunService,
  ) {}

  /** Validate (permission + safety) — không build dry-run/proposal. */
  validate(
    ctx: ActionActorContext,
    input: ActionRequestInput,
  ): {
    permissionDecision: PermissionDecision;
    safetyDecision: SafetyDecision;
  } {
    this.requireClub(ctx);
    const classification = this.safety.classify(input.actionType);
    const riskLevel = this.riskOf(classification);
    return {
      permissionDecision: this.permission.check(ctx, classification, riskLevel),
      safetyDecision: this.safety.evaluate(classification, input.objective),
    };
  }

  /** Tạo ActionProposal dry-run (read-only). KHÔNG execute/persist. */
  dryRun(ctx: ActionActorContext, input: ActionRequestInput): ActionProposal {
    this.requireClub(ctx);
    const classification = this.safety.classify(input.actionType);
    const riskLevel = this.riskOf(classification);
    const permissionDecision = this.permission.check(
      ctx,
      classification,
      riskLevel,
    );
    const safetyDecision = this.safety.evaluate(
      classification,
      input.objective,
    );
    const dryRun = this.dryRunner.build(
      classification,
      permissionDecision,
      safetyDecision,
    );

    const actionId = randomUUID();
    const now = new Date();
    const clubId = ctx.clubId as string;

    const auditLogPreview: AuditLogPreview = {
      actionId,
      clubId,
      requestedBy: ctx.userId ?? null,
      actionType: classification.raw,
      riskLevel,
      permissionDecision,
      safetyDecision,
      dryRunOnly: true,
      executed: false,
      timestamp: now,
    };

    const proposal: ActionProposal = {
      id: actionId,
      clubId,
      requestedBy: ctx.userId ?? null,
      actionType: classification.raw,
      title: classification.type
        ? TITLES[classification.type]
        : 'Action không hỗ trợ',
      description: this.describe(classification, input.objective),
      source: input.sourcePlanId ?? 'maika-action-layer',
      riskLevel,
      status: 'proposed',
      readOnly: true,
      mutates: false,
      requiresHumanApproval: true,
      approvalStatus: 'required',
      approvedBy: null,
      approvedAt: null,
      executionStatus: 'not_executed',
      permissionDecision,
      safetyDecision,
      dryRun,
      auditLogPreview,
      generatedAt: now,
    };

    this.assertProposalSafe(proposal);
    return proposal;
  }

  private riskOf(c: ActionTypeClassification): RiskLevel {
    if (c.isWriteOrExecute || !c.supported) return 'critical';
    if (c.type === ActionType.FUND_REVIEW_PROPOSAL) return 'high';
    return 'low';
  }

  private describe(
    c: ActionTypeClassification,
    objective: string | undefined,
  ): string {
    const base = c.supported
      ? 'Đề xuất (proposal) read-only — cần con người duyệt. KHÔNG thực thi/ghi.'
      : 'Action không được hỗ trợ ở Epic 3.4 — đã chặn (không executable).';
    const safeObjective = this.safety.sanitizeObjectiveText(objective);
    return safeObjective
      ? `${base} Mục tiêu (đã làm sạch): ${safeObjective}`
      : base;
  }

  private requireClub(ctx: ActionActorContext): void {
    if (!ctx.clubId) throw new Error('clubId là bắt buộc (tenant isolation)');
  }

  /** Defensive guard — KHÔNG bao giờ executable/auto-approved. */
  private assertProposalSafe(p: ActionProposal): void {
    if (
      p.status !== 'proposed' ||
      p.readOnly !== true ||
      p.mutates !== false ||
      p.requiresHumanApproval !== true ||
      p.approvalStatus !== 'required' ||
      p.approvedBy !== null ||
      p.approvedAt !== null ||
      p.executionStatus !== 'not_executed'
    ) {
      throw new Error(
        'Vi phạm AI Action Safety: proposal phải read-only & chờ duyệt.',
      );
    }
    if (
      p.safetyDecision.actionExecutionAllowed !== false ||
      p.safetyDecision.writeOperationsAllowed !== false
    ) {
      throw new Error(
        'Vi phạm AI Action Safety: execution/write không được phép.',
      );
    }
  }
}
