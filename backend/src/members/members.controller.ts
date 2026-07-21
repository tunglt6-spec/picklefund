import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { MembersService } from './members.service';
import { CurrentUser, Roles, type JwtUser } from '../common/decorators';
import { ok } from '../common/response';
import { CreateMemberDto, UpdateMemberDto } from './members.dto';

@SkipThrottle()
@ApiTags('Members')
@ApiBearerAuth()
@Controller('members')
export class MembersController {
  constructor(private members: MembersService) {}

  @Get()
  async findAll(@CurrentUser() user: any, @Query('search') search?: string) {
    return ok(await this.members.findAll(user.clubId, search));
  }

  // Đặt TRƯỚC @Get(':id') để không bị route ':id' nuốt.
  @Get('ai-rating')
  async aiRating(@CurrentUser() user: JwtUser) {
    return ok(await this.members.aiRating(user.clubId ?? ''));
  }

  // Tài chính theo từng thành viên (Option 3) — đặt TRƯỚC ':id'.
  @Get('finance')
  async finance(
    @CurrentUser() user: any,
    @Query('fundPeriodId') fundPeriodId?: string,
  ) {
    return ok(await this.members.finance(user.clubId, fundPeriodId));
  }

  @Post()
  @Roles('CLUB_ADMIN')
  async create(@CurrentUser() user: any, @Body() body: CreateMemberDto) {
    return ok(
      await this.members.create(user.clubId, body),
      'Thêm thành viên thành công',
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.members.findOne(id, user.clubId));
  }

  // Lịch sử đóng góp của 1 thành viên (Option 3).
  @Get(':id/contributions')
  async memberContributions(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    return ok(
      await this.members.memberContributions(
        id,
        user.clubId,
        limit ? Number(limit) : undefined,
      ),
    );
  }

  @Put(':id')
  @Roles('CLUB_ADMIN')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: UpdateMemberDto,
  ) {
    return ok(await this.members.update(id, user.clubId, body));
  }

  @Delete(':id')
  @Roles('CLUB_ADMIN')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.members.remove(id, user.clubId), 'Đã xóa thành viên');
  }
}
