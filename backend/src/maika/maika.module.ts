import { Module } from '@nestjs/common'
import { MaikaService } from './maika.service'
import { MaikaController } from './maika.controller'
import { MaikaScheduler } from './maika.scheduler'
import { HermesModule } from '../hermes/hermes.module'

@Module({
  imports: [HermesModule],
  controllers: [MaikaController],
  providers: [MaikaService, MaikaScheduler],
  exports: [MaikaService],
})
export class MaikaModule {}
