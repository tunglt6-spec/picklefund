import { Module } from '@nestjs/common';
import { MemberPortalController } from './member-portal.controller';
import { MemberPortalService } from './member-portal.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FinancialModule } from '../financial/financial.module';
import { HermesModule } from '../hermes/hermes.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [PrismaModule, FinancialModule, HermesModule, AuditLogsModule],
  controllers: [MemberPortalController],
  providers: [MemberPortalService],
})
export class MemberPortalModule {}
