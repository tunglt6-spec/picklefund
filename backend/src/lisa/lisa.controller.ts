import { Controller, Get, Post, Body, Param } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { LisaService } from './lisa.service'
import { CurrentUser, Roles } from '../common/decorators'
import { ok } from '../common/response'

@ApiTags('Lisa AI')
@ApiBearerAuth()
@Controller('lisa')
export class LisaController {
  constructor(private svc: LisaService) {}

  @Get('brief')
  async brief(@CurrentUser() user: any) {
    return ok(await this.svc.getPersonalBrief(user.memberId ?? user.id))
  }

  @Post('ask')
  async ask(@CurrentUser() user: any, @Body() body: { question: string }) {
    return ok(await this.svc.askLisa(user.memberId ?? user.id, body.question))
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get('reminders')
  async reminders(@CurrentUser() user: any) {
    return ok(await this.svc.generateRemindersForClub(user.clubId))
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post('reminders/dispatch')
  async dispatchReminders(@CurrentUser() user: any) {
    const count = await this.svc.dispatchRemindersForClub(user.clubId)
    return ok({ dispatched: count })
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get('member/:memberId/brief')
  async memberBrief(@Param('memberId') memberId: string) {
    return ok(await this.svc.getPersonalBrief(memberId))
  }
}
