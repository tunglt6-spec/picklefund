import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { FundPeriodsModule } from '../fund-periods/fund-periods.module';

@Module({
  imports: [FundPeriodsModule],
  providers: [MembersService],
  controllers: [MembersController],
})
export class MembersModule {}
