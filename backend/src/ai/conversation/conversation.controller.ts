/**
 * Conversation API (Sprint 2, Epic 2.2) — SHARED Desktop/Mobile/Maika/Lisa/Hermes.
 * Tenant + owner isolation: conversation thuộc (clubId, userId) từ JWT.
 * KHÔNG cross-club, KHÔNG cross-user (trừ SUPER_ADMIN, có kiểm thử).
 */
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConversationService } from './conversation.service';
import { ConversationContextBuilder } from './conversation.context-builder';
import { CreateConversationDto, AppendMessageDto } from './conversation.dto';
import { Conversation } from './conversation.types';
import { CurrentUser, type JwtUser } from '../../common/decorators';
import { ok } from '../../common/response';

@ApiTags('AI Conversation')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationController {
  constructor(
    private readonly conversations: ConversationService,
    private readonly contextBuilder: ConversationContextBuilder,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo conversation (owner = JWT club+user)' })
  async create(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: JwtUser,
  ) {
    return ok(
      await this.conversations.createConversation({
        clubId: user.clubId,
        userId: user.userId,
        title: dto.title ?? null,
        systemPrompt: dto.systemPrompt,
      }),
    );
  }

  @Get()
  @ApiOperation({ summary: 'List conversation của chính user trong club' })
  async list(@CurrentUser() user: JwtUser) {
    return ok(await this.conversations.listByOwner(user.clubId, user.userId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Đọc conversation theo id' })
  async load(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    const conv = await this.requireOwned(id, user);
    return ok(conv);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Append message vào conversation' })
  async append(
    @Param('id') id: string,
    @Body() dto: AppendMessageDto,
    @CurrentUser() user: JwtUser,
  ) {
    await this.requireOwned(id, user);
    return ok(
      await this.conversations.appendMessage(id, {
        role: dto.role,
        content: dto.content,
        metadata: dto.metadata,
      }),
    );
  }

  @Post(':id/summarize')
  @ApiOperation({ summary: 'Tóm tắt conversation (deterministic, không LLM)' })
  async summarize(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    await this.requireOwned(id, user);
    return ok(await this.conversations.summarizeConversation(id));
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive conversation (chỉ đổi trạng thái)' })
  async archive(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    await this.requireOwned(id, user);
    return ok(await this.conversations.archiveConversation(id));
  }

  @Get(':id/context')
  @ApiOperation({ summary: 'Lắp ráp context (history + user memory, trimmed)' })
  async context(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    const conv = await this.requireOwned(id, user);
    return ok(await this.contextBuilder.build(conv, user.userId));
  }

  // ── owner isolation ───────────────────────────────────────────────────────

  private async requireOwned(id: string, user: JwtUser): Promise<Conversation> {
    const conv = await this.conversations.loadConversation(id);
    if (!conv) throw new NotFoundException('Conversation không tồn tại');
    this.assertAccess(user, conv);
    return conv;
  }

  private assertAccess(user: JwtUser, conv: Conversation): void {
    if (user.role === 'SUPER_ADMIN') return;
    // Không cross-user và không cross-club.
    if (conv.userId === user.userId && conv.clubId === user.clubId) return;
    throw new ForbiddenException('Không có quyền với conversation này');
  }
}
