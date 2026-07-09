import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { CurrentUser, Roles} from '../common/decorators';
import { ok } from '../common/response';

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
    );
  }

  /**
   * Audit log CỦA RIÊNG CLB (AI Operations Center). clubId ÉP TỪ JWT — client KHÔNG
   * override được (tenant isolation). CLUB_ADMIN chỉ thấy log club mình; SUPER_ADMIN
   * dùng endpoint gốc `GET /audit-logs` để xem toàn hệ thống.
   */
  @Get('club')
  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async findForClub(
    @CurrentUser() user: any,
    @Query('action') action?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return ok(
      await this.svc.findAll({
        clubId: user.clubId, // FORCE theo JWT — không nhận clubId từ query
        action: action || undefined,
        search: search || undefined,
        limit: limit ? parseInt(limit, 10) : 100,
      }),
    );
  }
}
