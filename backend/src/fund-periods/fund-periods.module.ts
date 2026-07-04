import { Module } from '@nestjs/common';
import { FundPeriodsService } from './fund-periods.service';
import { FundPeriodsController } from './fund-periods.controller';
import { FinancialModule } from '../financial/financial.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [FinancialModule, WorkflowsModule],
  providers: [FundPeriodsService],
  controllers: [FundPeriodsController],
  exports: [FundPeriodsService],
})
export class FundPeriodsModule {}
