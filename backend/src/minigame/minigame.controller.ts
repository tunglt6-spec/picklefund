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

class UpdateMatchScoreDto {
  @IsInt() @Min(0) scoreA!: number;
  @IsInt() @Min(0) scoreB!: number;
}

class GenerateScheduleDto {
  // true = sinh lịch LƯỢT ĐI & LƯỢT VỀ (double round-robin); mặc định 1 lượt.
  @IsOptional() @IsBoolean() doubleRoundRobin?: boolean;
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
      await this.svc.updateMatchScore(
        matchId,
        user.clubId,
        body.scoreA,
        body.scoreB,
      ),
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
