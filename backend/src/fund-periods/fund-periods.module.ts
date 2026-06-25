import { Module } from '@nestjs/common';
import { FundPeriodsService } from './fund-periods.service';
import { FundPeriodsController } from './fund-periods.controller';

@Module({
  providers: [FundPeriodsService],
  controllers: [FundPeriodsController],
})
export class FundPeriodsModule {}
