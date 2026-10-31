import { Body, Controller, Get, Headers, HttpCode, Param, Post, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { IsBoolean, IsOptional, IsString, MaxLength, Matches, IsInt, IsIn } from 'class-validator';
import { CurrentUser, Public, Roles } from '../common/decorators';
import type { JwtUser } from '../common/decorators';
import { ok } from '../common/response';
import { ZaloService } from './zalo.service';

class BotDto { @IsString() @MaxLength(512) token: string; }
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
    return ok(await this.zalo.register(this.zalo.club(user.clubId), body.token));
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
