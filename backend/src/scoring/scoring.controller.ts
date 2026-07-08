/**
 * Scoring API (Chấm điểm thành viên động — Phase 2).
 * clubId LẤY TỪ JWT (không nhận qua body/query, không cross-club, không trực tiếp DB).
 */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ScoringService } from './scoring.service';
import {
  AddScoreEventDto,
  CreateScoringRuleDto,
  UpdateScoringRuleDto,
} from './scoring.dto';
import { CurrentUser, Roles, type JwtUser } from '../common/decorators';
import { ok } from '../common/response';

@ApiTags('Scoring')
@ApiBearerAuth()
@Controller('scoring')
export class ScoringController {
  constructor(private readonly scoring: ScoringService) {}

  /** Validate query month 'YYYY-MM' nếu truyền; trả về month hoặc kỳ hiện tại. */
  private resolveMonth(month?: string): string {
    if (month !== undefined && !/^\d{4}-\d{2}$/.test(month))
      throw new BadRequestException('Tháng phải có định dạng YYYY-MM');
    return month ?? this.scoring.currentPeriod();
  }

  // ── Thang điểm ──────────────────────────────────────────────────────────
  @Get('rules')
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  @ApiOperation({ summary: 'Danh sách quy tắc điểm của CLB' })
  async listRules(@CurrentUser() user: JwtUser) {
    return ok(await this.scoring.listRules(user.clubId as string));
  }

  @Post('rules')
  @Roles('CLUB_ADMIN')
  @ApiOperation({ summary: 'Tạo quy tắc điểm mới' })
  async createRule(
    @Body() dto: CreateScoringRuleDto,
    @CurrentUser() user: JwtUser,
  ) {
    return ok(await this.scoring.createRule(user.clubId as string, dto));
  }

  @Patch('rules/:id')
  @Roles('CLUB_ADMIN')
  @ApiOperation({ summary: 'Cập nhật quy tắc điểm' })
  async updateRule(
    @Param('id') id: string,
    @Body() dto: UpdateScoringRuleDto,
    @CurrentUser() user: JwtUser,
  ) {
    return ok(await this.scoring.updateRule(user.clubId as string, id, dto));
  }

  @Delete('rules/:id')
  @Roles('CLUB_ADMIN')
  @ApiOperation({ summary: 'Xóa quy tắc điểm' })
  async deleteRule(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return ok(await this.scoring.deleteRule(user.clubId as string, id));
  }

  // ── Bảng điểm ─────────────────────────────────────────────────────────────
  @Get('period')
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  @ApiOperation({ summary: 'Bảng điểm tháng của mọi thành viên active' })
  async period(@Query('month') month: string, @CurrentUser() user: JwtUser) {
    return ok(
      await this.scoring.getPeriodScores(
        user.clubId as string,
        this.resolveMonth(month),
      ),
    );
  }

  @Get('member/:memberId')
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  @ApiOperation({ summary: 'Chi tiết điểm 1 thành viên trong tháng' })
  async memberDetail(
    @Param('memberId') memberId: string,
    @Query('month') month: string,
    @CurrentUser() user: JwtUser,
  ) {
    return ok(
      await this.scoring.getMemberDetail(
        user.clubId as string,
        memberId,
        this.resolveMonth(month),
      ),
    );
  }

  // ── Sự kiện điểm thủ công ──────────────────────────────────────────────
  @Post('events')
  @Roles('CLUB_ADMIN')
  @ApiOperation({ summary: 'Thêm sự kiện cộng/trừ điểm thủ công' })
  async addEvent(@Body() dto: AddScoreEventDto, @CurrentUser() user: JwtUser) {
    return ok(
      await this.scoring.addManualEvent(user.clubId as string, dto, user.userId),
    );
  }

  @Delete('events/:id')
  @Roles('CLUB_ADMIN')
  @ApiOperation({ summary: 'Xóa sự kiện điểm' })
  async removeEvent(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return ok(await this.scoring.removeEvent(user.clubId as string, id));
  }

  // ── Chốt tháng ────────────────────────────────────────────────────────────
  @Post('finalize')
  @Roles('CLUB_ADMIN')
  @ApiOperation({ summary: 'Chốt điểm cuối tháng (snapshot)' })
  async finalize(@Query('month') month: string, @CurrentUser() user: JwtUser) {
    return ok(
      await this.scoring.finalizePeriod(
        user.clubId as string,
        this.resolveMonth(month),
        user.userId,
      ),
      'Đã chốt điểm tháng',
    );
  }

  // ── Backfill toàn nền tảng (SUPER_ADMIN) ──────────────────────────────
  @Post('seed-rules-all')
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary:
      'Backfill quy tắc điểm mặc định cho TOÀN BỘ CLB đang hoạt động (idempotent)',
  })
  async seedRulesAll() {
    return ok(
      await this.scoring.seedDefaultRulesForAllClubs(),
      'Đã backfill quy tắc điểm mặc định',
    );
  }
}
