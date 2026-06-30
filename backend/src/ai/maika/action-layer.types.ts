/**
 * AI Action Layer — types (Sprint 3, Epic 3.4).
 *
 * CHỈ proposal / dry-run / validate. KHÔNG execute, KHÔNG persist, KHÔNG write.
 * Mọi ActionProposal: readOnly=true, mutates=false, requiresHumanApproval=true,
 * approvalStatus='required', approvedBy=null, approvedAt=null,
 * executionStatus='not_executed'. Không action nào tự approved.
 */
import {
  AuditLogPreview,
  DryRunResult,
  PermissionDecision,
  SafetyDecision,
} from './action-audit.types';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** Action type CHỈ ở trạng thái proposal/dry-run (Epic 3.4). */
export enum ActionType {
  MEMBER_REVIEW_PROPOSAL = 'MEMBER_REVIEW_PROPOSAL',
  SEASON_PREPARATION_PROPOSAL = 'SEASON_PREPARATION_PROPOSAL',
  FUND_REVIEW_PROPOSAL = 'FUND_REVIEW_PROPOSAL',
  DATA_QUALITY_PROPOSAL = 'DATA_QUALITY_PROPOSAL',
  TOURNAMENT_REVIEW_PROPOSAL = 'TOURNAMENT_REVIEW_PROPOSAL',
}

/** Action type GHI/THỰC THI — BỊ CHẶN tuyệt đối ở Epic 3.4. */
export const BLOCKED_ACTION_TYPES: readonly string[] = [
  'CREATE_MEMBER',
  'UPDATE_MEMBER',
  'DELETE_MEMBER',
  'CREATE_RECEIPT',
  'CREATE_EXPENSE',
  'SEND_EMAIL',
  'SEND_TELEGRAM',
  'CREATE_NOTIFICATION',
  'RUN_WORKFLOW',
  'EXECUTE_ACTION',
];

/** Đầu vào yêu cầu action (objective sẽ được sanitize). */
export interface ActionRequestInput {
  actionType: string;
  objective?: string;
  sourcePlanId?: string;
}

/** Ngữ cảnh xác thực — LẤY TỪ JWT (không từ body). */
export interface ActionActorContext {
  clubId: string | null;
  userId: string | null;
  role: string | null;
}

/** Phân loại action type thô từ input. */
export interface ActionTypeClassification {
  readonly raw: string;
  readonly type: ActionType | null;
  readonly supported: boolean;
  readonly isWriteOrExecute: boolean;
}

export interface ActionProposal {
  readonly id: string;
  readonly clubId: string;
  readonly requestedBy: string | null;
  readonly actionType: string;
  readonly title: string;
  readonly description: string;
  readonly source: string;
  readonly riskLevel: RiskLevel;
  readonly status: 'proposed';
  readonly readOnly: true;
  readonly mutates: false;
  readonly requiresHumanApproval: true;
  readonly approvalStatus: 'required';
  readonly approvedBy: null;
  readonly approvedAt: null;
  readonly executionStatus: 'not_executed';
  readonly permissionDecision: PermissionDecision;
  readonly safetyDecision: SafetyDecision;
  readonly dryRun: DryRunResult;
  readonly auditLogPreview: AuditLogPreview;
  readonly generatedAt: Date;
}
