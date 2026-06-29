import { ConfigService } from '@nestjs/config';
import { ConversationContextBuilder } from './conversation.context-builder';
import { ContextWindowManager } from './conversation.context-window';
import { ConversationService } from './conversation.service';
import { InMemoryConversationRepository } from './conversation.repository';
import { MessageRole } from './conversation.types';
import { UserMemoryService } from '../user-memory/user-memory.service';
import { InMemoryUserMemoryRepository } from '../user-memory/user-memory.repository';

function cfg(values: Record<string, string> = {}): ConfigService {
  return {
    get: (k: string, d?: string) => values[k] ?? d,
  } as unknown as ConfigService;
}

describe('ConversationContextBuilder', () => {
  let convSvc: ConversationService;
  let umSvc: UserMemoryService;
  let builder: ConversationContextBuilder;

  beforeEach(() => {
    convSvc = new ConversationService(new InMemoryConversationRepository());
    umSvc = new UserMemoryService(new InMemoryUserMemoryRepository());
    builder = new ConversationContextBuilder(
      umSvc,
      new ContextWindowManager(cfg()),
    );
  });

  it('merges trimmed history with user profile + preference', async () => {
    const c = await convSvc.createConversation({
      clubId: 'club-1',
      userId: 'u1',
      systemPrompt: 'sys',
    });
    await convSvc.appendMessage(c.conversationId, {
      role: MessageRole.USER,
      content: 'hi',
    });
    await umSvc.saveProfile('club-1', 'u1', { language: 'vi' });
    await umSvc.savePreference('club-1', 'u1', { responseStyle: 'concise' });

    const conv = await convSvc.loadConversation(c.conversationId);
    const ctx = await builder.build(conv!, 'u1');

    expect(ctx.conversationId).toBe(c.conversationId);
    expect(ctx.messages.length).toBe(2);
    expect(ctx.tokensUsed).toBeGreaterThan(0);
    expect(ctx.userProfile?.language).toBe('vi');
    expect(ctx.userPreference?.responseStyle).toBe('concise');
  });

  it('returns null user memory when none saved', async () => {
    const c = await convSvc.createConversation({ clubId: null, userId: 'u9' });
    const conv = await convSvc.loadConversation(c.conversationId);
    const ctx = await builder.build(conv!, 'u9');
    expect(ctx.userProfile).toBeNull();
    expect(ctx.userPreference).toBeNull();
    expect(ctx.messages).toHaveLength(0);
  });
});
