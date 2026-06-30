/**
 * MaikaCore (Sprint 3, Epic 3.1) — Club Intelligence Manager.
 *
 * Orchestrate READ-ONLY pipeline: Hiểu (intent + organization context) → Lập kế hoạch
 * (read-only plan) → Đề xuất (proposal cho con người). BẤT BIẾN ép buộc:
 *  - KHÔNG action/ghi/gọi API write/mail/telegram/workflow (AI Action Safety Rule).
 *  - KHÔNG tính/suy luận/cache số liệu tài chính (Finance Isolation Rule).
 *  - proposal.requiresHumanAction = true; plan.mutates = false (assert defensive).
 * Composition trên các service Sprint 2 — KHÔNG refactor (Zero Refactor Rule).
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  API_REFERENCE_PORT,
  INTENT_ROUTER,
  MAIKA_PLANNER,
  ORGANIZATION_CONTEXT_PROVIDER,
} from './maika.interfaces';
import type {
  IApiReferencePort,
  IIntentRouter,
  IMaikaPlanner,
  IOrganizationContextProvider,
} from './maika.interfaces';
import {
  IntentClassification,
  MaikaIntent,
  MaikaPlan,
  MaikaProposal,
  MaikaResponse,
  MaikaSuggestion,
  OrganizationContext,
} from './maika.types';
import { OrganizationIntelligenceService } from './organization-intelligence.service';
import { OrganizationIntelligence } from './organization-intelligence.types';
import {
  PreviewWorkflowInput,
  WorkflowPlanningService,
} from './workflow-planning.service';
import { WorkflowTemplateService } from './workflow-template.service';
import {
  WorkflowPlan,
  WorkflowTemplateSummary,
} from './workflow-planning.types';
import { ActionLayerService } from './action-layer.service';
import {
  ActionActorContext,
  ActionProposal,
  ActionRequestInput,
} from './action-layer.types';
import { PermissionDecision, SafetyDecision } from './action-audit.types';

@Injectable()
export class MaikaCore {
  constructor(
    @Inject(INTENT_ROUTER) private readonly router: IIntentRouter,
    @Inject(ORGANIZATION_CONTEXT_PROVIDER)
    private readonly orgContext: IOrganizationContextProvider,
    @Inject(MAIKA_PLANNER) private readonly planner: IMaikaPlanner,
    @Inject(API_REFERENCE_PORT) private readonly apiRefs: IApiReferencePort,
    private readonly orgIntel: OrganizationIntelligenceService,
    private readonly workflowPlanning: WorkflowPlanningService,
    private readonly workflowTemplates: WorkflowTemplateService,
    private readonly actionLayer: ActionLayerService,
  ) {}

  /**
   * AI Action Layer (Epic 3.4) — CHỈ validate / dry-run. KHÔNG execute/persist/write.
   * Mọi proposal requiresHumanApproval=true, executionStatus='not_executed'.
   */
  validateAction(
    ctx: ActionActorContext,
    input: ActionRequestInput,
  ): {
    permissionDecision: PermissionDecision;
    safetyDecision: SafetyDecision;
  } {
    return this.actionLayer.validate(ctx, input);
  }

  dryRunAction(
    ctx: ActionActorContext,
    input: ActionRequestInput,
  ): ActionProposal {
    return this.actionLayer.dryRun(ctx, input);
  }

  /**
   * Organization Intelligence (Epic 3.2) — bức tranh vận hành tổ chức READ-ONLY.
   * Composition trên OrganizationIntelligenceService; không action/write/finance-calc.
   */
  async analyzeOrganization(
    clubId: string | null,
  ): Promise<OrganizationIntelligence> {
    return this.orgIntel.analyze(clubId);
  }

  /**
   * Workflow Planning (Epic 3.3) — chỉ PREVIEW / read-only. Maika lập kế hoạch
   * workflow để con người duyệt; KHÔNG thực thi/persist/action/write.
   */
  listWorkflowTemplates(): WorkflowTemplateSummary[] {
    return this.workflowTemplates.list();
  }

  async previewWorkflow(
    clubId: string | null,
    input: PreviewWorkflowInput,
  ): Promise<WorkflowPlan> {
    return this.workflowPlanning.preview(clubId, input);
  }

  /** Hiểu → Lập kế hoạch → Đề xuất (read-only). */
  async understand(
    clubId: string | null,
    query: string,
  ): Promise<MaikaResponse> {
    if (!clubId) throw new Error('clubId là bắt buộc (tenant isolation)');

    const classification = this.router.classify(query ?? '');
    const context = await this.orgContext.build(clubId);
    const plan = this.planner.plan(classification, context);
    const proposal = this.buildProposal(classification, context);

    // AI Action Safety — assert defensive: kế hoạch & đề xuất KHÔNG bao giờ mutate.
    this.assertReadOnly(plan, proposal);

    return {
      clubId,
      query: query ?? '',
      classification,
      context,
      plan,
      proposal,
    };
  }

  /** Chỉ bức tranh tổ chức (read-only). */
  async getContext(clubId: string | null): Promise<OrganizationContext> {
    return this.orgContext.build(clubId);
  }

  private buildProposal(
    classification: IntentClassification,
    context: OrganizationContext,
  ): MaikaProposal {
    const suggestions: MaikaSuggestion[] = [];

    if (context.totalMemories === 0) {
      suggestions.push({
        text: 'CLB chưa có tri thức nền (club memory). Nên bổ sung quy định, chính sách, ghi chú vận hành.',
        rationale: 'Maika hiểu tổ chức tốt hơn khi có tri thức nền phong phú.',
        severity: 'suggestion',
      });
    } else {
      suggestions.push({
        text: `CLB có ${context.totalMemories} tri thức nền thuộc ${context.byType.length} loại. Maika đã nắm bối cảnh tổ chức.`,
        rationale: 'Tổng hợp từ Club Memory (read-only).',
        severity: 'info',
      });
    }

    if (classification.financeRelated) {
      suggestions.push({
        text: 'Câu hỏi liên quan tài chính: hãy lấy số liệu trực tiếp từ PickleFund API (xem apiReferences).',
        rationale:
          'Finance Isolation — Maika KHÔNG tính/suy luận/cache số liệu tài chính.',
        severity: 'attention',
      });
    }

    if (classification.intent === MaikaIntent.UNKNOWN) {
      suggestions.push({
        text: 'Chưa xác định rõ ý định. Hãy nêu cụ thể: thành viên, kỳ quỹ, giải đấu, quy trình hoặc lịch sử.',
        rationale: 'Intent Router không khớp từ khoá cụ thể.',
        severity: 'info',
      });
    }

    return {
      title: `Đề xuất của Maika — ${classification.intent}`,
      summary:
        'Maika đã hiểu bối cảnh và lập kế hoạch read-only. Đây là ĐỀ XUẤT để con người quyết định — Maika không tự thực hiện hành động.',
      suggestions,
      apiReferences: this.apiRefs.referencesFor(
        classification.intent,
        classification.financeRelated,
      ),
      disclaimers: [
        'Maika chỉ Hiểu → Lập kế hoạch → Đề xuất; KHÔNG ghi dữ liệu, KHÔNG gọi API write, KHÔNG gửi mail/telegram, KHÔNG chạy workflow.',
        'Mọi số liệu tài chính phải lấy trực tiếp từ PickleFund API (Finance Engine = Source of Truth).',
      ],
      requiresHumanAction: true,
    };
  }

  /** Defensive guard cho AI Action Safety Rule. */
  private assertReadOnly(plan: MaikaPlan, proposal: MaikaProposal): void {
    if (plan.mutates !== false || plan.readOnly !== true) {
      throw new Error('Vi phạm AI Action Safety: plan phải read-only.');
    }
    if (plan.steps.some((s) => s.mutates !== false)) {
      throw new Error('Vi phạm AI Action Safety: tồn tại bước mutate.');
    }
    if (proposal.requiresHumanAction !== true) {
      throw new Error(
        'Vi phạm AI Action Safety: đề xuất phải requiresHumanAction.',
      );
    }
  }
}
