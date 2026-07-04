import { Module } from '@nestjs/common';
import { AiActionsController } from './ai-actions.controller';
import { AiActionsService } from './ai-actions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MaikaModule } from '../ai/maika/maika.module';
import { NotificationRuntimeModule } from '../notification-runtime/notification-runtime.module';
import { ACTION_EXECUTOR, NoOpExecutor } from './action-executor';

@Module({
  imports: [PrismaModule, MaikaModule, NotificationRuntimeModule],
  controllers: [AiActionsController],
  providers: [
    AiActionsService,
    { provide: ACTION_EXECUTOR, useClass: NoOpExecutor },
  ],
  exports: [AiActionsService],
})
export class AiActionsModule {}
