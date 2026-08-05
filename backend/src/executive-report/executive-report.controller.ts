import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { CurrentUser, Roles, type JwtUser } from '../common/decorators';
import { ok } from '../common/response';
import { ExecutiveReportService } from './executive-report.service';

class AutoEmailDto {
  @IsBoolean()
  enabled!: boolean;
}

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

  @Get('executive-report/ai-summary')
  @ApiOperation({
    summary:
      'AI Executive Summary — tóm tắt điều hành bằng ngôn ngữ tự nhiên (Gemini nếu có GOOGLE_API_KEY, nếu không → rule-based từ số thật). Tải lười.',
  })
  async aiSummary(
    @CurrentUser() user: JwtUser,
    @Query('fundPeriodId') fundPeriodId?: string,
  ) {
    if (!fundPeriodId) throw new BadRequestException('Thiếu fundPeriodId');
    return ok(await this.report.aiSummary(user.clubId ?? '', fundPeriodId));
  }

  @Get('executive-report/auto-email')
  @ApiOperation({
    summary: 'Cấu hình tự-gửi báo cáo qua email đầu mỗi tháng (opt-in) + trạng thái SMTP + người nhận.',
  })
  async getAutoEmail(@CurrentUser() user: JwtUser) {
    return ok(await this.report.getAutoEmailConfig(user.clubId ?? ''));
  }

  @Patch('executive-report/auto-email')
  @ApiOperation({ summary: 'Bật/tắt tự-gửi báo cáo qua email đầu mỗi tháng.' })
  async setAutoEmail(
    @CurrentUser() user: JwtUser,
    @Body() body: AutoEmailDto,
  ) {
    return ok(
      await this.report.setAutoEmail(user.clubId ?? '', body.enabled),
      body.enabled ? 'Đã bật tự-gửi email hằng tháng' : 'Đã tắt tự-gửi email',
    );
  }

  @Post('executive-report/auto-email/test')
  @ApiOperation({ summary: 'Gửi thử báo cáo qua email ngay (không ghi mốc tháng).' })
  async testEmail(@CurrentUser() user: JwtUser) {
    return ok(
      await this.report.sendMonthlyReportEmail(user.clubId ?? ''),
      'Đã xử lý gửi thử',
    );
  }
}
