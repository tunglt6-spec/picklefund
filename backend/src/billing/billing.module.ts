import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BillingScheduler } from './billing.scheduler';
import { BillingCheckoutService } from './billing-checkout.service';
import { ProviderFactory } from './provider/provider.factory';
import { HermesModule } from '../hermes/hermes.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [HermesModule, AuditLogsModule],
  controllers: [BillingController],
  providers: [BillingService, BillingScheduler, BillingCheckoutService, ProviderFactory],
  exports: [BillingService],
})
export class BillingModule {}
