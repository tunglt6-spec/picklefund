import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { HermesWorkflowService } from './hermes-workflow.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiActionsModule } from '../ai-actions/ai-actions.module';

@Module({
  imports: [PrismaModule, AiActionsModule],
  controllers: [WorkflowsController],
  providers: [HermesWorkflowService],
})
export class WorkflowsModule {}
