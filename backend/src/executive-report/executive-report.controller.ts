import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, Roles, type JwtUser } from '../common/decorators';
import { ok } from '../common/response';
import { ExecutiveReportService } from './executive-report.service';

/**
 * AIDO Executive Report — báo cáo điều hành theo KỲ QUỸ cho Ban quản trị.
 * Mount dưới path /aido nhưng ở module riêng (tránh circular DI với FundPeriods→Workflows→Aido).
 * Scope theo clubId từ JWT (KHÔNG tin frontend). Chỉ SUPER_ADMIN / CLUB_ADMIN.
 */
@ApiBearerAuth()
@Controller('aido')
@Roles('SUPER_ADMIN', 'CLUB_ADMIN')
export class ExecutiveReportController {
  constructor(private readonly report: ExecutiveReportService) {}

  @Get('executive-report')
  @ApiOperation({
    summary:
      'AIDO Executive Report v1.0 — tổng hợp điều hành THẬT theo 1 kỳ quỹ (tài chính/thành viên/hoạt động/thi đấu/AI/health).',
  })
  async get(
    @CurrentUser() user: JwtUser,
    @Query('fundPeriodId') fundPeriodId?: string,
  ) {
    if (!fundPeriodId) throw new BadRequestException('Thiếu fundPeriodId');
    return ok(
      await this.report.generate(user.clubId ?? '', fundPeriodId),
      'Báo cáo điều hành',
    );
  }
}
