import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiActionsService, type ActionActor } from './ai-actions.service';
import { CurrentUser, Roles, type JwtUser } from '../common/decorators';
import { ok, paginated } from '../common/response';
import { CreateAiActionDto, RejectAiActionDto } from './ai-actions.dto';

/**
 * AI Action Center (Epic 4.2) — hàng đợi hành động AI + phê duyệt.
 * clubId/role/userId LẤY TỪ JWT. Chỉ SUPER_ADMIN / CLUB_ADMIN. MEMBER_VIEW bị chặn
 * (RolesGuard + MemberScopeGuard). Tenant isolation: mọi truy vấn scope theo clubId.
 */
@ApiTags('AI Action Queue')
@ApiBearerAuth()
@Controller('ai/actions')
@Roles('SUPER_ADMIN', 'CLUB_ADMIN')
export class AiActionsController {
  constructor(private svc: AiActionsService) {}

  private actor(user: JwtUser): ActionActor {
    return {
      userId: user.userId,
      clubId: user.clubId,
      username: user.username,
      role: user.role,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Danh sách hành động AI (lọc + phân trang). clubId từ JWT.',
  })
  async list(
    @CurrentUser() user: JwtUser,
    @Query('status') status?: string,
    @Query('requestedByAi') requestedByAi?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('targetModule') targetModule?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const r = await this.svc.list(user.clubId, {
      status,
      requestedByAi,
      riskLevel,
      targetModule,
      from,
      to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return paginated(r.items, r.total, r.page, r.limit);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'KPI tổng hợp AI Manager (dữ liệu DB thật). clubId từ JWT.',
  })
  async summary(@CurrentUser() user: JwtUser) {
    return ok(await this.svc.summary(user.clubId));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Chi tiết hành động + lịch sử sự kiện. clubId từ JWT.',
  })
  async detail(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return ok(await this.svc.findOne(id, user.clubId));
  }

  @Post()
  @ApiOperation({
    summary:
      'Tạo yêu cầu hành động AI (đánh giá policy, KHÔNG execute nếu cần duyệt).',
  })
  async create(@CurrentUser() user: JwtUser, @Body() dto: CreateAiActionDto) {
    return ok(
      await this.svc.create(user.clubId, user.userId, dto),
      'Đã tạo yêu cầu hành động',
    );
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Duyệt hành động đang chờ. Ghi audit + sự kiện.' })
  async approve(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return ok(
      await this.svc.approve(id, user.clubId, this.actor(user)),
      'Đã duyệt',
    );
  }

  @Post(':id/reject')
  @ApiOperation({
    summary:
      'Từ chối hành động đang chờ (lý do tuỳ chọn). Ghi audit + sự kiện.',
  })
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: RejectAiActionDto,
  ) {
    return ok(
      await this.svc.reject(id, user.clubId, this.actor(user), dto.reason),
      'Đã từ chối',
    );
  }

  @Post(':id/retry')
  @ApiOperation({
    summary:
      'Chạy lại hành động đã thất bại. Tăng retryCount, ghi audit + sự kiện.',
  })
  async retry(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return ok(
      await this.svc.retry(id, user.clubId, this.actor(user)),
      'Đã yêu cầu chạy lại',
    );
  }

  @Post(':id/execute')
  @ApiOperation({
    summary:
      'Execution Bridge (Mít Đặc) — thực thi 1 hành động ĐÃ DUYỆT (APPROVED → EXECUTING → EXECUTED/FAILED).',
  })
  async execute(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return ok(
      await this.svc.execute(id, user.clubId, this.actor(user)),
      'Đã thực thi',
    );
  }
}
