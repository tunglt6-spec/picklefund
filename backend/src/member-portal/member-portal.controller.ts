import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { MemberPortalService } from './member-portal.service';
import { CurrentUser, Roles } from '../common/decorators';
import { ok } from '../common/response';

/** User từ JWT — chỉ các field controller member-portal dùng (KHÔNG tin client). */
interface RequestUser {
  userId: string;
  clubId: string;
  memberId: string | null;
  role: string;
}

/** Body đăng ký / hủy đăng ký buổi chơi (self-scope). */
class SelfRegistrationDto {
  @IsBoolean() register!: boolean;
}

/**
 * Member self-view (AUTH-IMPL-01) — READ-ONLY, chỉ MEMBER_VIEW.
 * Phạm vi dữ liệu lấy từ JWT (memberId/clubId/userId), KHÔNG nhận memberId/clubId từ body/query.
 */
@ApiTags('Member Portal')
@ApiBearerAuth()
@Controller('member')
@Roles('MEMBER_VIEW')
export class MemberPortalController {
  constructor(private svc: MemberPortalService) {}

  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.getMe(user.memberId, user.clubId));
  }

  @Get('me/attendance')
  async attendance(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.getAttendance(user.memberId, user.clubId));
  }

  @Get('me/finance')
  async finance(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.getFinance(user.memberId, user.clubId));
  }

  @Get('me/contributions')
  async contributions(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.getContributions(user.memberId, user.clubId));
  }

  @Get('me/personal-receipt')
  async personalReceipt(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.getPersonalReceipts(user.memberId, user.clubId));
  }

  @Get('me/minigame')
  async minigame(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.getMinigames(user.memberId, user.clubId));
  }

  @Get('me/bank-info')
  async bankInfo(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.getBankInfo(user.memberId, user.clubId));
  }

  /** Member tự đăng ký / hủy đăng ký 1 buổi chơi (idempotent). */
  @Put('me/sessions/:sessionId/registration')
  async selfRegister(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: SelfRegistrationDto,
  ) {
    return ok(
      await this.svc.selfRegister(
        user.memberId,
        user.clubId,
        sessionId,
        body.register,
      ),
      body.register ? 'Đã đăng ký buổi chơi' : 'Đã hủy đăng ký',
    );
  }

  /** Member tự check-in PRESENT vào buổi chơi (idempotent). */
  @Put('me/sessions/:sessionId/checkin')
  async selfCheckin(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(
      await this.svc.selfCheckin(user.memberId, user.clubId, sessionId),
      'Đã check-in',
    );
  }

  @Get('me/notifications')
  async notifications(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.getNotifications(user.userId, user.clubId));
  }
}
