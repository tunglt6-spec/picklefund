import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HermesService } from './hermes.service';
import { CurrentUser, Roles } from '../common/decorators';
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
  async dispatch(@Body() body: HermesEvent) {
    return ok(await this.svc.dispatch(body), 'Đã gửi thông báo');
  }

  // User: get own notifications
  @Get('notifications')
  async getNotifications(
    @CurrentUser() user: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return ok(await this.svc.getNotifications(user.userId, +page, +limit));
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
    return ok(
      await this.svc.updatePreferences(user.userId, body),
      'Đã cập nhật cài đặt thông báo',
    );
  }
}
