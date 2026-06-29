/**
 * Memory API (Sprint 2, Epic 2.1) — SHARED endpoint cho Desktop, Mobile,
 * Maika, Lisa, Hermes. Không tạo API riêng cho từng consumer.
 *
 * Controller mỏng: không chứa business logic; chỉ resolve scope từ JWT principal,
 * enforce access (tenant isolation) và uỷ quyền cho MemoryManager.
 */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MemoryManager } from './memory.service';
import { CreateMemoryDto, UpdateMemoryDto } from './memory.dto';
import { MemoryObject, MemoryOwnerType, MemoryType } from './memory.types';
import { MemoryQuery } from './memory.interfaces';
import { CurrentUser, type JwtUser } from '../../common/decorators';
import { ok } from '../../common/response';

@ApiTags('AI Memory')
@ApiBearerAuth()
@Controller('memory')
export class MemoryController {
  constructor(private readonly memory: MemoryManager) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo memory (shared Desktop/Mobile/Maika/Lisa/Hermes)',
  })
  async create(@Body() dto: CreateMemoryDto, @CurrentUser() user: JwtUser) {
    const ownerType = dto.ownerType ?? MemoryOwnerType.USER;
    const ownerId = this.resolveOwnerId(ownerType, dto, user);
    const created = await this.memory.save({
      ownerType,
      ownerId,
      memoryType: dto.memoryType,
      content: dto.content,
      tags: dto.tags,
      ttl: dto.ttl,
      metadata: dto.metadata,
    });
    return ok(created);
  }

  @Get()
  @ApiOperation({ summary: 'List / filter memory theo scope của principal' })
  async list(
    @CurrentUser() user: JwtUser,
    @Query('ownerType') ownerType?: MemoryOwnerType,
    @Query('memoryType') memoryType?: MemoryType,
    @Query('tags') tags?: string,
    @Query('q') q?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const query: MemoryQuery = {
      memoryType,
      tags: tags
        ? tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
      text: q,
    };
    this.scopeQuery(query, ownerType, user, sessionId);
    return ok(await this.memory.list(query));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Đọc một memory theo id' })
  async load(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    const obj = await this.memory.load(id);
    if (!obj) return ok(null);
    this.assertAccess(user, obj);
    return ok(obj);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật memory (tạo bản immutable mới)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMemoryDto,
    @CurrentUser() user: JwtUser,
  ) {
    const existing = await this.memory.load(id);
    if (!existing) throw new ForbiddenException('Memory không tồn tại');
    this.assertAccess(user, existing);
    const updated = await this.memory.update(id, {
      content: dto.content,
      tags: dto.tags,
      ttl: dto.ttl,
      metadata: dto.metadata,
    });
    return ok(updated);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá memory theo id' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    const existing = await this.memory.load(id);
    if (existing) this.assertAccess(user, existing);
    return ok({ deleted: await this.memory.delete(id) });
  }

  // ── helpers (scope/isolation — không phải business logic) ─────────────────

  private resolveOwnerId(
    ownerType: MemoryOwnerType,
    dto: CreateMemoryDto,
    user: JwtUser,
  ): string {
    switch (ownerType) {
      case MemoryOwnerType.USER:
        return user.userId;
      case MemoryOwnerType.CLUB:
        if (!user.clubId)
          throw new BadRequestException('Tài khoản chưa gắn CLB');
        return user.clubId;
      case MemoryOwnerType.SESSION:
        if (!dto.sessionId)
          throw new BadRequestException(
            'sessionId bắt buộc cho ownerType=SESSION',
          );
        // SESSION ownership = composite key đã xác minh từ JWT (club:user:session),
        // bảo đảm user/club khác KHÔNG truy cập được session memory của nhau.
        return this.sessionOwnerId(user, dto.sessionId);
      case MemoryOwnerType.SYSTEM:
        if (user.role !== 'SUPER_ADMIN')
          throw new ForbiddenException('Chỉ SUPER_ADMIN tạo SYSTEM memory');
        return 'system';
    }
  }

  /** Composite key cho SESSION memory — nhất quán ở create/load/update/delete/list. */
  private sessionOwnerId(user: JwtUser, sessionId: string): string {
    const clubPart = user.clubId ?? 'none';
    return `${clubPart}:${user.userId}:${sessionId}`;
  }

  /** Prefix `${club}:${user}:` để kiểm tra quyền sở hữu SESSION (cùng user + club). */
  private sessionOwnerPrefix(user: JwtUser): string {
    const clubPart = user.clubId ?? 'none';
    return `${clubPart}:${user.userId}:`;
  }

  private scopeQuery(
    query: MemoryQuery,
    ownerType: MemoryOwnerType | undefined,
    user: JwtUser,
    sessionId?: string,
  ): void {
    if (user.role === 'SUPER_ADMIN') {
      query.ownerType = ownerType;
      return;
    }
    // Không phải super-admin: ép về scope của chính mình.
    if (ownerType === MemoryOwnerType.CLUB) {
      if (!user.clubId) throw new ForbiddenException('Tài khoản chưa gắn CLB');
      query.ownerType = MemoryOwnerType.CLUB;
      query.ownerId = user.clubId;
    } else if (ownerType === MemoryOwnerType.SESSION) {
      if (!sessionId)
        throw new BadRequestException(
          'sessionId bắt buộc để list SESSION memory',
        );
      query.ownerType = MemoryOwnerType.SESSION;
      query.ownerId = this.sessionOwnerId(user, sessionId);
    } else {
      query.ownerType = MemoryOwnerType.USER;
      query.ownerId = user.userId;
    }
  }

  private assertAccess(user: JwtUser, obj: MemoryObject): void {
    if (user.role === 'SUPER_ADMIN') return;
    if (obj.ownerType === MemoryOwnerType.USER && obj.ownerId === user.userId)
      return;
    if (obj.ownerType === MemoryOwnerType.CLUB && obj.ownerId === user.clubId)
      return;
    // SESSION: chỉ owner (cùng club + user) mới được truy cập — KHÔNG public.
    if (
      obj.ownerType === MemoryOwnerType.SESSION &&
      obj.ownerId.startsWith(this.sessionOwnerPrefix(user))
    )
      return;
    throw new ForbiddenException('Không có quyền với memory này');
  }
}
