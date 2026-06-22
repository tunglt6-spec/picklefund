import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger'
import { AiService } from './ai.service'
import { Roles } from '../common/decorators'
import { ok } from '../common/response'

@ApiTags('AI Integration')
@ApiBearerAuth()
@ApiSecurity('X-API-Key')
@Controller('ai')
@Roles('SUPER_ADMIN')
export class AiController {
  constructor(private service: AiService) {}

  @Get('health')
  async health() {
    return ok(await this.service.health())
  }

  @Get('clubs')
  async listClubs() {
    return ok(await this.service.listClubs())
  }

  @Get('clubs/:clubId/summary')
  async summary(@Param('clubId') clubId: string) {
    return ok(await this.service.getClubSummary(clubId))
  }

  @Get('clubs/:clubId/members')
  async members(@Param('clubId') clubId: string) {
    return ok(await this.service.getMembers(clubId))
  }

  @Get('clubs/:clubId/fund-periods')
  async fundPeriods(@Param('clubId') clubId: string) {
    return ok(await this.service.getFundPeriods(clubId))
  }

  @Get('clubs/:clubId/contributions')
  async contributions(@Param('clubId') clubId: string, @Query('fundPeriodId') fundPeriodId?: string) {
    return ok(await this.service.getContributions(clubId, fundPeriodId))
  }

  @Get('clubs/:clubId/expenses')
  async expenses(@Param('clubId') clubId: string, @Query('fundPeriodId') fundPeriodId?: string) {
    return ok(await this.service.getExpenses(clubId, fundPeriodId))
  }

  @Get('clubs/:clubId/sessions')
  async sessions(@Param('clubId') clubId: string) {
    return ok(await this.service.getSessions(clubId))
  }
}
