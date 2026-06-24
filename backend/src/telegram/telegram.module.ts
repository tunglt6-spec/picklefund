import { Module } from '@nestjs/common'
import { TelegramService } from './telegram.service'
import { TelegramController } from './telegram.controller'
import { MaikaModule } from '../maika/maika.module'
import { LisaModule } from '../lisa/lisa.module'

@Module({
  imports: [MaikaModule, LisaModule],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
