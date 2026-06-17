import { Controller, Get, Query } from '@nestjs/common'
import { AuditLogsService } from './audit-logs.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { ok } from '../common/response'

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly svc: AuditLogsService) {}

  @Get()
  @Roles('SUPER_ADMIN')
  async findAll(
    @CurrentUser() user: any,
    @Query('clubId') clubId?: string,
    @Query('action') action?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return ok(
      await this.svc.findAll({
        clubId: clubId || undefined,
        action: action || undefined,
        search: search || undefined,
        limit: limit ? parseInt(limit, 10) : 100,
      }),
    )
  }
}
