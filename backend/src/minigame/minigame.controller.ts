import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsInt, IsDateString, Min, MaxLength, ArrayMaxSize } from 'class-validator';
import { MinigameService } from './minigame.service';
import { CurrentUser, Roles } from '../common/decorators';
import { ok } from '../common/response';
import { MinigameFormat } from '@prisma/client';

class CreateMinigameDto {
  @IsString() @MaxLength(100) name!: string;
  @IsEnum(['GROUP_STAGE', 'KNOCKOUT', 'SINGLES', 'RANDOM_DOUBLES', 'FIXED_DOUBLES_ROUND_ROBIN']) format!: MinigameFormat;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() settings?: Record<string, unknown>;
}

class CreateTeamDto {
  @IsString() @MaxLength(60) name!: string;
  @IsString() player1Id!: string;
  @IsOptional() @IsString() player2Id?: string;
}

class AddParticipantsDto {
  @IsArray() @ArrayMaxSize(200) @IsString({ each: true }) memberIds!: string[];
}

class UpdateMatchScoreDto {
  @IsInt() @Min(0) scoreA!: number;
  @IsInt() @Min(0) scoreB!: number;
}

@ApiTags('Minigame')
@ApiBearerAuth()
@Controller('minigames')
export class MinigameController {
  constructor(private svc: MinigameService) {}

  @Get()
  async list(@CurrentUser() user: any) {
    return ok(await this.svc.findAll(user.clubId));
  }

  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.svc.findOne(id, user.clubId));
  }

  @Post()
  @Roles('CLUB_ADMIN')
  async create(
    @CurrentUser() user: any,
    @Body() body: CreateMinigameDto,
  ) {
    return ok(
      await this.svc.create(user.clubId, user.userId, {
        ...body,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      }),
    );
  }

  @Post(':id/participants')
  @Roles('CLUB_ADMIN')
  async addParticipants(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: AddParticipantsDto,
  ) {
    return ok(await this.svc.addParticipants(id, user.clubId, body.memberIds));
  }

  @Post(':id/generate-teams')
  @Roles('CLUB_ADMIN')
  async generateTeams(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.svc.generateTeams(id, user.clubId));
  }

  @Post(':id/generate-schedule')
  @Roles('CLUB_ADMIN')
  async generateSchedule(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.svc.generateSchedule(id, user.clubId));
  }

  @Post(':id/teams')
  @Roles('CLUB_ADMIN')
  async createTeam(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: CreateTeamDto,
  ) {
    return ok(await this.svc.createTeam(id, user.clubId, body), 'Đã tạo đội');
  }

  @Delete(':id/teams/:teamId')
  @Roles('CLUB_ADMIN')
  async deleteTeam(
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @CurrentUser() user: any,
  ) {
    return ok(await this.svc.deleteTeam(id, teamId, user.clubId), 'Đã xóa đội');
  }

  @Delete(':id/schedule')
  @Roles('CLUB_ADMIN')
  async clearSchedule(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.svc.clearSchedule(id, user.clubId), 'Đã xóa lịch thi đấu');
  }

  @Post(':id/start')
  @Roles('CLUB_ADMIN')
  async start(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.svc.startMinigame(id, user.clubId));
  }

  @Patch('matches/:matchId/score')
  @Roles('CLUB_ADMIN')
  async score(
    @Param('matchId') matchId: string,
    @CurrentUser() user: any,
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
  @Roles('CLUB_ADMIN')
  async end(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.svc.endMinigame(id, user.clubId));
  }

  @Post(':id/cancel')
  @Roles('CLUB_ADMIN')
  async cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.svc.cancel(id, user.clubId));
  }
}
