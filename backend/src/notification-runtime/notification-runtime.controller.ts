import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationRuntimeService } from './notification-runtime.service';
import { CurrentUser, Roles, type JwtUser } from '../common/decorators';
import { ok } from '../common/response';

/**
 * Hermes Notification Runtime (Epic 8) — admin visibility (read-only).
 * clubId từ JWT. Chỉ SUPER_ADMIN / CLUB_ADMIN — MEMBER_VIEW/CLUB_TREASURER bị chặn
 * (RolesGuard). Response job đã sanitize (không payloadJson thô).
 */
@ApiTags('Notification Runtime')
@ApiBearerAuth()
@Controller('notification-runtime')
@Roles('SUPER_ADMIN', 'CLUB_ADMIN')
export class NotificationRuntimeController {
  constructor(private svc: NotificationRuntimeService) {}

  @Get('jobs')
  @ApiOperation({
    summary: 'Job thông báo gần đây (sanitized, clubId từ JWT).',
  })
  async listJobs(
    @CurrentUser() user: JwtUser,
    @Query('status') status?: string,
  ) {
    return ok(await this.svc.listJobs(user.clubId, status));
  }

  @Get('channels')
  @ApiOperation({ summary: 'Trạng thái channel (READY/DRY_RUN).' })
  channels() {
    return ok(this.svc.channelStatus());
  }
}
