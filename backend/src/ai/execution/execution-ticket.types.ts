/**
 * Execution Ticket Framework — types (Sprint 4, Epic 4.1).
 *
 * CHỈ mô hình hoá Execution Ticket theo ADR-01 / ADR-02 / ADP-01. KHÔNG Execution
 * Engine, KHÔNG execute/dispatch/run, KHÔNG write/DB/connector/queue/notification/
 * finance/automation. Mọi ticket: readOnly=true, executionAllowed=false.
 * Governance: tuân thủ GOV-01 (không định nghĩa lại rule ở đây).
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** Trạng thái ticket — EXECUTING/SUCCEEDED/FAILED/ROLLED_BACK là PLACEHOLDER (chưa chạy). */
export enum ExecutionTicketStatus {
  DRAFT = 'DRAFT',
  VALIDATED = 'VALIDATED',
  READY = 'READY',
  EXECUTING = 'EXECUTING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
  CANCELLED = 'CANCELLED',
}

/** Bản chụp quyết định phân quyền (capture tại thời điểm tạo ticket). */
export interface PermissionSnapshot {
  readonly allowed: boolean;
  readonly role: string | null;
  readonly clubId: string;
  readonly reasons: string[];
  readonly deniedReasons: string[];
}

/** Bản chụp phê duyệt — framework stage: chưa duyệt (approved=false). */
export interface ApprovalSnapshot {
  readonly approvalId: string | null;
  readonly requiresHumanApproval: true;
  readonly approved: false;
  readonly approvedBy: null;
  readonly approvedAt: null;
}

/** Bản chụp ngữ cảnh action (KHÔNG raw PII/finance — đã sanitize ở tầng trên). */
export interface ExecutionSnapshot {
  readonly actionType: string;
  readonly source: string;
  readonly capturedAt: Date;
  readonly dryRunReference: string | null;
}

/** Metadata ticket — framework-only. */
export interface ExecutionMetadata {
  readonly mode: 'framework-only';
  readonly policyVersion: string;
  readonly notes: string[];
  /** Cờ phục vụ Guard — đều phải false ở Epic 4.1. */
  readonly writeOperation: false;
  readonly autoExecution: false;
  readonly autoApproval: false;
}

/** Đầu vào để build ticket (capture context, KHÔNG execute). */
export interface ExecutionContextInput {
  actionProposalId: string;
  clubId: string;
  createdBy: string | null;
  riskLevel: RiskLevel;
  permissionSnapshot: PermissionSnapshot;
  approvalSnapshot: ApprovalSnapshot;
  executionSnapshot: ExecutionSnapshot;
  idempotencyKey?: string;
  notes?: string[];
}

/** Execution Ticket — bất biến tại Epic 4.1: readOnly=true, executionAllowed=false. */
export interface ExecutionTicket {
  readonly ticketId: string;
  readonly actionProposalId: string;
  readonly clubId: string;
  readonly createdBy: string | null;
  readonly createdAt: Date;
  readonly status: ExecutionTicketStatus;
  readonly idempotencyKey: string;
  readonly snapshot: ExecutionSnapshot;
  readonly permissionSnapshot: PermissionSnapshot;
  readonly approvalSnapshot: ApprovalSnapshot;
  readonly riskLevel: RiskLevel;
  readonly metadata: ExecutionMetadata;
  readonly readOnly: true;
  readonly executionAllowed: false;
}

/** Kết quả execution — PLACEHOLDER (Epic 4.1 không execute). */
export interface ExecutionResult {
  readonly executed: false;
  readonly outcome: 'not_executed';
  readonly detail: string;
}

/** Kết quả validate ticket. */
export interface TicketValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}
