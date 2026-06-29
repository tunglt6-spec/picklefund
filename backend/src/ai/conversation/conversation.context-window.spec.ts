import { ConfigService } from '@nestjs/config';
import { ContextWindowManager } from './conversation.context-window';
import { ConversationMessage, MessageRole } from './conversation.types';

function cfg(values: Record<string, string> = {}): ConfigService {
  return {
    get: (k: string, d?: string) => values[k] ?? d,
  } as unknown as ConfigService;
}

function msg(
  role: MessageRole,
  content: string,
  tokenCount: number,
  i: number,
): ConversationMessage {
  return {
    messageId: `m${i}`,
    conversationId: 'c1',
    role,
    content,
    timestamp: new Date(1000 + i),
    metadata: {},
    tokenCount,
  };
}

describe('ContextWindowManager', () => {
  it('getConfig reads defaults from config', () => {
    const m = new ContextWindowManager(cfg());
    expect(m.getConfig()).toEqual({
      tokenBudget: 4000,
      maxHistoryMessages: 20,
    });
  });

  it('getConfig reads overrides', () => {
    const m = new ContextWindowManager(
      cfg({ CONTEXT_TOKEN_BUDGET: '100', CONTEXT_MAX_HISTORY_MESSAGES: '2' }),
    );
    expect(m.getConfig()).toEqual({ tokenBudget: 100, maxHistoryMessages: 2 });
  });

  it('countTokens sums tokenCount', () => {
    const m = new ContextWindowManager(cfg());
    expect(
      m.countTokens([
        msg(MessageRole.USER, 'a', 5, 1),
        msg(MessageRole.USER, 'b', 7, 2),
      ]),
    ).toBe(12);
  });

  it('trim always keeps SYSTEM and most recent within maxHistory', () => {
    const m = new ContextWindowManager(
      cfg({ CONTEXT_MAX_HISTORY_MESSAGES: '2', CONTEXT_TOKEN_BUDGET: '10000' }),
    );
    const messages = [
      msg(MessageRole.SYSTEM, 'sys', 1, 0),
      msg(MessageRole.USER, 'u1', 1, 1),
      msg(MessageRole.ASSISTANT, 'a1', 1, 2),
      msg(MessageRole.USER, 'u2', 1, 3),
    ];
    const out = m.trim(messages);
    // system + last 2 non-system
    expect(out.map((x) => x.messageId)).toEqual(['m0', 'm2', 'm3']);
  });

  it('trim respects token budget (keeps most-recent contiguous window)', () => {
    const m = new ContextWindowManager(
      cfg({ CONTEXT_TOKEN_BUDGET: '3', CONTEXT_MAX_HISTORY_MESSAGES: '20' }),
    );
    const messages = [
      msg(MessageRole.SYSTEM, 'sys', 1, 0),
      msg(MessageRole.USER, 'u1', 1, 1),
      msg(MessageRole.USER, 'u2', 1, 2),
      msg(MessageRole.USER, 'u3', 1, 3),
    ];
    const out = m.trim(messages);
    // system(1) + u3(1) + u2(1) = 3; u1 excluded (would exceed budget)
    expect(out.map((x) => x.messageId)).toEqual(['m0', 'm2', 'm3']);
  });

  it('trim stops at a recent message that alone exceeds remaining budget', () => {
    const m = new ContextWindowManager(
      cfg({ CONTEXT_TOKEN_BUDGET: '3', CONTEXT_MAX_HISTORY_MESSAGES: '20' }),
    );
    const messages = [
      msg(MessageRole.SYSTEM, 'sys', 1, 0),
      msg(MessageRole.USER, 'u1', 1, 1),
      msg(MessageRole.USER, 'big', 5, 2),
    ];
    // most-recent (big=5) exceeds remaining budget → only system kept
    expect(m.trim(messages).map((x) => x.messageId)).toEqual(['m0']);
  });
});
