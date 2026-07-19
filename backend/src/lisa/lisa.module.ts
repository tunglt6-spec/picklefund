import { Module } from '@nestjs/common';
import { LisaService } from './lisa.service';
import { LisaController } from './lisa.controller';
import { LisaScheduler } from './lisa.scheduler';
import { HermesModule } from '../hermes/hermes.module';
import { AidoModule } from '../aido/aido.module';

@Module({
  imports: [HermesModule, AidoModule],
  controllers: [LisaController],
  providers: [LisaService, LisaScheduler],
  exports: [LisaService],
})
export class LisaModule {}
