import { Controller, Post } from '@nestjs/common';
import { AccountNotifyService } from './account-notify.service';
import { Roles } from '../common/decorators';
import { ok } from '../common/response';

@Controller('account-notify')
export class AccountNotifyController {
  constructor(private readonly svc: AccountNotifyService) {}

  /**
   * Super Admin kiểm tra kết nối Telegram — gửi 1 tin THỬ tới superTelegramChatId đã cấu hình.
   * Trả { ok, chatId, error? } để chẩn đoán (chat not found / token sai / chưa nhập ID…).
   */
  @Post('telegram-test')
  @Roles('SUPER_ADMIN')
  async telegramTest() {
    return ok(await this.svc.telegramSelfTest());
  }
}
