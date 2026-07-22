import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, Roles, type JwtUser } from '../common/decorators';
import { ok } from '../common/response';
import { AgentActivityService } from './agent-activity.service';
import { AgentResultsService } from './agent-results.service';
import { intQuery } from '../common/query';

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

  /**
   * Văn phòng AI cho MỌI vai trong CLB (kể cả MEMBER_VIEW) — READ-ONLY, chỉ số liệu
   * tổng hợp không nhạy cảm (hoạt động agent + kết quả hôm nay). Mở method-level để
   * member đồng bộ Office View với admin mà KHÔNG mở các endpoint quản trị khác
   * (nhớ allowlist '/aido/member-office' trong MemberScopeGuard).
   */
  @Get('member-office')
  @Roles('SUPER_ADMIN', 'CLUB_ADMIN', 'CLUB_TREASURER', 'MEMBER_VIEW')
  @ApiOperation({ summary: 'Văn phòng AI (read-only cho thành viên): hoạt động + kết quả hôm nay' })
  async getMemberOffice(@CurrentUser() user: JwtUser) {
    const clubId = user.clubId ?? '';
    const results = await this.results.getResults(clubId);
    return ok({ activity: this.activity.getStatus(clubId), results });
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
        intQuery(limit),
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
        intQuery(limit),
      ),
    );
  }
}
