import { Body, Controller, Get, Put } from '@nestjs/common'
import { SystemSettingsService } from './system-settings.service'
import { Roles } from '../common/decorators'
import { ok } from '../common/response'

@Controller('system-settings')
export class SystemSettingsController {
  constructor(private readonly svc: SystemSettingsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'CLUB_ADMIN', 'CLUB_TREASURER')
  async getAll() {
    return ok(await this.svc.getAll())
  }

  @Put()
  @Roles('SUPER_ADMIN', 'CLUB_ADMIN')
  async upsertMany(@Body() body: Record<string, string>) {
    await this.svc.upsertMany(body)
    return ok(await this.svc.getAll())
  }
}
