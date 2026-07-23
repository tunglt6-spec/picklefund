import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HermesWorkflowService } from './hermes-workflow.service';
import { HermesSchedulerService } from './hermes-scheduler.service';
import { CurrentUser, Roles, type JwtUser } from '../common/decorators';
import { ok } from '../common/response';
import { AgentActivityService } from '../aido/agent-activity.service';
import {
  CreateWorkflowRuleDto,
  UpdateWorkflowRuleDto,
  TestTriggerDto,
  DispatchTestDto,
  SchedulerToggleDto,
} from './workflows.dto';

/**
 * Hermes Workflow Engine (Epic 5) — quản lý workflow rule + xem run.
 * clubId/role/userId LẤY TỪ JWT. Chỉ SUPER_ADMIN / CLUB_ADMIN. MEMBER_VIEW bị chặn
 * (RolesGuard + MemberScopeGuard). Mọi truy vấn scope theo clubId (tenant isolation).
 * Action operational LUÔN đi qua AI Action Center (không thực thi trực tiếp).
 */
@ApiTags('Hermes Workflows')
@ApiBearerAuth()
@Controller('workflows')
@Roles('SUPER_ADMIN', 'CLUB_ADMIN')
export class WorkflowsController {
  constructor(
    private svc: HermesWorkflowService,
    private scheduler: HermesSchedulerService,
    private activity: AgentActivityService,
  ) {}

  @Get('rules')
  @ApiOperation({ summary: 'Danh sách workflow rule (clubId từ JWT).' })
  async listRules(@CurrentUser() user: JwtUser) {
    return ok(await this.svc.listRules(user.clubId));
  }

  @Post('rules')
  @ApiOperation({ summary: 'Tạo workflow rule.' })
  async createRule(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateWorkflowRuleDto,
  ) {
    return ok(
      await this.svc.createRule(user.clubId, user.userId, dto),
      'Đã tạo rule',
    );
  }

  @Put('rules/:id')
  @ApiOperation({ summary: 'Cập nhật rule (bật/tắt qua enabled).' })
  async updateRule(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateWorkflowRuleDto,
  ) {
    return ok(
      await this.svc.updateRule(id, user.clubId, dto),
      'Đã cập nhật rule',
    );
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Xoá rule (run lịch sử được giữ lại).' })
  async deleteRule(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return ok(await this.svc.deleteRule(id, user.clubId), 'Đã xoá rule');
  }

  @Post('rules/:id/test-trigger')
  @ApiOperation({
    summary:
      'Test-trigger rule thủ công: đánh giá điều kiện, tạo AiAction qua Action Center nếu khớp (không thực thi trực tiếp).',
  })
  async testTrigger(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: TestTriggerDto,
  ) {
    return ok(
      await this.svc.testTrigger(
        id,
        user.clubId,
        { userId: user.userId, clubId: user.clubId },
        dto.contextJson,
      ),
      'Đã chạy test-trigger',
    );
  }

  @Post('triggers/:triggerType/dispatch-test')
  @ApiOperation({
    summary:
      'Dispatch-test runtime (Epic 6): đánh giá TẤT CẢ rule enabled của triggerType, ' +
      'tạo AiAction qua Action Center nếu khớp. Admin-only — KHÔNG phải scheduler/trigger production.',
  })
  async dispatchTest(
    @Param('triggerType') triggerType: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: DispatchTestDto,
  ) {
    return ok(
      await this.svc.dispatchTrigger(
        user.clubId,
        triggerType,
        { userId: user.userId, clubId: user.clubId },
        dto.contextJson,
        dto.idempotencyKey,
      ),
      'Đã dispatch-test',
    );
  }

  @Get('runtime/status')
  @ApiOperation({
    summary:
      'Trạng thái Scheduler Runtime (Epic 9) — enabled/interval/lastTick.',
  })
  runtimeStatus() {
    return ok(this.scheduler.status());
  }

  @Post('runtime/scheduler')
  // CÔNG TẮC HỆ THỐNG (ảnh hưởng MỌI CLB). Theo yêu cầu, mở cho CLUB_ADMIN (kế thừa @Roles
  // class-level SUPER_ADMIN/CLUB_ADMIN — KHÔNG giới hạn riêng SUPER_ADMIN nữa).
  @ApiOperation({
    summary:
      'Bật/tắt timer Scheduler (CÔNG TẮC HỆ THỐNG, lưu bền) — timer bật quét rule định kỳ của MỌI CLB.',
  })
  async setScheduler(@Body() dto: SchedulerToggleDto) {
    return ok(
      await this.scheduler.setEnabled(dto.enabled),
      dto.enabled ? 'Đã BẬT timer định kỳ' : 'Đã TẮT timer định kỳ',
    );
  }

  @Get('runtime/history')
  @ApiOperation({
    summary:
      'Run do scheduler dispatch (idempotencyKey SCHED:*, sanitized, clubId từ JWT).',
  })
  async runtimeHistory(@CurrentUser() user: JwtUser) {
    return ok(await this.scheduler.history(user.clubId));
  }

  @Post('runtime/run-now')
  @ApiOperation({
    summary:
      'Dispatch thủ công các rule scheduled của CLB (idempotent theo kỳ — kỳ đã chạy trả skippedDuplicate).',
  })
  async runtimeRunNow(@CurrentUser() user: JwtUser) {
    return ok(
      await this.activity.track(user.clubId, 'HERMES', 'Điều phối workflow', () =>
        this.scheduler.runNow(user.clubId, user.userId),
      ),
      'Đã run-now scheduler',
    );
  }

  @Post('triggers/:triggerType/dispatch-live')
  @ApiOperation({
    summary:
      'Dispatch dùng DỮ LIỆU THẬT của CLB (unpaidCount/upcomingSessions/periodFinalized ' +
      'tính từ DB) — để rule khớp thực tế + trả liveContext cho admin xem.',
  })
  async dispatchLive(
    @Param('triggerType') triggerType: string,
    @CurrentUser() user: JwtUser,
  ) {
    return ok(
      await this.activity.track(user.clubId, 'HERMES', 'Điều phối workflow', () =>
        this.svc.dispatchLive(user.clubId, triggerType, {
          userId: user.userId,
          clubId: user.clubId,
        }),
      ),
      'Đã chạy dispatch với dữ liệu thật',
    );
  }

  @Get('templates')
  @ApiOperation({ summary: 'Template workflow an toàn (read-only).' })
  templates() {
    return ok(this.svc.listTemplates());
  }

  @Get('runs')
  @ApiOperation({ summary: 'Danh sách workflow run (clubId từ JWT).' })
  async listRuns(
    @CurrentUser() user: JwtUser,
    @Query('status') status?: string,
    @Query('ruleId') ruleId?: string,
  ) {
    return ok(await this.svc.listRuns(user.clubId, { status, ruleId }));
  }

  @Get('runs/:id')
  @ApiOperation({ summary: 'Chi tiết workflow run.' })
  async findRun(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return ok(await this.svc.findRun(id, user.clubId));
  }
}
