import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ExpensesService } from './expenses.service'
import { CurrentUser, Roles } from '../common/decorators'
import { ok } from '../common/response'
import type { FundSource } from '@prisma/client'
import { CreateExpenseDto, UpdateExpenseDto } from './expenses.dto'

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
  async create(@CurrentUser() user: any, @Body() body: CreateExpenseDto) {
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
  async update(@Param('id') id: string, @CurrentUser() user: any, @Body() body: UpdateExpenseDto) {
    return ok(await this.service.update(id, user.clubId, body))
  }

  @Patch(':id/status')
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async updateStatus(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { status: string }) {
    return ok(await this.service.updateStatus(id, user.clubId, body.status))
  }

  @Delete(':id')
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.service.delete(id, user.clubId), 'Đã xóa chi phí')
  }
}
