import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsIn,
  IsArray,
  IsInt,
  IsBoolean,
  IsDateString,
  Min,
  MaxLength,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MinigameService } from './minigame.service';
import { MinigameDelegateGuard } from './minigame-delegate.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { ok } from '../common/response';
import { MinigameFormat } from '@prisma/client';
import { listSportPresets } from './sport-presets';

/** Payload user từ JWT (CurrentUser) — chỉ các field controller minigame dùng. */
interface RequestUser {
  clubId: string;
  userId: string;
  memberId: string | null;
  role: string;
}

class CreateMinigameDto {
  @IsString() @MaxLength(100) name!: string;
  @IsEnum([
    'GROUP_STAGE',
    'KNOCKOUT',
    'SINGLES',
    'RANDOM_DOUBLES',
    'FIXED_DOUBLES_ROUND_ROBIN',
  ])
  format!: MinigameFormat;
  // Đa bộ môn (Pha 0): tuỳ chọn, mặc định do DB đặt (PICKLEBALL/HEAD_TO_HEAD) → không phá luồng cũ.
  @IsOptional() @IsString() @MaxLength(30) sport?: string;
  @IsOptional() @IsIn(['HEAD_TO_HEAD', 'LEADERBOARD']) scoringModel?: string;
  // Loại VĐV: INDIVIDUAL | PAIR (đôi) | TEAM. Quyết định GROUP_STAGE/KNOCKOUT tạo đội-đơn hay cặp.
  @IsOptional() @IsIn(['INDIVIDUAL', 'PAIR', 'TEAM']) participantType?: string;
  @IsOptional() @IsIn(['FIXED', 'ROTATING', 'RANDOM']) partnerMode?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() settings?: Record<string, unknown>;
}

class UpdateMinigameDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() settings?: Record<string, unknown>;
}

class CreateTeamDto {
  @IsString() @MaxLength(60) name!: string;
  @IsString() player1Id!: string;
  @IsOptional() @IsString() player2Id?: string;
}

class GuestParticipantDto {
  @IsString() @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
}

class AddParticipantsDto {
  // Thành viên CLB thật — validate thuộc club ở service.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  memberIds?: string[];
  // Khách mời — KHÔNG thuộc CLB, KHÔNG tạo member; lưu name/phone (Minigame.settings.guests).
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => GuestParticipantDto)
  guests?: GuestParticipantDto[];
}

/** Đổi tên người chơi (chỉ khách mời) — settings.guests. */
class UpdateParticipantNameDto {
  @IsString() @MaxLength(120) name!: string;
}

/** Đội có roster (môn đồng đội): tên + danh sách member CLB + khách tự do. */
class RosterTeamDto {
  @IsString() @MaxLength(60) name!: string;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) memberIds?: string[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => GuestParticipantDto)
  guests?: GuestParticipantDto[];
}

class AddRosterDto {
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) memberIds?: string[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => GuestParticipantDto)
  guests?: GuestParticipantDto[];
}

class UpdateMatchScoreDto {
  @IsInt() @Min(0) scoreA!: number;
  @IsInt() @Min(0) scoreB!: number;
  // Ngày thi đấu (override playedAt tự set) + ghi chú trận — tùy chọn.
  @IsOptional() @IsDateString() playedAt?: string;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
  // M9: chi tiết set/tie-break (mảng {a,b} theo set). scoreA/scoreB = tổng hợp (số set thắng).
  @IsOptional() @IsArray() scoreDetail?: Array<{ a: number; b: number }>;
}

class GenerateScheduleDto {
  // true = sinh lịch LƯỢT ĐI & LƯỢT VỀ (double round-robin); mặc định 1 lượt.
  @IsOptional() @IsBoolean() doubleRoundRobin?: boolean;
}

// Golf (Pha 2): điểm gậy 1 golfer ở 1 vòng.
class GolfScoreDto {
  @IsInt() @Min(1) round!: number;
  @IsInt() @Min(1) strokes!: number;
}

class GroupDto {
  @IsString() id!: string;
  @IsString() @MaxLength(60) name!: string;
  @IsInt() order!: number;
  @IsOptional() @IsString() status?: string;
  @IsArray() @ArrayMaxSize(400) @IsString({ each: true }) memberKeys!: string[];
}

class SaveGroupsDto {
  @IsArray()
  @ArrayMaxSize(64)
  @ValidateNested({ each: true })
  @Type(() => GroupDto)
  groups!: GroupDto[];
}

@ApiTags('Minigame')
@ApiBearerAuth()
@Controller('minigames')
@UseGuards(MinigameDelegateGuard)
export class MinigameController {
  constructor(private svc: MinigameService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    return ok(await this.svc.findAll(user.clubId));
  }

  /** Sport Preset registry — nguồn tùy chọn cho wizard (môn/nội dung/thể thức/luật). Static route
   *  PHẢI đặt trước ':id' để không bị param bắt nhầm. Không cần scope club (config tĩnh). */
  @Get('sport-presets')
  sportPresets() {
    return ok(listSportPresets());
  }

  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return ok(await this.svc.findOne(id, user.clubId));
  }

  @Post()
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async create(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateMinigameDto,
  ) {
    return ok(
      await this.svc.create(user.clubId, user.userId, {
        ...body,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      }),
    );
  }

  @Put(':id')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() body: UpdateMinigameDto,
  ) {
    return ok(
      await this.svc.update(id, user.clubId, {
        ...body,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      }),
      'Đã cập nhật minigame',
    );
  }

  @Post(':id/participants')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async addParticipants(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() body: AddParticipantsDto,
  ) {
    return ok(
      await this.svc.addParticipants(
        id,
        user.clubId,
        body.memberIds ?? [],
        body.guests,
      ),
    );
  }

  // Xóa 1 người chơi (member: xóa participant; khách: bỏ khỏi settings.guests) — persist server.
  @Delete(':id/participants/:key')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async removeParticipant(
    @Param('id') id: string,
    @Param('key') key: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(
      await this.svc.removeParticipant(id, user.clubId, key),
      'Đã xóa người chơi',
    );
  }

  // Đổi tên người chơi (chỉ khách mời) — persist server.
  @Patch(':id/participants/:key')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async updateParticipant(
    @Param('id') id: string,
    @Param('key') key: string,
    @CurrentUser() user: RequestUser,
    @Body() body: UpdateParticipantNameDto,
  ) {
    return ok(
      await this.svc.updateParticipantName(id, user.clubId, key, body.name),
      'Đã cập nhật tên',
    );
  }

  // Hoàn thành/khóa 1 lượt (Đôi Ngẫu Nhiên) → settings.lockedRounds — persist server.
  @Post(':id/rounds/:roundNumber/lock')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async lockRound(
    @Param('id') id: string,
    @Param('roundNumber') roundNumber: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(
      await this.svc.lockRound(id, user.clubId, Number(roundNumber)),
      'Đã hoàn thành lượt',
    );
  }

  @Post(':id/generate-teams')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async generateTeams(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(await this.svc.generateTeams(id, user.clubId));
  }

  @Post(':id/generate-schedule')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async generateSchedule(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() body: GenerateScheduleDto,
  ) {
    return ok(
      await this.svc.generateSchedule(id, user.clubId, !!body?.doubleRoundRobin),
    );
  }

  // BÓNG ĐÁ (Pha 1c): sinh lịch vòng tròn giữa các đội roster.
  @Post(':id/football/schedule')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async generateFootballSchedule(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() body: GenerateScheduleDto,
  ) {
    return ok(
      await this.svc.generateFootballSchedule(
        id,
        user.clubId,
        !!body?.doubleRoundRobin,
      ),
      'Đã tạo lịch thi đấu',
    );
  }

  // BÓNG ĐÁ (Pha 1d): tạo nhánh loại trực tiếp (vòng 1).
  @Post(':id/football/knockout')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async generateKnockout(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(
      await this.svc.generateKnockout(id, user.clubId),
      'Đã tạo nhánh đấu',
    );
  }

  // BÓNG ĐÁ (Pha 1d): sinh vòng kế tiếp từ đội thắng vòng hiện tại.
  @Post(':id/football/knockout/advance')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async advanceKnockout(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(
      await this.svc.advanceKnockout(id, user.clubId),
      'Đã tạo vòng kế tiếp',
    );
  }

  // M3: KNOCKOUT TỔNG QUÁT (mọi môn — nhóm vợt/đơn/đội). Alias dùng chung engine đã tổng quát hóa;
  // nhóm vợt tự tạo đội-đơn từ người chơi. Route football/* giữ nguyên (backward-compat).
  @Post(':id/knockout')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async generateKnockoutGeneric(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(await this.svc.generateKnockout(id, user.clubId), 'Đã tạo nhánh đấu');
  }

  @Post(':id/knockout/advance')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async advanceKnockoutGeneric(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(await this.svc.advanceKnockout(id, user.clubId), 'Đã tạo vòng kế tiếp');
  }

  // M10: Double elimination — sinh nhánh loại kép (WB/LB/GF). Số đội = lũy thừa 2.
  @Post(':id/double-elimination')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async generateDoubleElim(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(await this.svc.generateDoubleElimination(id, user.clubId), 'Đã tạo nhánh loại kép');
  }

  // M7: Group → Knockout — lấy top-N mỗi bảng sinh nhánh loại trực tiếp trong cùng giải.
  @Post(':id/knockout-from-groups')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async knockoutFromGroups(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { topN?: number },
  ) {
    return ok(await this.svc.generateKnockoutFromGroups(id, user.clubId, body?.topN ?? 2), 'Đã tạo nhánh loại trực tiếp từ vòng bảng');
  }

  // ── GOLF (Pha 2) ──
  @Post(':id/golfers')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async addGolfers(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() body: AddRosterDto,
  ) {
    return ok(await this.svc.addGolfers(id, user.clubId, body), 'Đã thêm golfer');
  }

  @Delete('golfers/:golferId')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async removeGolfer(
    @Param('golferId') golferId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(await this.svc.removeGolfer(golferId, user.clubId), 'Đã xóa golfer');
  }

  @Patch('golfers/:golferId/score')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async golfScore(
    @Param('golferId') golferId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: GolfScoreDto,
  ) {
    return ok(
      await this.svc.upsertGolfScore(
        golferId,
        user.clubId,
        body.round,
        body.strokes,
      ),
      'Đã lưu điểm',
    );
  }

  // GROUP_STAGE: lưu lại cách chia bảng (sau khi kéo-chuyển người giữa các bảng).
  @Put(':id/groups')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async saveGroups(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() body: SaveGroupsDto,
  ) {
    return ok(
      await this.svc.saveGroups(id, user.clubId, body.groups),
      'Đã lưu bảng đấu',
    );
  }

  @Post(':id/draw-round')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async drawRound(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(await this.svc.drawRound(id, user.clubId), 'Đã bốc vòng mới');
  }

  // M6: Mexicano — bốc vòng mới ghép theo BXH (chỉ khi vòng trước đã đủ kết quả).
  @Post(':id/draw-round-mexicano')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async drawRoundMexicano(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(await this.svc.drawRoundMexicano(id, user.clubId), 'Đã bốc vòng Mexicano');
  }

  @Get(':id/player-standings')
  async playerStandings(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(await this.svc.getPlayerStandings(id, user.clubId));
  }

  @Post(':id/teams')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async createTeam(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() body: CreateTeamDto,
  ) {
    return ok(await this.svc.createTeam(id, user.clubId, body), 'Đã tạo đội');
  }

  // ── Đội có roster nhiều người (môn đồng đội, vd bóng đá) — Pha 1 ──
  @Post(':id/roster-teams')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async createRosterTeam(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() body: RosterTeamDto,
  ) {
    return ok(
      await this.svc.createRosterTeam(id, user.clubId, body),
      'Đã tạo đội',
    );
  }

  @Post('roster-teams/:teamId/members')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async addRosterMembers(
    @Param('teamId') teamId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: AddRosterDto,
  ) {
    return ok(
      await this.svc.addRosterMembers(teamId, user.clubId, body),
      'Đã thêm thành viên',
    );
  }

  @Delete('roster-members/:rosterMemberId')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async removeRosterMember(
    @Param('rosterMemberId') rosterMemberId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(
      await this.svc.removeRosterMember(rosterMemberId, user.clubId),
      'Đã xóa thành viên',
    );
  }

  @Delete(':id/teams/:teamId')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async deleteTeam(
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(await this.svc.deleteTeam(id, teamId, user.clubId), 'Đã xóa đội');
  }

  @Delete(':id/schedule')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async clearSchedule(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(
      await this.svc.clearSchedule(id, user.clubId),
      'Đã xóa lịch thi đấu',
    );
  }

  @Post(':id/start')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async start(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return ok(await this.svc.startMinigame(id, user.clubId));
  }

  @Patch('matches/:matchId/score')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async score(
    @Param('matchId') matchId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: UpdateMatchScoreDto,
  ) {
    return ok(
      await this.svc.updateMatchScore(matchId, user.clubId, body.scoreA, body.scoreB, {
        playedAt: body.playedAt,
        note: body.note,
        scoreDetail: body.scoreDetail,
      }),
    );
  }

  // Xóa kết quả 1 trận (reset điểm + đảo thống kê đội) — persist server để refresh không hiện lại.
  @Delete('matches/:matchId/score')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async clearScore(
    @Param('matchId') matchId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(
      await this.svc.clearMatchScore(matchId, user.clubId),
      'Đã xóa kết quả trận đấu',
    );
  }

  // Xóa hẳn 1 trận khỏi lịch (đảo thống kê nếu đã có kết quả) — persist server.
  @Delete('matches/:matchId')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async deleteMatch(
    @Param('matchId') matchId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(
      await this.svc.deleteMatch(matchId, user.clubId),
      'Đã xóa trận đấu',
    );
  }

  @Post(':id/end')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async end(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return ok(await this.svc.endMinigame(id, user.clubId));
  }

  @Post(':id/cancel')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async cancel(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return ok(await this.svc.cancel(id, user.clubId));
  }

  @Delete(':id')
  @Roles('CLUB_ADMIN', 'MEMBER_VIEW')
  async remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return ok(await this.svc.remove(id, user.clubId), 'Đã xóa giải đấu');
  }
}
