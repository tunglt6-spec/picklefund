import { Module } from '@nestjs/common';
import { HermesService } from './hermes.service';
import { HermesController } from './hermes.controller';
import { EmailModule } from '../email/email.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [EmailModule, PushModule],
  controllers: [HermesController],
  providers: [HermesService],
  exports: [HermesService],
})
export class HermesModule {}
