/**
 * Human Approval Engine — types (Sprint 3, Epic 3.5) — Governance cuối cùng.
 *
 * CHỈ evaluate / preview / explain. KHÔNG approve/reject thật, KHÔNG execute, KHÔNG
 * persist, KHÔNG write/DB/email/telegram/notification/workflow. executionAllowed LUÔN
 * false; requiresHumanApproval LUÔN true; approved LUÔN false; approvedBy/At LUÔN null.
 */
import { RiskLevel } from './action-layer.types';

/** Policy duyệt theo risk (deterministic, preview). */
export interface ApprovalPolicy {
  readonly riskLevel: RiskLevel;
  readonly requiredApprovalCount: number;
  readonly requiredRoles: string[];
  readonly requiredApprovals: string[];
  readonly requiresSafetyCheck: boolean;
  readonly requiresManualConfirmation: boolean;
  readonly description: string;
}

/** Yêu cầu duyệt — KHÔNG persist; trạng thái luôn pending/chưa duyệt. */
export interface ApprovalRequest {
  readonly id: string;
  readonly clubId: string;
  readonly requestedBy: string | null;
  readonly actionProposalId: string | null;
  readonly riskLevel: RiskLevel;
  readonly approvalPolicy: ApprovalPolicy;
  readonly status: 'pending';
  readonly requiresHumanApproval: true;
  readonly approved: false;
  readonly approvedBy: null;
  readonly approvedAt: null;
  readonly executionAllowed: false;
}

/** Kết quả đánh giá điều kiện duyệt (không phải duyệt thật). */
export interface ApprovalEvaluation {
  readonly allowed: boolean;
  readonly requiredRoles: string[];
  readonly requiredApprovals: string[];
  readonly reason: string;
  readonly warnings: string[];
}

/** Mô phỏng kết quả duyệt — executionAllowed LUÔN false. */
export interface ApprovalPreview {
  readonly executionAllowed: false;
  readonly wouldApprove: boolean;
  readonly wouldReject: boolean;
  readonly missingRequirements: string[];
}

/** Đầu vào yêu cầu đánh giá/preview (objective sẽ được sanitize). */
export interface ApprovalRequestInput {
  actionProposalId?: string;
  actionType?: string;
  riskLevel?: RiskLevel;
  objective?: string;
}
