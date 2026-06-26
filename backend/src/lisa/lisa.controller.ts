import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LisaService } from './lisa.service';
import { CurrentUser, Roles} from '../common/decorators';
import { ok } from '../common/response';

@ApiTags('Lisa AI')
@ApiBearerAuth()
@Controller('lisa')
export class LisaController {
  constructor(private svc: LisaService) {}

  @Get('brief')
  async brief(@CurrentUser() user: any) {
    if (!user.memberId) {
      return ok({
        greeting: `Xin chào ${user.username}! Tôi là Lisa, trợ lý AI của bạn.`,
        paymentStatus: 'N/A',
        activitySummary: 'N/A',
        reminder: null,
        tips: ['Dùng tài khoản thành viên để xem thông tin cá nhân'],
      });
    }
    return ok(await this.svc.getPersonalBrief(user.memberId));
  }

  @Post('ask')
  async ask(@CurrentUser() user: any, @Body() body: { question: string }) {
    if (!user.memberId) {
      return ok({
        answer:
          'Lisa chỉ hỗ trợ tài khoản thành viên. Vui lòng đăng nhập bằng tài khoản thành viên để sử dụng tính năng này.',
      });
    }
    return ok(await this.svc.askLisa(user.memberId, body.question));
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get('reminders')
  async reminders(@CurrentUser() user: any) {
    return ok(await this.svc.generateRemindersForClub(user.clubId));
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post('reminders/dispatch')
  async dispatchReminders(@CurrentUser() user: any) {
    const count = await this.svc.dispatchRemindersForClub(user.clubId);
    return ok({ dispatched: count });
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get('member/:memberId/brief')
  async memberBrief(
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    return ok(await this.svc.getPersonalBrief(memberId, user.clubId));
  }
}
