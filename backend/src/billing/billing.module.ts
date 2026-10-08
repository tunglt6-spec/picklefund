import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BillingScheduler } from './billing.scheduler';
import { BillingCheckoutService } from './billing-checkout.service';
import { BillingManualService } from './billing-manual.service';
import { PlanRenewalReminderService } from './plan-renewal-reminder.service';
import { EmailModule } from '../email/email.module';
import { ProviderFactory } from './provider/provider.factory';
import { HermesModule } from '../hermes/hermes.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [HermesModule, AuditLogsModule, ReferralsModule, EmailModule],
  controllers: [BillingController],
  providers: [BillingService, BillingScheduler, BillingCheckoutService, BillingManualService, PlanRenewalReminderService, ProviderFactory],
  exports: [BillingService],
})
export class BillingModule {}
