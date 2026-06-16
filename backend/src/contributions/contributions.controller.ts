import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ContributionsService } from './contributions.service'
import { CurrentUser, Roles } from '../common/decorators'
import { ok } from '../common/response'

@ApiTags('Contributions')
@ApiBearerAuth()
@Controller('contributions')
export class ContributionsController {
  constructor(private service: ContributionsService) {}

  @Get()
  async findAll(@CurrentUser() user: any, @Query('fundPeriodId') fundPeriodId?: string) {
    return ok(await this.service.findAll(user.clubId, fundPeriodId))
  }

  @Post()
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async create(@CurrentUser() user: any, @Body() body: any) {
    return ok(await this.service.create(user.clubId, user.userId, body), 'Ghi nhận đóng quỹ thành công')
  }

  @Patch(':id/confirm')
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async toggleConfirm(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.service.toggleConfirm(id, user.clubId))
  }

  @Get('summary')
  async summary(@CurrentUser() user: any, @Query('fundPeriodId') fundPeriodId: string) {
    return ok(await this.service.summary(user.clubId, fundPeriodId))
  }
}
