import { Module } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { HermesModule } from '../hermes/hermes.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [HermesModule, AuditLogsModule],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
