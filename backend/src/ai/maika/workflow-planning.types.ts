/**
 * Workflow Planning — types (Sprint 3, Epic 3.3).
 *
 * CHỈ PREVIEW / READ-ONLY. Maika lập kế hoạch workflow để con người duyệt —
 * KHÔNG thực thi, KHÔNG persist, KHÔNG action/write/notification/automation.
 * Mọi step mutates=false; plan readOnly=true, requiresHumanApproval=true.
 * Tách hoàn toàn khỏi Workflow Execution / Action Layer / Notification / Finance Engine.
 */
import { SuggestedReadAction } from './organization-intelligence.types';

/** Nhóm workflow template read-only. */
export enum WorkflowTemplateId {
  MEMBER_ENGAGEMENT_REVIEW = 'MEMBER_ENGAGEMENT_REVIEW',
  FUND_HEALTH_REVIEW = 'FUND_HEALTH_REVIEW',
  SEASON_PREPARATION = 'SEASON_PREPARATION',
  TOURNAMENT_REVIEW = 'TOURNAMENT_REVIEW',
  DATA_QUALITY_REVIEW = 'DATA_QUALITY_REVIEW',
}

export type WorkflowStepType = 'read' | 'analyze' | 'propose' | 'human_review';

export interface WorkflowPlanStep {
  readonly id: string;
  readonly order: number;
  readonly type: WorkflowStepType;
  readonly title: string;
  readonly description: string;
  readonly requiredData: string[];
  /** Endpoint ĐỌC gợi ý (GET) — không bao giờ là write. */
  readonly suggestedEndpoint?: string;
  readonly mutates: false;
  readonly requiresHumanApproval: boolean;
  /** Lý do step bị chặn (vd: finance/PII trong input) — KHÔNG chứa raw nhạy cảm. */
  readonly blockedReason?: string;
}

export interface WorkflowPlanSafety {
  readonly containsPii: boolean;
  readonly containsFinanceData: boolean;
  readonly redactedCount: number;
  readonly blockedCount: number;
  readonly policyVersion: string;
  /** Bất biến Epic 3.3: KHÔNG thực thi action, KHÔNG ghi. */
  readonly actionExecutionAllowed: false;
  readonly writeOperationsAllowed: false;
}

export interface WorkflowPlan {
  readonly id: string;
  readonly clubId: string;
  readonly intent: WorkflowTemplateId;
  readonly title: string;
  readonly description: string;
  readonly status: 'preview';
  readonly readOnly: true;
  readonly mutates: false;
  readonly requiresHumanApproval: true;
  readonly steps: WorkflowPlanStep[];
  readonly safety: WorkflowPlanSafety;
  readonly suggestedReadActions: SuggestedReadAction[];
  readonly generatedAt: Date;
}

export interface WorkflowTemplateSummary {
  readonly id: WorkflowTemplateId;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly stepCount: number;
  readonly readOnly: true;
}
