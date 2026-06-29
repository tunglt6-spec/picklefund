import { InMemoryConversationRepository } from './conversation.repository';
import {
  Conversation,
  ConversationStatus,
  MessageRole,
} from './conversation.types';

function conv(over: Partial<Conversation> = {}): Conversation {
  const now = new Date();
  return {
    conversationId: 'c1',
    clubId: 'club-1',
    userId: 'u1',
    title: null,
    status: ConversationStatus.ACTIVE,
    summary: null,
    createdAt: now,
    updatedAt: now,
    messages: [],
    ...over,
  };
}

describe('InMemoryConversationRepository', () => {
  let repo: InMemoryConversationRepository;
  beforeEach(() => {
    repo = new InMemoryConversationRepository();
  });

  it('create/findById/replace', async () => {
    await repo.create(conv({ conversationId: 'a', title: 'old' }));
    expect((await repo.findById('a'))?.title).toBe('old');
    await repo.replace(conv({ conversationId: 'a', title: 'new' }));
    expect((await repo.findById('a'))?.title).toBe('new');
    expect(await repo.findById('missing')).toBeNull();
  });

  it('listByOwner filters by club+user and sorts newest first', async () => {
    await repo.create(
      conv({ conversationId: 'old', updatedAt: new Date(1000) }),
    );
    await repo.create(
      conv({ conversationId: 'new', updatedAt: new Date(9000) }),
    );
    await repo.create(conv({ conversationId: 'other', userId: 'u2' }));
    expect(
      (await repo.listByOwner('club-1', 'u1')).map((c) => c.conversationId),
    ).toEqual(['new', 'old']);
  });

  it('clear empties the store', async () => {
    await repo.create(conv({ conversationId: 'a' }));
    await repo.clear();
    expect(await repo.listByOwner('club-1', 'u1')).toHaveLength(0);
  });

  it('roles enum available', () => {
    expect(MessageRole.TOOL).toBe('TOOL');
  });
});
