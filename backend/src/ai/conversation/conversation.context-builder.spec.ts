import { ConfigService } from '@nestjs/config';
import { ConversationContextBuilder } from './conversation.context-builder';
import { ContextWindowManager } from './conversation.context-window';
import { ConversationService } from './conversation.service';
import { InMemoryConversationRepository } from './conversation.repository';
import { MessageRole } from './conversation.types';
import { UserMemoryService } from '../user-memory/user-memory.service';
import { InMemoryUserMemoryRepository } from '../user-memory/user-memory.repository';
import { RetrievalEngine } from '../retrieval/retrieval.service';
import { IndexManager } from '../retrieval/index-manager';
import { NoopSemanticSearchProvider } from '../retrieval/noop-semantic-search.provider';
import { ClubMemoryService } from '../club-memory/club-memory.service';
import { InMemoryClubMemoryRepository } from '../club-memory/club-memory.repository';
import { ClubMemoryType } from '../club-memory/club-memory.types';

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

  it('returns null user memory when none saved + empty clubMemory (no retrieval)', async () => {
    const c = await convSvc.createConversation({ clubId: null, userId: 'u9' });
    const conv = await convSvc.loadConversation(c.conversationId);
    const ctx = await builder.build(conv!, 'u9');
    expect(ctx.userProfile).toBeNull();
    expect(ctx.userPreference).toBeNull();
    expect(ctx.messages).toHaveLength(0);
    expect(ctx.clubMemory).toEqual([]); // retrieval absent → additive source empty
  });

  it('Epic 2.3: includes Club Memory retrieval as additive source', async () => {
    const clubMemory = new ClubMemoryService(new InMemoryClubMemoryRepository());
    const retrieval = new RetrievalEngine(
      clubMemory,
      new IndexManager(),
      new NoopSemanticSearchProvider(),
    );
    const builderWithRetrieval = new ConversationContextBuilder(
      umSvc,
      new ContextWindowManager(cfg()),
      retrieval,
    );
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.RULE,
      content: 'Quy định khách mời tối đa 2 người',
    });
    const c = await convSvc.createConversation({ clubId: 'club-1', userId: 'u1' });
    await convSvc.appendMessage(c.conversationId, {
      role: MessageRole.USER,
      content: 'khách mời được không',
    });
    const conv = await convSvc.loadConversation(c.conversationId);
    const ctx = await builderWithRetrieval.build(conv!, 'u1');
    expect(ctx.clubMemory.length).toBeGreaterThan(0);
    expect(ctx.clubMemory[0].snippet).toContain('khách');
  });
});
