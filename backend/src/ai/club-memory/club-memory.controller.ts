/**
 * Club Memory API (Sprint 2, Epic 2.3) — SHARED Desktop/Mobile/Maika/Lisa/Hermes.
 * clubId LẤY TỪ JWT (no body override, no cross-club, no direct DB).
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClubMemoryService } from './club-memory.service';
import { CreateClubMemoryDto, UpdateClubMemoryDto } from './club-memory.dto';
import { CurrentUser, type JwtUser } from '../../common/decorators';
import { ok } from '../../common/response';

@ApiTags('AI Club Memory')
@ApiBearerAuth()
@Controller('club-memory')
export class ClubMemoryController {
  constructor(private readonly clubMemory: ClubMemoryService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo club memory (scope clubId từ JWT)' })
  async create(@Body() dto: CreateClubMemoryDto, @CurrentUser() user: JwtUser) {
    return ok(await this.clubMemory.save(user.clubId, user.userId, dto));
  }

  @Get()
  @ApiOperation({ summary: 'List club memory của club (JWT)' })
  async list(@CurrentUser() user: JwtUser) {
    return ok(await this.clubMemory.listByClub(user.clubId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Đọc club memory theo id (cùng club)' })
  async load(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return ok(await this.clubMemory.load(user.clubId, id));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật club memory (immutable, cùng club)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClubMemoryDto,
    @CurrentUser() user: JwtUser,
  ) {
    return ok(await this.clubMemory.update(user.clubId, user.userId, id, dto));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá club memory (cùng club)' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    const deleted = await this.clubMemory.delete(user.clubId, id);
    if (!deleted) throw new NotFoundException('Club memory không tồn tại');
    return ok({ deleted });
  }
}
