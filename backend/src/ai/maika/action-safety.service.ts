/**
 * ActionSafetyService (Sprint 3, Epic 3.4).
 *
 * Phân loại action type + đánh giá an toàn. execution/write KHÔNG BAO GIỜ được phép.
 * Action ghi/thực thi hoặc không hỗ trợ → block. objective qua VectorContentPolicy
 * (finance → safe-reference, PII → redact). KHÔNG tính toán tài chính.
 */
import { Injectable } from '@nestjs/common';
import { VectorContentPolicyService } from '../vector/vector-content-policy.service';
import { SafetyDecision } from './action-audit.types';
import {
  ActionType,
  ActionTypeClassification,
  BLOCKED_ACTION_TYPES,
} from './action-layer.types';

const WRITE_PREFIX_RE = /^(CREATE|UPDATE|DELETE|SEND|RUN|EXECUTE)_/;

@Injectable()
export class ActionSafetyService {
  constructor(private readonly policy: VectorContentPolicyService) {}

  /** Phân loại action type thô (deterministic). */
  classify(raw: string): ActionTypeClassification {
    const upper = (raw ?? '').trim().toUpperCase();
    const type = (Object.values(ActionType) as string[]).includes(upper)
      ? (upper as ActionType)
      : null;
    const isWriteOrExecute =
      BLOCKED_ACTION_TYPES.includes(upper) || WRITE_PREFIX_RE.test(upper);
    const supported = type !== null && !isWriteOrExecute;
    return { raw: upper, type, supported, isWriteOrExecute };
  }

  /** Đánh giá an toàn cho 1 action. Luôn actionExecution/write = false. */
  evaluate(
    classification: ActionTypeClassification,
    objective: string | undefined,
  ): SafetyDecision {
    const safetyWarnings: string[] = [];
    const blockedReasons: string[] = [];
    let containsFinanceData = false;
    let containsPii = false;
    let redactedCount = 0;
    let blockedCount = 0;

    if (classification.isWriteOrExecute) {
      blockedReasons.push('write-or-execute-action-not-allowed');
      blockedCount += 1;
    } else if (!classification.supported) {
      blockedReasons.push('unsupported-action-type');
      blockedCount += 1;
    }

    // Sanitize objective (Vector Safety Rule).
    const s = this.sanitizeObjective(objective ?? '');
    if (s.financeBlocked) {
      containsFinanceData = true;
      blockedCount += 1;
      blockedReasons.push('finance-content-in-objective');
      safetyWarnings.push(
        'Mục tiêu có yếu tố tài chính → chuyển thành safe-reference; Maika không tính toán.',
      );
    }
    if (s.pii) {
      containsPii = true;
      redactedCount += s.redactedCount;
      safetyWarnings.push('PII trong mục tiêu đã được redact.');
    }

    // Action tài chính → cảnh báo + cờ finance (risk sẽ cao ở layer).
    if (classification.type === ActionType.FUND_REVIEW_PROPOSAL) {
      containsFinanceData = true;
      safetyWarnings.push(
        'Action tài chính: CHỈ proposal/dry-run, KHÔNG tính toán, KHÔNG write. Số liệu lấy từ Finance API.',
      );
    }

    return {
      allowed: classification.supported,
      actionExecutionAllowed: false,
      writeOperationsAllowed: false,
      containsPii,
      containsFinanceData,
      redactedCount,
      blockedCount,
      policyVersion: this.policy.policyVersion,
      safetyWarnings,
      blockedReasons,
    };
  }

  /** Trả mục tiêu đã làm sạch (safe). KHÔNG bao giờ trả raw nhạy cảm. */
  sanitizeObjectiveText(objective: string | undefined): string {
    return this.sanitizeObjective(objective ?? '').safeText;
  }

  private sanitizeObjective(objective: string): {
    safeText: string;
    pii: boolean;
    financeBlocked: boolean;
    redactedCount: number;
  } {
    if (!objective.trim()) {
      return {
        safeText: '',
        pii: false,
        financeBlocked: false,
        redactedCount: 0,
      };
    }
    const res = this.policy.sanitizeForEmbedding({ content: objective });
    if (!res.allowed) {
      return {
        safeText: '[finance-reference] (đã chặn nội dung tài chính)',
        pii: false,
        financeBlocked: true,
        redactedCount: 0,
      };
    }
    return {
      safeText: res.sanitizedText,
      pii: res.redactedReasons.length > 0,
      financeBlocked: false,
      redactedCount: res.redactedReasons.length,
    };
  }
}
