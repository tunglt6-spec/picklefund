import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { FinancialModule } from '../financial/financial.module';
import { HermesModule } from '../hermes/hermes.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [FinancialModule, HermesModule, AuditLogsModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
