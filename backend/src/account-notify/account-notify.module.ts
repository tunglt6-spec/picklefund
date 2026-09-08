import { Module } from '@nestjs/common';
import { AccountNotifyService } from './account-notify.service';
import { EmailModule } from '../email/email.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
  imports: [EmailModule, SystemSettingsModule],
  providers: [AccountNotifyService],
  exports: [AccountNotifyService],
})
export class AccountNotifyModule {}
