import { Module } from '@nestjs/common';
import { MaikaService } from './maika.service';
import { MaikaController } from './maika.controller';
import { MaikaScheduler } from './maika.scheduler';
import { HermesModule } from '../hermes/hermes.module';
import { AidoModule } from '../aido/aido.module';
import { FundPeriodsModule } from '../fund-periods/fund-periods.module';

@Module({
  imports: [HermesModule, AidoModule, FundPeriodsModule],
  controllers: [MaikaController],
  providers: [MaikaService, MaikaScheduler],
  exports: [MaikaService],
})
export class MaikaModule {}
