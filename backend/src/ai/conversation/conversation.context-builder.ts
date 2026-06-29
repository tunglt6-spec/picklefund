/**
 * ConversationContextBuilder (Sprint 2, Epic 2.2 → mở rộng Epic 2.3).
 *
 * Conversation → Load History → Load User Memory → (Epic 2.3) Club Memory Retrieval
 * → Merge → Trim → Return Context.
 * Tích hợp Club Memory là ADDITIVE: không thay đổi Conversation/User Memory logic.
 * RetrievalEngine là dependency TÙY CHỌN (@Optional) — vắng mặt thì hành vi như Epic 2.2.
 * KHÔNG Embedding, KHÔNG Vector Store (retrieval deterministic).
 */
import { Injectable, Optional } from '@nestjs/common';
import { ContextWindowManager } from './conversation.context-window';
import {
  Conversation,
  ConversationMessage,
  MessageRole,
} from './conversation.types';
import { UserMemoryService } from '../user-memory/user-memory.service';
import {
  PreferenceMemory,
  ProfileMemory,
} from '../user-memory/user-memory.types';
import { RetrievalEngine } from '../retrieval/retrieval.service';
import { RetrievalMatch } from '../retrieval/retrieval.types';

export interface AssembledContext {
  conversationId: string;
  messages: ConversationMessage[];
  tokensUsed: number;
  userProfile: ProfileMemory | null;
  userPreference: PreferenceMemory | null;
  /** Epic 2.3: Club Memory retrieval source (deterministic, không semantic). */
  clubMemory: RetrievalMatch[];
}

@Injectable()
export class ConversationContextBuilder {
  constructor(
    private readonly userMemory: UserMemoryService,
    private readonly contextWindow: ContextWindowManager,
    @Optional() private readonly retrieval?: RetrievalEngine,
  ) {}

  /**
   * Lắp ráp context cho một conversation đã được kiểm tra quyền truy cập.
   * Merge lịch sử (đã trim) + User Memory + (Epic 2.3) Club Memory Retrieval.
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

    // Epic 2.3 (additive): Club Memory retrieval theo nội dung message user gần nhất.
    const clubMemory = await this.retrieveClubMemory(conversation);

    return {
      conversationId: conversation.conversationId,
      messages: trimmed,
      tokensUsed: this.contextWindow.countTokens(trimmed),
      userProfile,
      userPreference,
      clubMemory,
    };
  }

  private async retrieveClubMemory(
    conversation: Conversation,
  ): Promise<RetrievalMatch[]> {
    if (!this.retrieval || !conversation.clubId) return [];
    const lastUser = [...conversation.messages]
      .reverse()
      .find((m) => m.role === MessageRole.USER);
    if (!lastUser) return [];
    return this.retrieval.retrieve(conversation.clubId, {
      text: lastUser.content,
      topK: 5,
    });
  }
}
