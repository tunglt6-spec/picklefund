import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ContributionsService } from './contributions.service';
import { CurrentUser, Roles } from '../common/decorators';
import { ok } from '../common/response';
import type { FundSource } from '@prisma/client';
import {
  CreateContributionDto,
  UpdateContributionDto,
  ImportContributionsDto,
} from './contributions.dto';

@ApiTags('Contributions')
@ApiBearerAuth()
@Controller('contributions')
export class ContributionsController {
  constructor(private service: ContributionsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('fundPeriodId') fundPeriodId?: string,
    @Query('fundSource') fundSource?: FundSource,
  ) {
    return ok(
      await this.service.findAll(user.clubId, fundPeriodId, fundSource),
    );
  }

  @Post()
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async create(@CurrentUser() user: any, @Body() body: CreateContributionDto) {
    return ok(
      await this.service.create(user.clubId, user.userId, body),
      'Ghi nhận đóng quỹ thành công',
    );
  }

  @Put(':id')
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: UpdateContributionDto,
  ) {
    return ok(await this.service.update(id, user.clubId, body));
  }

  @Delete(':id')
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.service.delete(id, user.clubId), 'Đã xóa khoản thu');
  }

  @Patch(':id/confirm')
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async toggleConfirm(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.service.toggleConfirm(id, user.clubId));
  }

  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  @Post('import')
  async importBulk(@CurrentUser() user: any, @Body() body: ImportContributionsDto) {
    return ok(
      await this.service.importBulk(user.clubId, user.userId, body),
      'Nhập Excel hoàn tất',
    );
  }

  @Get('summary')
  async summary(
    @CurrentUser() user: any,
    @Query('fundPeriodId') fundPeriodId?: string,
  ) {
    return ok(await this.service.summary(user.clubId, fundPeriodId));
  }
}
