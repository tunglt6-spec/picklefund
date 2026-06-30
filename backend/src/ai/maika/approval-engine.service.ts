/**
 * ApprovalEngineService (Sprint 3, Epic 3.5) — orchestrator Human Approval Engine.
 *
 * CHỈ evaluate / preview / explain. KHÔNG approve/reject thật, KHÔNG execute, KHÔNG
 * persist, KHÔNG write/DB/email/telegram/notification/workflow/job-queue/external.
 * objective qua VectorContentPolicy (finance → block/safe-reference, PII → redact).
 * Execution Readiness KHÔNG đổi: executionAllowed luôn false.
 */
import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { VectorContentPolicyService } from '../vector/vector-content-policy.service';
import { ActionSafetyService } from './action-safety.service';
import {
  ActionActorContext,
  ActionType,
  RiskLevel,
} from './action-layer.types';
import { ApprovalPolicyService } from './approval-policy.service';
import {
  ApprovalDecisionService,
  ApprovalSafetySignals,
} from './approval-decision.service';
import {
  ApprovalEvaluation,
  ApprovalPolicy,
  ApprovalPreview,
  ApprovalRequest,
  ApprovalRequestInput,
} from './approval-engine.types';

@Injectable()
export class ApprovalEngineService {
  constructor(
    private readonly policies: ApprovalPolicyService,
    private readonly decision: ApprovalDecisionService,
    private readonly policy: VectorContentPolicyService,
    private readonly actionSafety: ActionSafetyService,
  ) {}

  /** Liệt kê policy duyệt (preview, read-only). */
  listPolicies(): ApprovalPolicy[] {
    return this.policies.list();
  }

  /** Đánh giá điều kiện duyệt (không duyệt thật). */
  evaluate(
    ctx: ActionActorContext,
    input: ApprovalRequestInput,
  ): ApprovalEvaluation {
    this.requireClub(ctx);
    const riskLevel = this.resolveRisk(input);
    return this.decision.evaluate(ctx, riskLevel, this.safetyOf(input));
  }

  /** Mô phỏng đầy đủ: ApprovalRequest (pending) + evaluation + preview. */
  preview(
    ctx: ActionActorContext,
    input: ApprovalRequestInput,
  ): {
    request: ApprovalRequest;
    evaluation: ApprovalEvaluation;
    preview: ApprovalPreview;
  } {
    this.requireClub(ctx);
    const riskLevel = this.resolveRisk(input);
    const approvalPolicy = this.policies.forRisk(riskLevel);
    const evaluation = this.decision.evaluate(
      ctx,
      riskLevel,
      this.safetyOf(input),
    );
    const preview = this.decision.preview(evaluation, riskLevel);

    const request: ApprovalRequest = {
      id: randomUUID(),
      clubId: ctx.clubId as string,
      requestedBy: ctx.userId ?? null,
      actionProposalId: input.actionProposalId ?? null,
      riskLevel,
      approvalPolicy,
      status: 'pending',
      requiresHumanApproval: true,
      approved: false,
      approvedBy: null,
      approvedAt: null,
      executionAllowed: false,
    };

    this.assertNotExecutable(request, preview);
    return { request, evaluation, preview };
  }

  /** Risk: ưu tiên input.riskLevel; nếu không có thì suy từ actionType. */
  private resolveRisk(input: ApprovalRequestInput): RiskLevel {
    if (input.riskLevel) return input.riskLevel;
    if (input.actionType) {
      const c = this.actionSafety.classify(input.actionType);
      if (c.isWriteOrExecute || !c.supported) return 'critical';
      if (c.type === ActionType.FUND_REVIEW_PROPOSAL) return 'high';
      return 'low';
    }
    return 'low';
  }

  /** Sanitize objective → tín hiệu an toàn (KHÔNG raw PII/finance). */
  private safetyOf(input: ApprovalRequestInput): ApprovalSafetySignals {
    const blockedReasons: string[] = [];
    const warnings: string[] = [];
    let containsPii = false;
    let containsFinanceData = false;

    const objective = input.objective ?? '';
    if (objective.trim()) {
      const res = this.policy.sanitizeForEmbedding({ content: objective });
      if (!res.allowed) {
        containsFinanceData = true;
        blockedReasons.push('finance-content-in-objective');
        warnings.push(
          'Mục tiêu có yếu tố tài chính → safe-reference; Approval Engine KHÔNG duyệt/ghi tài chính.',
        );
      } else if (res.redactedReasons.length > 0) {
        containsPii = true;
        warnings.push('PII trong mục tiêu đã được redact.');
      }
    }

    return { containsPii, containsFinanceData, blockedReasons, warnings };
  }

  private requireClub(ctx: ActionActorContext): void {
    if (!ctx.clubId) throw new Error('clubId là bắt buộc (tenant isolation)');
  }

  /** Execution Readiness Rule — KHÔNG bao giờ executable. */
  private assertNotExecutable(
    request: ApprovalRequest,
    preview: ApprovalPreview,
  ): void {
    if (
      request.executionAllowed !== false ||
      request.approved !== false ||
      request.approvedBy !== null ||
      request.approvedAt !== null ||
      request.status !== 'pending' ||
      preview.executionAllowed !== false
    ) {
      throw new Error(
        'Vi phạm Execution Readiness: approval không được executable/auto-approved.',
      );
    }
  }
}
