import { Controller, Get, Post, Put, Patch, Body, Param } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { FundPeriodsService } from './fund-periods.service'
import { CurrentUser, Roles } from '../common/decorators'
import { ok } from '../common/response'

@ApiTags('Fund Periods')
@ApiBearerAuth()
@Controller('fund-periods')
export class FundPeriodsController {
  constructor(private service: FundPeriodsService) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return ok(await this.service.findAll(user.clubId))
  }

  @Post()
  @Roles('CLUB_ADMIN')
  async create(@CurrentUser() user: any, @Body() body: any) {
    return ok(await this.service.create(user.clubId, user.userId, body), 'Tạo kỳ quỹ thành công')
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.service.findOne(id, user.clubId))
  }

  @Put(':id')
  @Roles('CLUB_ADMIN')
  async update(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return ok(await this.service.update(id, user.clubId, body))
  }

  @Patch(':id/status')
  @Roles('CLUB_ADMIN')
  async updateStatus(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { status: any }) {
    return ok(await this.service.updateStatus(id, user.clubId, body.status))
  }

  @Get(':id/summary')
  async summary(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.service.summary(id, user.clubId))
  }
}
