import { Module } from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import { ContributionsController } from './contributions.controller';
import { WorkflowsModule } from '../workflows/workflows.module';
import { FinancialModule } from '../financial/financial.module';

@Module({
  imports: [WorkflowsModule, FinancialModule],
  providers: [ContributionsService],
  controllers: [ContributionsController],
})
export class ContributionsModule {}
