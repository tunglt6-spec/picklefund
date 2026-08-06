import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LisaService } from './lisa.service';
import { CurrentUser, Roles} from '../common/decorators';
import { ok } from '../common/response';
import { AgentActivityService } from '../aido/agent-activity.service';

class AskLisaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  question!: string;
}

@ApiTags('Lisa AI')
@ApiBearerAuth()
@Controller('lisa')
export class LisaController {
  constructor(
    private svc: LisaService,
    private activity: AgentActivityService,
  ) {}

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

  @Get('history')
  async history(@CurrentUser() user: any) {
    if (!user.memberId || !user.clubId) return ok([]);
    return ok(await this.svc.getHistory(user.memberId, user.clubId));
  }

  @Post('ask')
  @Throttle({ short: { ttl: 60000, limit: 12 } }) // chặn lạm dụng LLM (chi phí token bên thứ ba)
  async ask(@CurrentUser() user: any, @Body() body: AskLisaDto) {
    if (!user.memberId) {
      return ok({
        answer:
          'Lisa chỉ hỗ trợ tài khoản thành viên. Vui lòng đăng nhập bằng tài khoản thành viên để sử dụng tính năng này.',
      });
    }
    return ok(
      await this.activity.track(user.clubId, 'LISA', 'Đang trả lời thành viên', () =>
        this.svc.askLisa(user.memberId, body.question, user.clubId),
      ),
    );
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get('reminders')
  async reminders(@CurrentUser() user: any) {
    return ok(await this.svc.generateRemindersForClub(user.clubId));
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post('reminders/dispatch')
  async dispatchReminders(@CurrentUser() user: any) {
    return ok(await this.svc.dispatchRemindersForClub(user.clubId));
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get('member/:memberId/brief')
  async memberBrief(
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    // SUPER_ADMIN được xem thành viên mọi CLB. Còn lại BẮT BUỘC có clubId và khớp
    // (getPersonalBrief ném 404 nếu ctx.clubId !== callerClubId). Chặn trường hợp
    // non-super mà clubId null (nếu có) → không lọt xem chéo CLB.
    if (!isSuperAdmin && !user.clubId) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }
    return ok(
      await this.svc.getPersonalBrief(
        memberId,
        isSuperAdmin ? undefined : user.clubId,
      ),
    );
  }
}
