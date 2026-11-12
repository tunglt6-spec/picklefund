import { Body, Controller, Get, Headers, HttpCode, Param, Post, Req, Res, StreamableFile } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { IsBoolean, IsOptional, IsString, MaxLength, Matches, IsInt, IsIn } from 'class-validator';
import { CurrentUser, Public, Roles } from '../common/decorators';
import type { JwtUser } from '../common/decorators';
import { ok } from '../common/response';
import { ZaloService } from './zalo.service';

class BotDto {
  @IsString() @MaxLength(512) token: string;
  /** Webhook do nền tảng khác (vd. AI-BOT) quản lý — PickleFund không đăng ký webhook. */
  @IsOptional() @IsBoolean() external?: boolean;
  /** Vẫn chiếm webhook dù bot đang thuộc nền tảng khác. */
  @IsOptional() @IsBoolean() force?: boolean;
}
class HubLinkDto { @IsString() @MaxLength(40) code: string; }
class ExternalDto { @IsBoolean() enabled: boolean; }
class GroupCheckDto { @IsOptional() @IsString() @MaxLength(150) chatId?: string; }
class GroupDto { @IsString() @MaxLength(150) chatId: string; @IsOptional() @IsString() @MaxLength(150) chatName?: string; }
class PreferencesDto {
  @IsOptional() @IsBoolean() intakeEnabled?: boolean;
  @IsOptional() @IsBoolean() commandsEnabled?: boolean;
  @IsOptional() @IsBoolean() paymentReminders?: boolean;
  @IsOptional() @IsBoolean() resultImages?: boolean;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsBoolean() financialChanges?: boolean;
  @IsOptional() @IsBoolean() announcements?: boolean;
  @IsOptional() @IsBoolean() dailyReport?: boolean;
  @IsOptional() @IsBoolean() weeklyReport?: boolean;
  @IsOptional() @IsInt() @IsIn([0,1,2,3,4,5,6]) reportWeekday?: number;
  @IsOptional() @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) reportTime?: string;
  @IsOptional() @IsInt() @IsIn([1,5,15,30,60]) financialIntervalMinutes?: number;
}

@Controller('zalo')
export class ZaloController {
  constructor(private readonly zalo: ZaloService) {}

  @Get('status') @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async status(@CurrentUser() user: JwtUser) { return ok(await this.zalo.status(this.zalo.club(user.clubId))); }

  @Post('bot') @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async bot(@CurrentUser() user: JwtUser, @Body() body: BotDto) {
    return ok(await this.zalo.register(this.zalo.club(user.clubId), body.token, { external: body.external, force: body.force }));
  }

  /** Bật/tắt chế độ "webhook do nền tảng khác quản lý" (không đăng ký/xóa webhook của bot). */
  @Post('external-webhook') @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async externalWebhook(@CurrentUser() user: JwtUser, @Body() body: ExternalDto) { return ok(await this.zalo.setExternalWebhook(this.zalo.club(user.clubId), body.enabled)); }

  /** Chẩn đoán: webhook của bot đang trỏ tới host nào (PickleFund hay nền tảng khác). Chỉ đọc. */
  @Get('webhook-info') @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async webhookInfo(@CurrentUser() user: JwtUser) { return ok(await this.zalo.webhookInfo(this.zalo.club(user.clubId))); }

  @Post('webhook-verify') @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async verifyWebhook(@CurrentUser() user: JwtUser) { return ok(await this.zalo.reverifyWebhook(this.zalo.club(user.clubId))); }

  /** Đặt nhóm nhận thông báo bằng mã nhóm — chỉ khi webhook do nền tảng khác quản lý (không dùng được /ketnoi). */
  @Post('group') @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async group(@CurrentUser() user: JwtUser, @Body() body: GroupDto) { return ok(await this.zalo.setGroup(this.zalo.club(user.clubId), body.chatId, body.chatName)); }

  /** Chẩn đoán: bot có hoạt động được trong nhóm không (sendChatAction typing; không gửi tin). */
  @Post('group-check') @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async groupCheck(@CurrentUser() user: JwtUser, @Body() body: GroupCheckDto) { return ok(await this.zalo.checkGroup(this.zalo.club(user.clubId), body.chatId)); }

  /** Liên kết bot qua AI-BOT bằng mã PF-XXXX-XXXX (Zalo Hub). */
  @Post('hub/link') @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async hubLink(@CurrentUser() user: JwtUser, @Body() body: HubLinkDto) { return ok(await this.zalo.hubLink(this.zalo.club(user.clubId), body.code)); }

  @Post('hub/unlink') @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async hubUnlink(@CurrentUser() user: JwtUser) { return ok(await this.zalo.hubUnlink(this.zalo.club(user.clubId))); }

  @Get('hub/status') @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async hubStatus(@CurrentUser() user: JwtUser) { return ok(await this.zalo.hubStatus(this.zalo.club(user.clubId))); }

  /** Nhóm AI-BOT đã nhận diện cho liên kết (chọn nhóm nhận thông báo). */
  @Get('hub/groups') @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async hubGroups(@CurrentUser() user: JwtUser) { return ok(await this.zalo.hubGroups(this.zalo.club(user.clubId))); }

  /** AI-BOT chuyển lệnh PickleFund tới đây (có chữ ký HMAC trên thân gốc). Trả {handled}. */
  @Public() @Post('hub/:clubId') @HttpCode(200)
  async hubEvent(@Param('clubId') clubId: string, @Headers('x-hub-link-id') linkId: string, @Headers('x-hub-timestamp') ts: string,
    @Headers('x-hub-signature') sig: string, @Req() req: RawBodyRequest<Request>, @Body() body: unknown) {
    return this.zalo.hubEvent(this.zalo.club(clubId), { linkId, ts, sig }, req.rawBody, body);
  }

  @Post('pair') @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async pair(@CurrentUser() user: JwtUser) { return ok(await this.zalo.pair(this.zalo.club(user.clubId))); }

  @Post('confirm-group') @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async confirm(@CurrentUser() user: JwtUser) { return ok(await this.zalo.confirm(this.zalo.club(user.clubId))); }

  @Post('preferences') @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async preferences(@CurrentUser() user: JwtUser, @Body() body: PreferencesDto) {
    return ok(await this.zalo.preferences(this.zalo.club(user.clubId), body));
  }

  @Get('report-preview') @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async preview(@CurrentUser() user: JwtUser) { return ok(await this.zalo.preview(this.zalo.club(user.clubId))); }

  /** Revocable, unguessable capability URL for Zalo's image fetcher. */
  @Public() @Get('report-image/:id.png')
  async image(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const png = await this.zalo.reportImage(id);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    return new StreamableFile(png, { type: 'image/png' });
  }

  @Post('report') @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async report(@CurrentUser() user: JwtUser) { return ok(await this.zalo.requestReport(this.zalo.club(user.clubId))); }

  @Post('test') @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async test(@CurrentUser() user: JwtUser) { return ok(await this.zalo.test(this.zalo.club(user.clubId))); }

  @Post('disconnect') @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async disconnect(@CurrentUser() user: JwtUser) { await this.zalo.disconnect(this.zalo.club(user.clubId)); return ok({ disconnected: true }); }

  @Public() @Post('webhook/:clubId') @HttpCode(200)
  async webhook(@Param('clubId') clubId: string, @Headers('x-bot-api-secret-token') secret: string, @Body() body: unknown) {
    await this.zalo.webhook(clubId, secret, body);
    return { ok: true };
  }
}
