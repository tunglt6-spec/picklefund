/**
 * ConversationContextBuilder (Sprint 2, Epic 2.2).
 *
 * Conversation → Load History → Load User Memory → Merge → Trim → Return Context.
 * KHÔNG Semantic Search, KHÔNG Embedding, KHÔNG Vector Store.
 */
import { Injectable } from '@nestjs/common';
import { ContextWindowManager } from './conversation.context-window';
import { Conversation, ConversationMessage } from './conversation.types';
import { UserMemoryService } from '../user-memory/user-memory.service';
import {
  PreferenceMemory,
  ProfileMemory,
} from '../user-memory/user-memory.types';

export interface AssembledContext {
  conversationId: string;
  messages: ConversationMessage[];
  tokensUsed: number;
  userProfile: ProfileMemory | null;
  userPreference: PreferenceMemory | null;
}

@Injectable()
export class ConversationContextBuilder {
  constructor(
    private readonly userMemory: UserMemoryService,
    private readonly contextWindow: ContextWindowManager,
  ) {}

  /**
   * Lắp ráp context cho một conversation đã được kiểm tra quyền truy cập.
   * Merge lịch sử (đã trim) + User Memory (profile/preference) của userId.
   */
  async build(
    conversation: Conversation,
    userId: string,
  ): Promise<AssembledContext> {
    const trimmed = this.contextWindow.trim(conversation.messages);
    // User Memory scope theo tenant (clubId:userId). Conversation không gắn club
    // → bỏ qua User Memory (không có tenant context).
    const [userProfile, userPreference] = conversation.clubId
      ? await Promise.all([
          this.userMemory.getProfile(conversation.clubId, userId),
          this.userMemory.getPreference(conversation.clubId, userId),
        ])
      : [null, null];
    return {
      conversationId: conversation.conversationId,
      messages: trimmed,
      tokensUsed: this.contextWindow.countTokens(trimmed),
      userProfile,
      userPreference,
    };
  }
}
