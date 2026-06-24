import { Module } from '@nestjs/common'
import { HermesService } from './hermes.service'
import { HermesController } from './hermes.controller'

@Module({
  controllers: [HermesController],
  providers: [HermesService],
  exports: [HermesService],
})
export class HermesModule {}
