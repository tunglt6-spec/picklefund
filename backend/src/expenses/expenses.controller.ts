import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ExpensesService } from './expenses.service'
import { CurrentUser, Roles } from '../common/decorators'
import { ok } from '../common/response'
import type { FundSource } from '@prisma/client'

@ApiTags('Expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private service: ExpensesService) {}

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('fundPeriodId') fundPeriodId?: string,
    @Query('fundSource') fundSource?: FundSource,
  ) {
    return ok(await this.service.findAll(user.clubId, fundPeriodId, fundSource))
  }

  @Post()
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async create(@CurrentUser() user: any, @Body() body: any) {
    return ok(await this.service.create(user.clubId, user.userId, body), 'Thêm chi phí thành công')
  }

  @Get('summary')
  async summary(@CurrentUser() user: any, @Query('fundPeriodId') fundPeriodId?: string) {
    return ok(await this.service.summary(user.clubId, fundPeriodId))
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.service.findOne(id, user.clubId))
  }

  @Put(':id')
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async update(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return ok(await this.service.update(id, user.clubId, body))
  }

  @Delete(':id')
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.service.delete(id, user.clubId), 'Đã xóa chi phí')
  }
}
