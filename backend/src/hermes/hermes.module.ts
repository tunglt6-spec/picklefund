import { Module } from '@nestjs/common'
import { HermesService } from './hermes.service'
import { HermesController } from './hermes.controller'
import { EmailModule } from '../email/email.module'

@Module({
  imports: [EmailModule],
  controllers: [HermesController],
  providers: [HermesService],
  exports: [HermesService],
})
export class HermesModule {}
