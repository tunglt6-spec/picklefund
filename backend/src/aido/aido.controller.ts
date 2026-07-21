import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, Roles, type JwtUser } from '../common/decorators';
import { ok } from '../common/response';
import { AgentActivityService } from './agent-activity.service';
import { AgentResultsService } from './agent-results.service';

/**
 * AidoController — API phụ trợ cho AI Digital Office. Trạng thái hoạt động agent (lần load đầu;
 * cập nhật tiếp theo qua WebSocket 'agent-activity') + kết quả công việc THẬT trong ngày.
 */
@ApiBearerAuth()
@Controller('aido')
@Roles('SUPER_ADMIN', 'CLUB_ADMIN')
export class AidoController {
  constructor(
    private readonly activity: AgentActivityService,
    private readonly results: AgentResultsService,
  ) {}

  @Get('agent-activity')
  @ApiOperation({ summary: 'Trạng thái hoạt động hiện tại của các agent (theo CLB)' })
  getAgentActivity(@CurrentUser() user: JwtUser) {
    return ok(this.activity.getStatus(user.clubId ?? ''));
  }

  @Get('agent-results')
  @ApiOperation({ summary: 'Kết quả công việc THẬT trong ngày của từng agent (theo CLB)' })
  async getAgentResults(@CurrentUser() user: JwtUser) {
    return ok(await this.results.getResults(user.clubId ?? ''));
  }

  @Get('maika-insights')
  @ApiOperation({ summary: 'Danh sách insight Maika (đọc toàn văn) — Nhật ký AI' })
  async getMaikaInsights(
    @CurrentUser() user: JwtUser,
    @Query('limit') limit?: string,
  ) {
    return ok(
      await this.results.listMaikaInsights(
        user.clubId ?? '',
        limit ? Number(limit) : undefined,
      ),
    );
  }

  @Get('lisa-messages')
  @ApiOperation({ summary: 'Lịch sử hỏi–đáp của Lisa — Nhật ký AI' })
  async getLisaMessages(
    @CurrentUser() user: JwtUser,
    @Query('limit') limit?: string,
  ) {
    return ok(
      await this.results.listLisaMessages(
        user.clubId ?? '',
        limit ? Number(limit) : undefined,
      ),
    );
  }
}
