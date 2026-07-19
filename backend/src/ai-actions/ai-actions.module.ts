import { Module } from '@nestjs/common';
import { AiActionsController } from './ai-actions.controller';
import { AiActionsService } from './ai-actions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MaikaModule } from '../ai/maika/maika.module';
import { NotificationRuntimeModule } from '../notification-runtime/notification-runtime.module';
import { ACTION_EXECUTOR } from './action-executor';
import { HermesActionExecutor } from './hermes-action-executor';
import { AidoModule } from '../aido/aido.module';

@Module({
  imports: [PrismaModule, MaikaModule, NotificationRuntimeModule, AidoModule],
  controllers: [AiActionsController],
  providers: [
    AiActionsService,
    // Executor THẬT (Mít Đặc): DEBT_ESCALATION → fan-out IN_APP nhắc nợ; loại khác no-op.
    { provide: ACTION_EXECUTOR, useClass: HermesActionExecutor },
  ],
  exports: [AiActionsService],
})
export class AiActionsModule {}
