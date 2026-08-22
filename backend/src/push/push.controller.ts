import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { IsObject, IsString, MaxLength } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PushService } from './push.service';
import { CurrentUser } from '../common/decorators';
import type { JwtUser } from '../common/decorators';
import { ok } from '../common/response';

class SubscribeDto {
  @IsString() @MaxLength(1000) endpoint!: string;
  @IsObject() keys!: { p256dh: string; auth: string };
}
class UnsubscribeDto {
  @IsString() @MaxLength(1000) endpoint!: string;
}

/**
 * Push (Web Push PWA). MEMBER_VIEW được vào nhờ allowlist '/push' trong MemberScopeGuard.
 * clubId/userId lấy từ JWT (không tin client).
 */
@ApiTags('Push')
@ApiBearerAuth()
@Controller('push')
export class PushController {
  constructor(private svc: PushService) {}

  /** Public key VAPID để frontend subscribe (null nếu chưa cấu hình → frontend ẩn tính năng). */
  @Get('public-key')
  publicKey() {
    return ok({ publicKey: this.svc.getPublicKey() });
  }

  @Post('subscribe')
  async subscribe(
    @CurrentUser() user: JwtUser,
    @Body() body: SubscribeDto,
    @Req() req: Request,
  ) {
    return ok(
      await this.svc.saveSubscription(
        user.userId,
        user.clubId ?? null,
        body,
        req.headers['user-agent'],
      ),
    );
  }

  @Post('unsubscribe')
  async unsubscribe(@Body() body: UnsubscribeDto) {
    return ok(await this.svc.removeSubscription(body.endpoint));
  }
}
