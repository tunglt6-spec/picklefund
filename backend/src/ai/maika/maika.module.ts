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
