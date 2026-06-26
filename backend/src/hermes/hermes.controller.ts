import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HermesService } from './hermes.service';
import { CurrentUser, Roles} from '../common/decorators';
import { ok } from '../common/response';
import type { HermesEvent } from './hermes.types';

@ApiTags('Hermes')
@ApiBearerAuth()
@Controller('hermes')
export class HermesController {
  constructor(private svc: HermesService) {}

  // Internal: Maika / Lisa dispatch events
  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post('dispatch')
  async dispatch(@Body() body: HermesEvent, @CurrentUser() user: any) {
    // CLUB_ADMIN can only dispatch for their own club; SUPER_ADMIN may pass any clubId
    const event: HermesEvent =
      user.role === 'SUPER_ADMIN' ? body : { ...body, clubId: user.clubId };
    return ok(await this.svc.dispatch(event), 'Đã gửi thông báo');
  }

  // User: get own notifications
  @Get('notifications')
  async getNotifications(
    @CurrentUser() user: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const p = Math.max(1, +page || 1);
    const l = Math.min(100, Math.max(1, +limit || 20));
    return ok(await this.svc.getNotifications(user.userId, p, l));
  }

  // User: mark one as read
  @Patch('notifications/:id/read')
  async markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.svc.markAsRead(id, user.userId), 'Đã đánh dấu đã đọc');
  }

  // User: mark all as read
  @Post('notifications/read-all')
  async markAllAsRead(@CurrentUser() user: any) {
    return ok(
      await this.svc.markAllAsRead(user.userId),
      'Đã đánh dấu tất cả đã đọc',
    );
  }

  // User: get preferences
  @Get('preferences')
  async getPreferences(@CurrentUser() user: any) {
    return ok(await this.svc.getPreferences(user.userId));
  }

  // Test email delivery for current user
  @Post('test-email')
  async testEmail(@CurrentUser() user: { userId: string }) {
    const result = await this.svc.testEmail(user.userId);
    if (!result.to) return ok(result, 'Tài khoản chưa có địa chỉ email');
    return ok(
      result,
      result.sent
        ? `Đã gửi test email tới ${result.to}`
        : 'Gửi email thất bại — kiểm tra cấu hình SMTP',
    );
  }

  // User: update preferences
  @Patch('preferences')
  async updatePreferences(
    @CurrentUser() user: any,
    @Body()
    body: {
      preferredChannel?: 'IN_APP' | 'EMAIL' | 'TELEGRAM';
      telegramChatId?: string;
      quietHoursStart?: number;
      quietHoursEnd?: number;
      maxDailyPush?: number;
      maxDailyEmail?: number;
      maxDailyTelegram?: number;
      enabled?: boolean;
    },
  ) {
    const { quietHoursStart: qs, quietHoursEnd: qe, maxDailyPush: mp, maxDailyEmail: me, maxDailyTelegram: mt } = body;
    if (qs !== undefined && (qs < 0 || qs > 23)) throw new BadRequestException('quietHoursStart phải từ 0–23');
    if (qe !== undefined && (qe < 0 || qe > 23)) throw new BadRequestException('quietHoursEnd phải từ 0–23');
    if (mp !== undefined && (mp < 0 || mp > 100)) throw new BadRequestException('maxDailyPush phải từ 0–100');
    if (me !== undefined && (me < 0 || me > 100)) throw new BadRequestException('maxDailyEmail phải từ 0–100');
    if (mt !== undefined && (mt < 0 || mt > 100)) throw new BadRequestException('maxDailyTelegram phải từ 0–100');
    return ok(
      await this.svc.updatePreferences(user.userId, body),
      'Đã cập nhật cài đặt thông báo',
    );
  }
}
