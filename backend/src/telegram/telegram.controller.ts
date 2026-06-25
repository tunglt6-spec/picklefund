import { Controller, Post, Get, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TelegramService } from './telegram.service';
import { CurrentUser, Roles } from '../common/decorators';
import { ok } from '../common/response';

@ApiTags('Telegram Bot')
@ApiBearerAuth()
@Controller('telegram')
export class TelegramController {
  constructor(private svc: TelegramService) {}

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get('link')
  async getLink(@CurrentUser() user: any) {
    const chatId = await this.svc.getLinkedChatId(user.clubId);
    return ok({ chatId });
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post('link')
  async linkChat(@CurrentUser() user: any, @Body() body: { chatId: string }) {
    await this.svc.linkClubChat(user.clubId, body.chatId);
    return ok({ linked: true, chatId: body.chatId });
  }

  @Roles('SUPER_ADMIN')
  @Post('send')
  async sendMessage(@Body() body: { chatId: string; text: string }) {
    const sent = await this.svc.sendMessage(body.chatId, body.text);
    return ok({ sent });
  }

  // CLUB_ADMIN: send test message to the club's linked Telegram chat
  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post('test')
  async testBot(@CurrentUser() user: { clubId: string }) {
    const chatId = await this.svc.getLinkedChatId(user.clubId);
    if (!chatId)
      return ok(
        { sent: false, chatId: null },
        'CLB chưa link Telegram Bot — dùng /myid để lấy chat ID',
      );
    const sent = await this.svc.sendMessage(
      chatId,
      '✅ PickleFund Bot đang hoạt động bình thường.\n\nNếu bạn nhận được tin nhắn này, kết nối Telegram Bot đã thành công!',
    );
    return ok(
      { sent, chatId },
      sent
        ? 'Đã gửi tin nhắn test tới Telegram'
        : 'Gửi thất bại — kiểm tra TELEGRAM_BOT_TOKEN',
    );
  }
}
