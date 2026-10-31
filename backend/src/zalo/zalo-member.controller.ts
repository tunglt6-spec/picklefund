import { Controller, Get, Post } from '@nestjs/common';
import type { Role } from '@prisma/client';
import { CurrentUser, Roles, type JwtUser } from '../common/decorators';
import { ok } from '../common/response';
import { ZaloIntakeService } from './zalo-intake.service';

/** Thành viên tự liên kết Zalo (để dùng /dangky /huy /diemdanh /no). Không có quyền nhập thu/chi. */
const ANY: Role[] = ['MEMBER_VIEW', 'CLUB_ADMIN', 'CLUB_TREASURER'];
@Controller('member/me/zalo')
@Roles('MEMBER_VIEW', 'CLUB_ADMIN', 'CLUB_TREASURER')
export class ZaloMemberController {
  constructor(private readonly intake: ZaloIntakeService) {}
  @Get('state') async state(@CurrentUser() u: JwtUser) {
    return ok(await this.intake.state(u, ANY));
  }
  @Post('link-code') async code(@CurrentUser() u: JwtUser) {
    return ok(await this.intake.linkCode(u, ANY));
  }
  @Post('confirm-link') async confirm(@CurrentUser() u: JwtUser) {
    return ok(await this.intake.confirmLink(u, ANY));
  }
  @Post('unlink') async unlink(@CurrentUser() u: JwtUser) {
    return ok(await this.intake.unlink(u, ANY));
  }
}
