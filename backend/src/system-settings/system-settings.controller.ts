import { Body, Controller, Get, Put } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { CurrentUser, Roles} from '../common/decorators';
import { ok } from '../common/response';

@Controller('system-settings')
export class SystemSettingsController {
  constructor(private readonly svc: SystemSettingsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'CLUB_ADMIN', 'CLUB_TREASURER', 'CLUB_MEMBER')
  async getAll(@CurrentUser() user: any) {
    return ok(await this.svc.getAll(user.clubId ?? undefined));
  }

  @Put()
  @Roles('SUPER_ADMIN', 'CLUB_ADMIN')
  async upsertMany(
    @CurrentUser() user: any,
    @Body() body: Record<string, string>,
  ) {
    await this.svc.upsertMany(body, user.clubId ?? undefined);
    return ok(await this.svc.getAll(user.clubId ?? undefined));
  }
}
