import { Body, Controller, Get, Put } from '@nestjs/common'
import { SystemSettingsService } from './system-settings.service'
import { Roles } from '../common/decorators'
import { ok } from '../common/response'

@Controller('system-settings')
@Roles('SUPER_ADMIN')
export class SystemSettingsController {
  constructor(private readonly svc: SystemSettingsService) {}

  @Get()
  async getAll() {
    return ok(await this.svc.getAll())
  }

  @Put()
  async upsertMany(@Body() body: Record<string, string>) {
    await this.svc.upsertMany(body)
    return ok(await this.svc.getAll())
  }
}
