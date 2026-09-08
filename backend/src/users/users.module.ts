import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AccountNotifyModule } from '../account-notify/account-notify.module';

@Module({
  imports: [AuditLogsModule, AccountNotifyModule],
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
