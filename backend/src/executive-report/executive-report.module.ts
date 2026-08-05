import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FundPeriodsModule } from '../fund-periods/fund-periods.module';
import { ScoringModule } from '../scoring/scoring.module';
import { MaikaModule } from '../maika/maika.module';
import { EmailModule } from '../email/email.module';
import { ExecutiveReportController } from './executive-report.controller';
import { ExecutiveReportService } from './executive-report.service';
import { ExecutiveReportScheduler } from './executive-report.scheduler';

/**
 * ExecutiveReportModule — AIDO Executive Report. Module RIÊNG (không nằm trong AidoModule)
 * để import FundPeriodsModule + ScoringModule mà không tạo circular DI
 * (FundPeriods → Workflows → Aido). Controller vẫn mount path /aido/executive-report.
 */
@Module({
  imports: [
    PrismaModule,
    FundPeriodsModule,
    ScoringModule,
    MaikaModule,
    EmailModule,
  ],
  controllers: [ExecutiveReportController],
  providers: [ExecutiveReportService, ExecutiveReportScheduler],
})
export class ExecutiveReportModule {}
