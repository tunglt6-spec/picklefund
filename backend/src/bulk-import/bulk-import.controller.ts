import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { BulkImportService } from './bulk-import.service';
import { CurrentUser, Roles } from '../common/decorators';
import { ok } from '../common/response';
import { BulkImportDto } from './bulk-import.dto';

@ApiTags('Bulk Import')
@ApiBearerAuth()
@Controller('bulk-import')
export class BulkImportController {
  constructor(private service: BulkImportService) {}

  // Thao tác nặng (có thể ghi hàng nghìn bản ghi) — giới hạn tần suất gọi,
  // chỉ CLUB_ADMIN (không cho treasurer để tránh lạm dụng tạo hàng loạt thành viên).
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @Roles('CLUB_ADMIN')
  @Post()
  async import(@CurrentUser() user: any, @Body() body: BulkImportDto) {
    const result = await this.service.import(user.clubId, user.userId, body);
    const totalCreated =
      result.members.created +
      result.fundPeriods.created +
      result.sessions.created +
      result.registrations.created +
      result.attendance.created +
      result.contributions.created +
      result.expenses.created;
    return ok(result, `Đã nhập ${totalCreated} bản ghi`);
  }
}
