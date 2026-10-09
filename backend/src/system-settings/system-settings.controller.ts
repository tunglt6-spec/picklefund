import { Body, BadRequestException, Controller, Get, Put } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { CurrentUser, Roles} from '../common/decorators';
import { ok } from '../common/response';

@Controller('system-settings')
export class SystemSettingsController {
  constructor(private readonly svc: SystemSettingsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'CLUB_ADMIN', 'CLUB_TREASURER')
  async getAll(@CurrentUser() user: any) {
    return ok(await this.svc.getAll(user.clubId ?? undefined));
  }

  @Put()
  @Roles('SUPER_ADMIN', 'CLUB_ADMIN')
  async upsertMany(
    @CurrentUser() user: any,
    @Body() body: Record<string, string>,
  ) {
    const entries = Object.entries(body);
    if (entries.length > 50) throw new BadRequestException('Tối đa 50 cài đặt mỗi lần');
    for (const [key, value] of entries) {
      if (typeof key !== 'string' || key.length > 100) throw new BadRequestException(`Key không hợp lệ: ${key}`);
      if (typeof value !== 'string' || value.length > 1000) throw new BadRequestException(`Giá trị quá dài cho key: ${key}`);
    }
    if (!user.clubId) {
      // Khóa cấu hình toàn cục (Super Admin): kiểm tra kiểu cho các khóa đã biết.
      const intKeys = ['maxClubs', 'maxMembersPerClub', 'sessionTimeoutMinutes'];
      const boolKeys = ['maintenanceMode', 'emailNotifications', 'autoBackup', 'registrationOpen', 'requireEmailVerification', 'renewal_reminder_enabled'];
      for (const [key, value] of entries) {
        if (intKeys.includes(key) && !(/^\d{1,6}$/.test(value) && Number(value) >= 1)) throw new BadRequestException(`"${key}" phải là số nguyên dương`);
        if (boolKeys.includes(key) && value !== 'true' && value !== 'false') throw new BadRequestException(`"${key}" chỉ nhận true/false`);
        if (key === 'supportEmail' && value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) throw new BadRequestException('Email hỗ trợ không hợp lệ');
        if (key === 'renewal_reminder_cadence' && !['MONTH', 'QUARTER', 'BOTH'].includes(value)) throw new BadRequestException('Mốc nhắc không hợp lệ');
      }
    }
    await this.svc.upsertMany(body, user.clubId ?? undefined);
    return ok(await this.svc.getAll(user.clubId ?? undefined));
  }
}
