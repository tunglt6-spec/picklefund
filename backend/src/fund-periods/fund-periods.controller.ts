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
import { SkipThrottle } from '@nestjs/throttler';
import { FundPeriodsService } from './fund-periods.service';
import { CurrentUser, Roles } from '../common/decorators';
import { ok } from '../common/response';
import {
  CreateFundPeriodDto,
  UpdateFundPeriodDto,
  UpdateFundPeriodStatusDto,
} from './fund-periods.dto';

@SkipThrottle()
@ApiTags('Fund Periods')
@ApiBearerAuth()
@Controller('fund-periods')
export class FundPeriodsController {
  constructor(private service: FundPeriodsService) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return ok(await this.service.findAll(user.clubId));
  }

  @Post()
  @Roles('CLUB_ADMIN')
  async create(@CurrentUser() user: any, @Body() body: CreateFundPeriodDto) {
    const created = await this.service.create(user.clubId, user.userId, body);
    const message = created.copiedMembersCount
      ? `Tạo kỳ quỹ thành công. Đã sao chép ${created.copiedMembersCount} thành viên từ kỳ quỹ trước.`
      : 'Tạo kỳ quỹ thành công.';
    return ok(created, message);
  }

  // FUND-IMPL-01: đặt TRƯỚC ':id' để tránh NestJS match nhầm 'previous' thành :id.
  @Get('previous')
  async previous(@CurrentUser() user: any, @Query('type') type?: string) {
    return ok(
      await this.service.previousPeriodInfo(user.clubId, type ?? 'chung'),
    );
  }

  // Chuỗi Thu/Chi N kỳ gần nhất (Option 3) — đặt TRƯỚC ':id'.
  @Get('trends')
  async trends(
    @CurrentUser() user: any,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('fundSource') fundSource?: 'ALL' | 'COMMON' | 'MINI',
  ) {
    return ok(
      await this.service.trends(
        user.clubId,
        type ?? 'chung',
        limit ? Number(limit) : undefined,
        fundSource ?? 'ALL',
      ),
    );
  }

  // Sổ quỹ hợp nhất Thu+Chi (Option 3) — đặt TRƯỚC ':id'.
  @Get('ledger')
  async ledger(
    @CurrentUser() user: any,
    @Query('fundPeriodId') fundPeriodId?: string,
    @Query('fundSource') fundSource?: 'ALL' | 'COMMON' | 'MINI',
  ) {
    return ok(
      await this.service.ledger(user.clubId, fundPeriodId, fundSource ?? 'ALL'),
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.service.findOne(id, user.clubId));
  }

  @Put(':id')
  @Roles('CLUB_ADMIN')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: UpdateFundPeriodDto,
  ) {
    return ok(await this.service.update(id, user.clubId, body));
  }

  @Patch(':id/status')
  @Roles('CLUB_ADMIN')
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: UpdateFundPeriodStatusDto,
  ) {
    return ok(await this.service.updateStatus(id, user.clubId, body.status));
  }

  @Delete(':id')
  @Roles('CLUB_ADMIN')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.service.delete(id, user.clubId), 'Đã xóa kỳ quỹ');
  }

  @Get(':id/summary')
  async summary(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.service.summary(id, user.clubId));
  }

  // Top người đóng + giao dịch lớn nhất của kỳ (Option 3).
  @Get(':id/highlights')
  async highlights(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    return ok(
      await this.service.highlights(
        id,
        user.clubId,
        limit ? Number(limit) : undefined,
      ),
    );
  }
}
