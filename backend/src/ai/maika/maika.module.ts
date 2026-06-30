/**
 * Maika Module (Sprint 3, Epic 3.1) — Club Intelligence Manager (READ-ONLY).
 *
 * Composition trên Club Memory (SoT). KHÔNG refactor Sprint 2 (Zero Refactor).
 * KHÔNG cung cấp khả năng ghi/mutate/gọi API write. Tách biệt module legacy '/maika'.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClubMemoryModule } from '../club-memory/club-memory.module';
import { VectorContentPolicyService } from '../vector/vector-content-policy.service';
import { MaikaCore } from './maika.service';
import { MaikaController } from './maika.controller';
import { IntentRouter } from './intent-router.service';
import { OrganizationContextManager } from './organization-context.service';
import { OrganizationIntelligenceService } from './organization-intelligence.service';
import { WorkflowTemplateService } from './workflow-template.service';
import { WorkflowPlanningService } from './workflow-planning.service';
import { ActionPermissionService } from './action-permission.service';
import { ActionSafetyService } from './action-safety.service';
import { ActionDryRunService } from './action-dry-run.service';
import { ActionLayerService } from './action-layer.service';
import { ApprovalPolicyService } from './approval-policy.service';
import { ApprovalDecisionService } from './approval-decision.service';
import { ApprovalEngineService } from './approval-engine.service';
import { MaikaPlanningLayer } from './maika-planner.service';
import { PickleFundApiReferencePort } from './api-reference.port';
import {
  API_REFERENCE_PORT,
  INTENT_ROUTER,
  MAIKA_PLANNER,
  ORGANIZATION_CONTEXT_PROVIDER,
} from './maika.interfaces';

@Module({
  imports: [ConfigModule, ClubMemoryModule],
  providers: [
    // Defense-in-depth sanitizer (deterministic, KHÔNG embed/vector search).
    VectorContentPolicyService,
    OrganizationIntelligenceService,
    WorkflowTemplateService,
    WorkflowPlanningService,
    ActionPermissionService,
    ActionSafetyService,
    ActionDryRunService,
    ActionLayerService,
    ApprovalPolicyService,
    ApprovalDecisionService,
    ApprovalEngineService,
    MaikaCore,
    { provide: INTENT_ROUTER, useClass: IntentRouter },
    {
      provide: ORGANIZATION_CONTEXT_PROVIDER,
      useClass: OrganizationContextManager,
    },
    { provide: MAIKA_PLANNER, useClass: MaikaPlanningLayer },
    { provide: API_REFERENCE_PORT, useClass: PickleFundApiReferencePort },
  ],
  controllers: [MaikaController],
  exports: [MaikaCore],
})
export class MaikaModule {}
