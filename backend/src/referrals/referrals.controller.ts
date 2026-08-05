import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import { ReferralsService } from './referrals.service';
import { CurrentUser, Roles } from '../common/decorators';
import type { JwtUser } from '../common/decorators';
import { ok } from '../common/response';

class ApplyReferralDto {
  @IsString()
  @MaxLength(20)
  code!: string;
}

@ApiTags('Referrals')
@ApiBearerAuth()
@Controller('referrals')
export class ReferralsController {
  constructor(private svc: ReferralsService) {}

  /** Mã giới thiệu của CLB + thống kê. */
  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get('me')
  async me(@CurrentUser() user: JwtUser) {
    return ok(await this.svc.getMy(user.clubId as string));
  }

  /** Áp mã giới thiệu của CLB khác (1 lần). */
  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post('apply')
  async apply(@CurrentUser() user: JwtUser, @Body() dto: ApplyReferralDto) {
    return ok(await this.svc.applyCode(user.clubId as string, dto.code, user.userId));
  }
}
