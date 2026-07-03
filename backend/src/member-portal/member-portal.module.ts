import { Module } from '@nestjs/common';
import { MemberPortalController } from './member-portal.controller';
import { MemberPortalService } from './member-portal.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FinancialModule } from '../financial/financial.module';

@Module({
  imports: [PrismaModule, FinancialModule],
  controllers: [MemberPortalController],
  providers: [MemberPortalService],
})
export class MemberPortalModule {}
