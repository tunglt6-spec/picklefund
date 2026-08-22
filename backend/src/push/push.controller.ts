import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PushService } from './push.service';
import { CurrentUser } from '../common/decorators';
import type { JwtUser } from '../common/decorators';
import { ok } from '../common/response';

class SubscribeDto {
  @IsString() @MaxLength(1000) endpoint!: string;
  @IsObject() keys!: { p256dh: string; auth: string };
  // Push API sub.toJSON() luôn kèm expirationTime (thường null) — cho phép để không bị
  // forbidNonWhitelisted ném 400 (nếu không, subscribe luôn thất bại → push chết).
  @IsOptional() expirationTime?: number | null;
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
  async unsubscribe(@CurrentUser() user: JwtUser, @Body() body: UnsubscribeDto) {
    // Chỉ cho hủy subscription CỦA CHÍNH mình (chống hủy nhầm thiết bị người khác).
    return ok(await this.svc.removeSubscription(body.endpoint, user.userId));
  }

  /** Gửi push THỬ tới chính mình — chẩn đoán nhanh (trả số thiết bị/gửi/lỗi). */
  @Post('test')
  async test(@CurrentUser() user: JwtUser) {
    const r = await this.svc.sendToUser(user.userId, {
      title: 'PickleFund',
      body: 'Thông báo thử nghiệm ✅ — nếu bạn thấy dòng này là push đã hoạt động.',
      url: '/member/notifications',
      tag: 'push_test',
    });
    return ok(r);
  }
}
