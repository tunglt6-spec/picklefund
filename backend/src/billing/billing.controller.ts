import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { BillingService } from './billing.service';
import { CurrentUser, Roles } from '../common/decorators';
import { ok } from '../common/response';

@SkipThrottle()
@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private svc: BillingService) {}

  @Get('plans')
  getPlans() {
    return ok(this.svc.getPlans());
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get('subscription')
  async getSubscription(
    @CurrentUser() user: { clubId: string; role: string },
    @Query('clubId') queryClubId?: string,
  ) {
    const clubId = user.role === 'SUPER_ADMIN' && queryClubId ? queryClubId : user.clubId;
    return ok(await this.svc.getSubscription(clubId));
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get('ai-usage')
  async getAiUsage(
    @CurrentUser() user: { clubId: string; role: string },
    @Query('clubId') queryClubId?: string,
  ) {
    const clubId = user.role === 'SUPER_ADMIN' && queryClubId ? queryClubId : user.clubId;
    return ok(await this.svc.getAiUsage(clubId));
  }

  // Đổi gói dịch vụ: dùng chung PATCH /clubs/:id/plan (ClubsController) — đã có
  // confirm dialog + audit log ở SuperClubs.tsx. Endpoint POST /billing/upgrade
  // (ghi SystemSetting song song, không đụng Club.plan thật) đã bị xóa.
}
