/**
 * User Memory API (Sprint 2, Epic 2.2) — SHARED Desktop/Mobile/Maika/Lisa/Hermes.
 * Owner isolation: userId LẤY TỪ JWT principal; chỉ truy cập memory của chính mình.
 * Ba loại tách biệt: /profile, /preference, /behavior.
 */
import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserMemoryService } from './user-memory.service';
import { BehaviorDto, PreferenceDto, ProfileDto } from './user-memory.dto';
import { CurrentUser, type JwtUser } from '../../common/decorators';
import { ok } from '../../common/response';

@ApiTags('AI User Memory')
@ApiBearerAuth()
@Controller('user-memory')
export class UserMemoryController {
  constructor(private readonly userMemory: UserMemoryService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Đọc Profile Memory (scope clubId:userId từ JWT)' })
  async getProfile(@CurrentUser() user: JwtUser) {
    return ok(await this.userMemory.getProfile(user.clubId, user.userId));
  }

  @Put('profile')
  @ApiOperation({
    summary: 'Cập nhật Profile Memory (scope clubId:userId từ JWT)',
  })
  async putProfile(@Body() dto: ProfileDto, @CurrentUser() user: JwtUser) {
    return ok(await this.userMemory.saveProfile(user.clubId, user.userId, dto));
  }

  @Get('preference')
  @ApiOperation({
    summary: 'Đọc Preference Memory (scope clubId:userId từ JWT)',
  })
  async getPreference(@CurrentUser() user: JwtUser) {
    return ok(await this.userMemory.getPreference(user.clubId, user.userId));
  }

  @Put('preference')
  @ApiOperation({
    summary: 'Cập nhật Preference Memory (scope clubId:userId từ JWT)',
  })
  async putPreference(
    @Body() dto: PreferenceDto,
    @CurrentUser() user: JwtUser,
  ) {
    return ok(
      await this.userMemory.savePreference(user.clubId, user.userId, dto),
    );
  }

  @Get('behavior')
  @ApiOperation({ summary: 'Đọc Behavior Memory (scope clubId:userId từ JWT)' })
  async getBehavior(@CurrentUser() user: JwtUser) {
    return ok(await this.userMemory.getBehavior(user.clubId, user.userId));
  }

  @Put('behavior')
  @ApiOperation({
    summary: 'Cập nhật Behavior Memory (scope clubId:userId từ JWT)',
  })
  async putBehavior(@Body() dto: BehaviorDto, @CurrentUser() user: JwtUser) {
    return ok(
      await this.userMemory.saveBehavior(user.clubId, user.userId, dto),
    );
  }
}
