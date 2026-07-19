import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { HermesWorkflowService } from './hermes-workflow.service';
import { HermesEventPublisher } from './hermes-event.publisher';
import { HermesSchedulerService } from './hermes-scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiActionsModule } from '../ai-actions/ai-actions.module';
import { AidoModule } from '../aido/aido.module';

@Module({
  imports: [PrismaModule, AiActionsModule, AidoModule],
  controllers: [WorkflowsController],
  providers: [
    HermesWorkflowService,
    HermesEventPublisher,
    HermesSchedulerService,
  ],
  // Business module import WorkflowsModule để publish domain event (Epic 7).
  exports: [HermesEventPublisher],
})
export class WorkflowsModule {}
