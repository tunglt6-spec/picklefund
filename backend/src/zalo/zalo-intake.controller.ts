import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CurrentUser, Roles, type JwtUser } from '../common/decorators';
import { ok } from '../common/response';
import { ZaloIntakeService } from './zalo-intake.service';
class RecordDraftDto {
  @IsInt() @Min(1) @Max(1_000_000_000_000) amount: number;
  @IsString() @MinLength(1) @MaxLength(200) description: string;
  @IsIn(['COMMON', 'MINI']) fundSource: 'COMMON' | 'MINI';
  @Matches(/^\d{4}-\d{2}-\d{2}$/) date: string;
  @IsOptional() @IsUUID() memberId?: string;
  @IsOptional() @IsUUID() fundPeriodId?: string;
  @IsOptional() @IsIn(['EQUAL', 'FUND_ONLY']) allocationRule?:
    | 'EQUAL'
    | 'FUND_ONLY';
  @IsOptional() @IsIn(['COURT', 'LIVING']) costType?: 'COURT' | 'LIVING';
  @IsOptional() @IsIn(['cash', 'bank_transfer']) paymentMethod?:
    | 'cash'
    | 'bank_transfer';
}
@Controller('zalo/intake')
@Roles('CLUB_ADMIN', 'CLUB_TREASURER')
export class ZaloIntakeController {
  constructor(private readonly intake: ZaloIntakeService) {}
  @Get('state') async state(@CurrentUser() u: JwtUser) {
    return ok(await this.intake.state(u));
  }
  @Post('link-code') async code(@CurrentUser() u: JwtUser) {
    return ok(await this.intake.linkCode(u));
  }
  @Post('confirm-link') async confirm(@CurrentUser() u: JwtUser) {
    return ok(await this.intake.confirmLink(u));
  }
  @Post('unlink') async unlink(@CurrentUser() u: JwtUser) {
    return ok(await this.intake.unlink(u));
  }
  @Get('drafts') async drafts(@CurrentUser() u: JwtUser) {
    return ok(await this.intake.list(u));
  }
  @Post('drafts/:id/record') async record(
    @CurrentUser() u: JwtUser,
    @Param('id') id: string,
    @Body() body: RecordDraftDto,
  ) {
    return ok(await this.intake.decide(u, id, false, body));
  }
  @Post('drafts/:id/reject') async reject(
    @CurrentUser() u: JwtUser,
    @Param('id') id: string,
  ) {
    return ok(await this.intake.decide(u, id, true));
  }
}
