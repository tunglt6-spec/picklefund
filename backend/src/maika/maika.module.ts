import { Module } from '@nestjs/common';
import { MaikaService } from './maika.service';
import { MaikaController } from './maika.controller';
import { MaikaScheduler } from './maika.scheduler';
import { HermesModule } from '../hermes/hermes.module';
import { FundPeriodsModule } from '../fund-periods/fund-periods.module';

@Module({
  // FundPeriodsModule: Finance Engine (nguồn chân lý tài chính). Maika ĐỌC số liệu từ đây,
  // KHÔNG tự tính (finance isolation) — nhất quán với ai/maika/OperationalAlertsService.
  imports: [HermesModule, FundPeriodsModule],
  controllers: [MaikaController],
  providers: [MaikaService, MaikaScheduler],
  exports: [MaikaService],
})
export class MaikaModule {}
