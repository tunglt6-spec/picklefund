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

  /** Thông tin bot của CLB — hiển thị đúng bot cần /start ở giao diện.
   *  Trả bot RIÊNG của CLB nếu đã đăng ký, else bot chung của hệ thống. KHÔNG trả token. */
  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get('bot-info')
  async botInfo(@CurrentUser() user: { clubId: string }) {
    return ok(await this.svc.getClubBotInfo(user.clubId));
  }

  /** CLUB_ADMIN đăng ký bot Telegram RIÊNG của CLB (token lấy từ @BotFather).
   *  Xác thực token trước khi lưu; trả @username. Từ đây app gửi thông báo CLB qua bot này. */
  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post('club-bot')
  async setClubBot(
    @CurrentUser() user: { clubId: string },
    @Body() body: { token: string },
  ) {
    const token = body?.token?.trim();
    if (!token) throw new BadRequestException('Thiếu token bot');
    try {
      const info = await this.svc.setClubBotToken(user.clubId, token);
      return ok(
        { hasOwnBot: true, username: info.username },
        `Đã đăng ký bot riêng của CLB: @${info.username}`,
      );
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? 'Token bot không hợp lệ');
    }
  }

  /** Gỡ bot riêng của CLB → quay lại dùng bot chung của hệ thống (nếu có). */
  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post('club-bot/clear')
  async clearClubBot(@CurrentUser() user: { clubId: string }) {
    await this.svc.clearClubBotToken(user.clubId);
    return ok({ hasOwnBot: false }, 'Đã gỡ bot riêng — CLB dùng lại bot chung');
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
    const r = await this.svc.sendMessageForClub(
      user.clubId,
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
