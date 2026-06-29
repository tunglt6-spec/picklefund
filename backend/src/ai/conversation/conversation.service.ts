/**
 * ConversationService (Sprint 2, Epic 2.2) — vòng đời Conversation + Messages.
 *
 * - Message IMMUTABLE; append/summarize/archive tạo object mới (không mutate).
 * - Deep clone + deep freeze (tái dùng deepFreeze của Memory Core — chỉ import).
 * - KHÔNG embedding/semantic/vector. KHÔNG cache số liệu tài chính.
 * - Config từ ConfigService (.env), không hardcode.
 */
import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { deepFreeze } from '../memory/memory.types';
import {
  AppendMessageInput,
  CONVERSATION_REPOSITORY,
  CreateConversationInput,
} from './conversation.interfaces';
import type { IConversationRepository } from './conversation.interfaces';
import {
  Conversation,
  ConversationMessage,
  ConversationStatus,
  MessageRole,
  estimateTokens,
} from './conversation.types';

@Injectable()
export class ConversationService {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly repo: IConversationRepository,
  ) {}

  async createConversation(
    input: CreateConversationInput,
  ): Promise<Conversation> {
    const now = new Date();
    const conversationId = randomUUID();
    const messages: ConversationMessage[] = [];
    if (input.systemPrompt) {
      messages.push(
        this.buildMessage(
          conversationId,
          MessageRole.SYSTEM,
          input.systemPrompt,
          {},
        ),
      );
    }
    const conversation = this.freeze({
      conversationId,
      clubId: input.clubId,
      userId: input.userId,
      title: input.title ?? null,
      status: ConversationStatus.ACTIVE,
      summary: null,
      createdAt: now,
      updatedAt: now,
      messages,
    });
    return this.repo.create(conversation);
  }

  loadConversation(conversationId: string): Promise<Conversation | null> {
    return this.repo.findById(conversationId);
  }

  listByOwner(clubId: string | null, userId: string): Promise<Conversation[]> {
    return this.repo.listByOwner(clubId, userId);
  }

  async appendMessage(
    conversationId: string,
    input: AppendMessageInput,
  ): Promise<Conversation> {
    const existing = await this.requireConversation(conversationId);
    if (existing.status === ConversationStatus.ARCHIVED) {
      throw new BadRequestException(
        'Conversation đã archive, không thể thêm message',
      );
    }
    const message = this.buildMessage(
      conversationId,
      input.role,
      input.content,
      input.metadata ?? {},
    );
    // Immutable: tạo conversation mới với mảng messages mới (không mutate cũ).
    return this.repo.replace(
      this.freeze({
        ...this.plain(existing),
        messages: [...existing.messages, message],
        updatedAt: new Date(),
      }),
    );
  }

  /**
   * Tóm tắt deterministic (KHÔNG dùng LLM/embedding — LLM summarization deferred).
   * Tạo summary từ số lượng message + trích đoạn message cuối.
   */
  async summarizeConversation(conversationId: string): Promise<Conversation> {
    const existing = await this.requireConversation(conversationId);
    const last = existing.messages[existing.messages.length - 1];
    const snippet = last ? last.content.slice(0, 200) : '';
    const summary = `Conversation gồm ${existing.messages.length} message. Message cuối (${last?.role ?? 'NONE'}): ${snippet}`;
    return this.repo.replace(
      this.freeze({
        ...this.plain(existing),
        summary,
        updatedAt: new Date(),
      }),
    );
  }

  /** Archive chỉ đổi trạng thái — KHÔNG xoá. */
  async archiveConversation(conversationId: string): Promise<Conversation> {
    const existing = await this.requireConversation(conversationId);
    return this.repo.replace(
      this.freeze({
        ...this.plain(existing),
        status: ConversationStatus.ARCHIVED,
        updatedAt: new Date(),
      }),
    );
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private async requireConversation(id: string): Promise<Conversation> {
    const c = await this.repo.findById(id);
    if (!c) throw new NotFoundException('Conversation không tồn tại');
    return c;
  }

  private buildMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    metadata: Record<string, unknown>,
  ): ConversationMessage {
    return this.freeze({
      messageId: randomUUID(),
      conversationId,
      role,
      content,
      timestamp: new Date(),
      metadata: structuredClone(metadata),
      tokenCount: estimateTokens(content),
    });
  }

  /** Bản sao "phẳng" các field bất biến (để dựng object mới khi update). */
  private plain(c: Conversation): Conversation {
    return {
      conversationId: c.conversationId,
      clubId: c.clubId,
      userId: c.userId,
      title: c.title,
      status: c.status,
      summary: c.summary,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messages: c.messages,
    };
  }

  private freeze<T>(value: T): T {
    return deepFreeze(value);
  }
}
