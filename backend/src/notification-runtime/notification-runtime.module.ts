import { Module } from '@nestjs/common';
import { NotificationRuntimeService } from './notification-runtime.service';
import { NotificationRuntimeController } from './notification-runtime.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [PrismaModule, EmailModule, PushModule],
  controllers: [NotificationRuntimeController],
  providers: [NotificationRuntimeService],
  // AiActionsModule import để tạo job sau khi AiAction notification được thực thi.
  exports: [NotificationRuntimeService],
})
export class NotificationRuntimeModule {}
