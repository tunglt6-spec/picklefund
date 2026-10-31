import { ContributionsModule } from '../contributions/contributions.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { ZaloIntakeService } from './zalo-intake.service';
import { ZaloIntakeController } from './zalo-intake.controller';
import { ZaloMemberController } from './zalo-member.controller';
import { ZaloCommandService } from './zalo-commands.service';
import { Module } from '@nestjs/common';
import { FinancialModule } from '../financial/financial.module';
import { ZaloController } from './zalo.controller';
import { ZaloService } from './zalo.service';

@Module({ imports: [FinancialModule, ContributionsModule, ExpensesModule, WorkflowsModule], controllers: [ZaloController, ZaloIntakeController, ZaloMemberController], providers: [ZaloService, ZaloIntakeService, ZaloCommandService], exports: [ZaloService] })
export class ZaloModule {}
