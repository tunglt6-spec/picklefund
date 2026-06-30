/**
 * Action Audit / Decision — types (Sprint 3, Epic 3.4).
 *
 * CHỈ PREVIEW. AuditLogPreview KHÔNG ghi DB (dryRunOnly=true, executed=false).
 * SafetyDecision LUÔN actionExecutionAllowed=false / writeOperationsAllowed=false.
 */

/** Quyết định phân quyền (role/clubId từ JWT, KHÔNG tin body). */
export interface PermissionDecision {
  readonly allowed: boolean;
  readonly role: string | null;
  readonly clubId: string;
  readonly reasons: string[];
  readonly deniedReasons: string[];
}

/** Quyết định an toàn — execution/write KHÔNG bao giờ được phép ở Epic 3.4. */
export interface SafetyDecision {
  readonly allowed: boolean;
  readonly actionExecutionAllowed: false;
  readonly writeOperationsAllowed: false;
  readonly containsPii: boolean;
  readonly containsFinanceData: boolean;
  readonly redactedCount: number;
  readonly blockedCount: number;
  readonly policyVersion: string;
  readonly safetyWarnings: string[];
  readonly blockedReasons: string[];
}

/** Kết quả dry-run — chỉ mô phỏng, KHÔNG persist/mutate/send/schedule/call-write. */
export interface DryRunResult {
  readonly dryRunOnly: true;
  readonly executed: false;
  readonly wouldDo: string[];
  readonly requiredPermissions: string[];
  readonly requiredApprovals: string[];
  /** Tóm tắt thực thể bị ảnh hưởng — AN TOÀN (không ID/PII). */
  readonly affectedEntities: string[];
  readonly safetyWarnings: string[];
  readonly blockedReasons: string[];
}

/** Audit log dạng PREVIEW — KHÔNG ghi DB. */
export interface AuditLogPreview {
  readonly actionId: string;
  readonly clubId: string;
  readonly requestedBy: string | null;
  readonly actionType: string;
  readonly riskLevel: string;
  readonly permissionDecision: PermissionDecision;
  readonly safetyDecision: SafetyDecision;
  readonly dryRunOnly: true;
  readonly executed: false;
  readonly timestamp: Date;
}
