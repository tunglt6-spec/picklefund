import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { WorkflowsModule } from '../workflows/workflows.module';
import { FinancialModule } from '../financial/financial.module';

@Module({
  imports: [WorkflowsModule, FinancialModule],
  providers: [ExpensesService],
  controllers: [ExpensesController],
})
export class ExpensesModule {}
