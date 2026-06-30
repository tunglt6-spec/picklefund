/**
 * WorkflowPlanningService (Sprint 3, Epic 3.3) — PREVIEW / READ-ONLY.
 *
 * Chuyển nhu cầu vận hành → WorkflowPlan để CON NGƯỜI duyệt. KHÔNG thực thi, KHÔNG
 * persist, KHÔNG action/write/notification/automation/job-queue. Tách hoàn toàn khỏi
 * Workflow Execution / Action Layer / Finance Engine.
 *
 * An toàn: user input (objective) đi qua VectorContentPolicyService —
 * finance/money → safe-reference (không raw, không tính số); PII → redact.
 * Bối cảnh & safety counts lấy từ OrganizationIntelligenceService (Epic 3.2, đã sạch).
 */
import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { VectorContentPolicyService } from '../vector/vector-content-policy.service';
import { OrganizationIntelligenceService } from './organization-intelligence.service';
import { WorkflowTemplateService } from './workflow-template.service';
import {
  WorkflowPlan,
  WorkflowPlanStep,
  WorkflowTemplateId,
} from './workflow-planning.types';

export interface PreviewWorkflowInput {
  templateId?: WorkflowTemplateId;
  /** Mô tả nhu cầu (tự do) — sẽ được sanitize trước khi vào plan. */
  objective?: string;
}

const SAFE_FINANCE_OBJECTIVE =
  '[finance-reference] Mục tiêu liên quan tài chính — xem số liệu qua Finance API (Maika không tính toán).';

@Injectable()
export class WorkflowPlanningService {
  constructor(
    private readonly policy: VectorContentPolicyService,
    private readonly orgIntel: OrganizationIntelligenceService,
    private readonly templates: WorkflowTemplateService,
  ) {}

  /** Tạo WorkflowPlan PREVIEW (read-only). clubId scope tenant; thiếu dữ liệu → step. */
  async preview(
    clubId: string | null,
    input: PreviewWorkflowInput,
  ): Promise<WorkflowPlan> {
    if (!clubId) throw new Error('clubId là bắt buộc (tenant isolation)');

    // 1) Sanitize objective (Vector Safety Rule).
    const sanitized = this.sanitizeObjective(input.objective ?? '');

    // 2) Chọn template (deterministic).
    const templateId =
      input.templateId && this.templates.getById(input.templateId)
        ? input.templateId
        : this.templates.resolveByKeyword(sanitized.safeText);
    const template = this.templates.getById(templateId)!;

    // 3) Bối cảnh tổ chức (đã sạch) → safety counts + tín hiệu thiếu dữ liệu.
    const intel = await this.orgIntel.analyze(clubId);

    // 4) Dựng steps từ template (gán id/order).
    const steps: WorkflowPlanStep[] = template.steps.map((s, i) => ({
      id: randomUUID(),
      order: i + 1,
      type: s.type,
      title: s.title,
      description: s.description,
      requiredData: [...s.requiredData],
      suggestedEndpoint: s.suggestedEndpoint,
      mutates: false,
      requiresHumanApproval: s.requiresHumanApproval,
    }));

    // 5) Thiếu dữ liệu → thêm human_review step (KHÔNG throw).
    const missingData = intel.dataQualitySignals.some(
      (sig) => sig.code === 'DQ_NO_CLUB_MEMORY',
    );
    if (missingData) {
      steps.push({
        id: randomUUID(),
        order: steps.length + 1,
        type: 'human_review',
        title: 'Bổ sung dữ liệu còn thiếu',
        description:
          'Thiếu tri thức nền (Club Memory). Đề xuất con người bổ sung trước khi tiếp tục.',
        requiredData: ['club-memory'],
        mutates: false,
        requiresHumanApproval: true,
      });
    }

    // 6) Nếu objective bị block finance → đánh dấu 1 step propose là blocked-safe.
    if (sanitized.financeBlocked) {
      steps.push({
        id: randomUUID(),
        order: steps.length + 1,
        type: 'propose',
        title: 'Tham chiếu Finance API (mục tiêu liên quan tài chính)',
        description:
          'Mục tiêu có yếu tố tài chính — chỉ đề xuất ĐỌC Finance API. Maika không tính/kết luận số liệu.',
        requiredData: ['fund-period-summary'],
        suggestedEndpoint: '/fund-periods/:id/summary',
        mutates: false,
        requiresHumanApproval: true,
        blockedReason: 'finance-content-in-objective',
      });
    }

    const plan: WorkflowPlan = {
      id: randomUUID(),
      clubId,
      intent: templateId,
      title: template.title,
      description: this.composeDescription(template.description, sanitized),
      status: 'preview',
      readOnly: true,
      mutates: false,
      requiresHumanApproval: true,
      steps,
      safety: {
        containsPii: intel.safety.containsPii || sanitized.pii,
        containsFinanceData:
          intel.safety.containsFinanceData || sanitized.financeBlocked,
        redactedCount: intel.safety.redactedCount + sanitized.redactedCount,
        blockedCount:
          intel.safety.blockedCount + (sanitized.financeBlocked ? 1 : 0),
        policyVersion: intel.safety.policyVersion,
        actionExecutionAllowed: false,
        writeOperationsAllowed: false,
      },
      suggestedReadActions: [...template.readActions],
      generatedAt: new Date(),
    };

    this.assertPreviewSafe(plan);
    return plan;
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
      // finance/money → KHÔNG raw, thay bằng safe-reference.
      return {
        safeText: SAFE_FINANCE_OBJECTIVE,
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

  private composeDescription(
    base: string,
    sanitized: { safeText: string },
  ): string {
    if (!sanitized.safeText) return base;
    return `${base} — Mục tiêu (đã làm sạch): ${sanitized.safeText}`;
  }

  /** Defensive guard — Epic 3.3 chỉ preview/read-only. */
  private assertPreviewSafe(plan: WorkflowPlan): void {
    if (
      plan.status !== 'preview' ||
      plan.readOnly !== true ||
      plan.mutates !== false ||
      plan.requiresHumanApproval !== true
    ) {
      throw new Error(
        'Vi phạm AI Action Safety: workflow plan phải preview/read-only.',
      );
    }
    if (plan.steps.some((s) => s.mutates !== false)) {
      throw new Error('Vi phạm AI Action Safety: tồn tại step mutate.');
    }
    if (
      plan.safety.actionExecutionAllowed !== false ||
      plan.safety.writeOperationsAllowed !== false
    ) {
      throw new Error(
        'Vi phạm AI Action Safety: execution/write không được phép.',
      );
    }
  }
}
