import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PersonalReceiptsService } from './personal-receipts.service';
import { CurrentUser, Roles} from '../common/decorators';
import { ok } from '../common/response';

@ApiTags('Personal Receipts')
@ApiBearerAuth()
@Controller('personal-receipts')
export class PersonalReceiptsController {
  constructor(private service: PersonalReceiptsService) {}

  @Get('mine')
  async findMine(@CurrentUser() user: any) {
    return ok(await this.service.findMine(user.memberId, user.clubId));
  }

  @Get('period/:fundPeriodId')
  async findByPeriod(
    @Param('fundPeriodId') fundPeriodId: string,
    @CurrentUser() user: any,
  ) {
    return ok(await this.service.findByPeriod(fundPeriodId, user.clubId));
  }

  @Post('generate/:fundPeriodId')
  @Roles('CLUB_ADMIN')
  async generate(
    @Param('fundPeriodId') fundPeriodId: string,
    @CurrentUser() user: any,
  ) {
    return ok(
      await this.service.generateForPeriod(fundPeriodId, user.clubId),
      'Đã tạo phiếu chi cá nhân',
    );
  }

  @Get('member/:memberId')
  async findByMember(
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    return ok(await this.service.findByMember(memberId, user.clubId));
  }
}
