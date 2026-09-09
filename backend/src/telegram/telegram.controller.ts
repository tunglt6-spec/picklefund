import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TelegramService } from './telegram.service';
import { CurrentUser, Roles} from '../common/decorators';
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

  /** SUPER_ADMIN: tách 1 chat id (vd 455750167) khỏi mọi CLB + xoá pref trùng — chấm dứt
   *  việc nhiều CLB dùng chung 1 chat. Sau đó mỗi CLB tự liên kết chat riêng. */
  @Roles('SUPER_ADMIN')
  @Post('detach')
  async detach(@Body() body: { chatId: string }) {
    const chatId = body?.chatId?.trim();
    if (!chatId) throw new BadRequestException('Thiếu chatId');
    return ok(await this.svc.detachChat(chatId));
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
    const r = await this.svc.sendMessageResult(
      chatId,
      '✅ PickleFund — Kiểm tra kết nối Telegram CLB thành công. CLB sẽ nhận thông báo tại đây.',
    );
    return ok(
      { sent: r.ok, chatId, error: r.error },
      r.ok
        ? 'Đã gửi tin nhắn test tới Telegram'
        : `Chưa gửi được: ${r.error ?? 'không rõ nguyên nhân'}`,
    );
  }
}
