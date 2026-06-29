/**
 * ContextWindowManager (Sprint 2, Epic 2.2).
 * Token budget · max history · trimming · rolling window.
 * KHÔNG ranking, KHÔNG similarity, KHÔNG embedding. Config từ .env.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConversationMessage, MessageRole } from './conversation.types';

export interface ContextWindowConfig {
  tokenBudget: number;
  maxHistoryMessages: number;
}

@Injectable()
export class ContextWindowManager {
  constructor(private readonly config: ConfigService) {}

  getConfig(): ContextWindowConfig {
    return {
      tokenBudget: Number(this.config.get('CONTEXT_TOKEN_BUDGET', '4000')),
      maxHistoryMessages: Number(
        this.config.get('CONTEXT_MAX_HISTORY_MESSAGES', '20'),
      ),
    };
  }

  countTokens(messages: readonly ConversationMessage[]): number {
    return messages.reduce((sum, m) => sum + m.tokenCount, 0);
  }

  /**
   * Rolling window: luôn giữ SYSTEM messages (pinned), rồi lấy các message gần
   * nhất đến khi chạm maxHistoryMessages hoặc tokenBudget. Trả về theo thứ tự
   * thời gian (system trước, rồi phần lịch sử được giữ).
   */
  trim(messages: readonly ConversationMessage[]): ConversationMessage[] {
    const cfg = this.getConfig();
    const system = messages.filter((m) => m.role === MessageRole.SYSTEM);
    const rest = messages.filter((m) => m.role !== MessageRole.SYSTEM);

    let tokens = this.countTokens(system);
    const kept: ConversationMessage[] = [];
    for (let i = rest.length - 1; i >= 0; i--) {
      if (kept.length >= cfg.maxHistoryMessages) break;
      if (tokens + rest[i].tokenCount > cfg.tokenBudget) break;
      kept.unshift(rest[i]);
      tokens += rest[i].tokenCount;
    }
    return [...system, ...kept];
  }
}
