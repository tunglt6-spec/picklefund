/**
 * ApprovalDecisionService (Sprint 3, Epic 3.5).
 *
 * Đánh giá điều kiện duyệt + mô phỏng preview. KHÔNG duyệt/execute/persist thật.
 * executionAllowed LUÔN false. Vì engine KHÔNG lưu phê duyệt nào, mọi preview đều
 * "pending" (thiếu phê duyệt của con người) → wouldApprove=false trừ khi bị từ chối.
 */
import { Injectable } from '@nestjs/common';
import { ActionActorContext, RiskLevel } from './action-layer.types';
import { ApprovalPolicyService } from './approval-policy.service';
import { ApprovalEvaluation, ApprovalPreview } from './approval-engine.types';

/** Tín hiệu an toàn từ engine (objective đã sanitize). */
export interface ApprovalSafetySignals {
  containsPii: boolean;
  containsFinanceData: boolean;
  blockedReasons: string[];
  warnings: string[];
}

@Injectable()
export class ApprovalDecisionService {
  constructor(private readonly policies: ApprovalPolicyService) {}

  evaluate(
    ctx: ActionActorContext,
    riskLevel: RiskLevel,
    safety: ApprovalSafetySignals,
  ): ApprovalEvaluation {
    const policy = this.policies.forRisk(riskLevel);
    const warnings = [...safety.warnings];
    const blocked = [...safety.blockedReasons];

    if (!ctx.clubId) blocked.push('missing-club-scope');
    if (!ctx.role) blocked.push('missing-role');

    const roleEligible = !!ctx.role && policy.requiredRoles.includes(ctx.role);
    if (ctx.role && !roleEligible) {
      blocked.push(`role-${ctx.role}-not-an-approver`);
    }

    const allowed = blocked.length === 0 && roleEligible;
    const reason = allowed
      ? `Người yêu cầu đủ điều kiện khởi tạo duyệt (${riskLevel}); cần ${policy.requiredApprovalCount} phê duyệt của con người.`
      : `Chưa đủ điều kiện: ${blocked.join(', ') || 'không đủ vai trò duyệt'}.`;

    return {
      allowed,
      requiredRoles: [...policy.requiredRoles],
      requiredApprovals: [...policy.requiredApprovals],
      reason,
      warnings,
    };
  }

  /** Mô phỏng — KHÔNG có phê duyệt nào được thu thập (engine không persist). */
  preview(
    evaluation: ApprovalEvaluation,
    riskLevel: RiskLevel,
  ): ApprovalPreview {
    const policy = this.policies.forRisk(riskLevel);

    if (!evaluation.allowed) {
      return {
        executionAllowed: false,
        wouldApprove: false,
        wouldReject: true,
        missingRequirements: [evaluation.reason],
      };
    }

    const missingRequirements = [
      `Cần ${policy.requiredApprovalCount} phê duyệt từ: ${policy.requiredRoles.join(' / ')}.`,
      ...(policy.requiresSafetyCheck ? ['Cần Safety Check.'] : []),
      ...(policy.requiresManualConfirmation
        ? ['Cần xác nhận thủ công của con người.']
        : []),
    ];

    return {
      executionAllowed: false,
      // Engine chỉ preview — chưa thu thập phê duyệt nào → luôn còn pending.
      wouldApprove: false,
      wouldReject: false,
      missingRequirements,
    };
  }
}
