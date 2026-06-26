import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsInt, IsDateString, Min, MaxLength, ArrayMaxSize } from 'class-validator';
import { MinigameService } from './minigame.service';
import { CurrentUser} from '../common/decorators';
import { ok } from '../common/response';
import { MinigameFormat } from '@prisma/client';

class CreateMinigameDto {
  @IsString() @MaxLength(100) name!: string;
  @IsEnum(['GROUP_STAGE', 'KNOCKOUT', 'ROUND_ROBIN', 'RANDOM_DOUBLES', 'FIXED_DOUBLES']) format!: MinigameFormat;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() settings?: Record<string, unknown>;
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
  async addParticipants(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: AddParticipantsDto,
  ) {
    return ok(await this.svc.addParticipants(id, user.clubId, body.memberIds));
  }

  @Post(':id/generate-teams')
  async generateTeams(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.svc.generateTeams(id, user.clubId));
  }

  @Post(':id/generate-schedule')
  async generateSchedule(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.svc.generateSchedule(id, user.clubId));
  }

  @Post(':id/start')
  async start(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.svc.startMinigame(id, user.clubId));
  }

  @Patch('matches/:matchId/score')
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
  async end(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.svc.endMinigame(id, user.clubId));
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.svc.cancel(id, user.clubId));
  }
}
