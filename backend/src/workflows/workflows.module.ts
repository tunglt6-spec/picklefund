import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { HermesWorkflowService } from './hermes-workflow.service';
import { HermesEventPublisher } from './hermes-event.publisher';
import { PrismaModule } from '../prisma/prisma.module';
import { AiActionsModule } from '../ai-actions/ai-actions.module';

@Module({
  imports: [PrismaModule, AiActionsModule],
  controllers: [WorkflowsController],
  providers: [HermesWorkflowService, HermesEventPublisher],
  // Business module import WorkflowsModule để publish domain event (Epic 7).
  exports: [HermesEventPublisher],
})
export class WorkflowsModule {}
