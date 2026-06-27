import { Module } from '@nestjs/common';
import { FundPeriodsService } from './fund-periods.service';
import { FundPeriodsController } from './fund-periods.controller';
import { FinancialModule } from '../financial/financial.module';

@Module({
  imports: [FinancialModule],
  providers: [FundPeriodsService],
  controllers: [FundPeriodsController],
})
export class FundPeriodsModule {}
