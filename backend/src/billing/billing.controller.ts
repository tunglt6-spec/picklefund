import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CurrentUser, Roles } from '../common/decorators';
import { ok } from '../common/response';
import { UpgradePlanDto } from './billing.dto';

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
  async getSubscription(@CurrentUser() user: { clubId: string }) {
    return ok(await this.svc.getSubscription(user.clubId));
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get('ai-usage')
  async getAiUsage(@CurrentUser() user: { clubId: string }) {
    return ok(await this.svc.getAiUsage(user.clubId));
  }

  @Roles('SUPER_ADMIN')
  @Post('upgrade')
  async upgrade(@Body() body: UpgradePlanDto) {
    return ok(await this.svc.upgradePlan(body.clubId, body.tier, body.months));
  }
}
