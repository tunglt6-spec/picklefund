import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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

/**
 * Member self-view (AUTH-IMPL-01) — READ-ONLY, chỉ CLUB_MEMBER.
 * Phạm vi dữ liệu lấy từ JWT (memberId/clubId/userId), KHÔNG nhận memberId/clubId từ body/query.
 */
@ApiTags('Member Portal')
@ApiBearerAuth()
@Controller('member')
@Roles('CLUB_MEMBER')
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

  @Get('me/personal-receipt')
  async personalReceipt(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.getPersonalReceipts(user.memberId, user.clubId));
  }

  @Get('me/minigame')
  async minigame(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.getMinigames(user.memberId, user.clubId));
  }

  @Get('me/notifications')
  async notifications(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.getNotifications(user.userId, user.clubId));
  }
}
