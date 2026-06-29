import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { InMemoryConversationRepository } from './conversation.repository';
import { ConversationStatus, MessageRole } from './conversation.types';

describe('ConversationService', () => {
  let repo: InMemoryConversationRepository;
  let svc: ConversationService;
  const owner = { clubId: 'club-1', userId: 'u1' };

  beforeEach(() => {
    repo = new InMemoryConversationRepository();
    svc = new ConversationService(repo);
  });

  it('creates a conversation without system prompt', async () => {
    const c = await svc.createConversation(owner);
    expect(c.messages).toHaveLength(0);
    expect(c.status).toBe(ConversationStatus.ACTIVE);
    expect(Object.isFrozen(c)).toBe(true);
    expect(Object.isFrozen(c.messages)).toBe(true);
  });

  it('creates with a SYSTEM message when systemPrompt provided', async () => {
    const c = await svc.createConversation({
      ...owner,
      systemPrompt: 'You are MAIKA',
    });
    expect(c.messages).toHaveLength(1);
    expect(c.messages[0].role).toBe(MessageRole.SYSTEM);
    expect(c.messages[0].tokenCount).toBeGreaterThan(0);
    expect(Object.isFrozen(c.messages[0])).toBe(true);
  });

  it('appendMessage adds immutably without mutating the old object', async () => {
    const c = await svc.createConversation({ ...owner, systemPrompt: 'sys' });
    const c2 = await svc.appendMessage(c.conversationId, {
      role: MessageRole.USER,
      content: 'xin chao',
    });
    expect(c2.messages).toHaveLength(2);
    expect(c.messages).toHaveLength(1); // old not mutated
    expect(c2.messages[1].role).toBe(MessageRole.USER);
    expect(c2.updatedAt.getTime()).toBeGreaterThanOrEqual(
      c.updatedAt.getTime(),
    );
    expect(Object.isFrozen(c2.messages)).toBe(true);
    expect(() => {
      (c2.messages as unknown as unknown[]).push({});
    }).toThrow();
  });

  it('append to missing conversation → NotFound', async () => {
    await expect(
      svc.appendMessage('nope', { role: MessageRole.USER, content: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('append to archived conversation → BadRequest', async () => {
    const c = await svc.createConversation(owner);
    await svc.archiveConversation(c.conversationId);
    await expect(
      svc.appendMessage(c.conversationId, {
        role: MessageRole.USER,
        content: 'x',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('summarize sets a deterministic summary (no LLM) and keeps messages', async () => {
    const c = await svc.createConversation({ ...owner, systemPrompt: 'sys' });
    await svc.appendMessage(c.conversationId, {
      role: MessageRole.USER,
      content: 'hello there',
    });
    const summarized = await svc.summarizeConversation(c.conversationId);
    expect(summarized.summary).toContain('2 message');
    expect(summarized.messages).toHaveLength(2);
  });

  it('summarize an empty conversation handles no-last-message', async () => {
    const c = await svc.createConversation(owner); // 0 messages
    const s = await svc.summarizeConversation(c.conversationId);
    expect(s.summary).toContain('0 message');
    expect(s.summary).toContain('NONE');
  });

  it('archive only changes status, does not delete', async () => {
    const c = await svc.createConversation({ ...owner, systemPrompt: 'sys' });
    const archived = await svc.archiveConversation(c.conversationId);
    expect(archived.status).toBe(ConversationStatus.ARCHIVED);
    expect(archived.messages).toHaveLength(1); // retained
    expect(await svc.loadConversation(c.conversationId)).not.toBeNull();
  });

  it('summarize/archive throw NotFound for missing id', async () => {
    await expect(svc.summarizeConversation('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(svc.archiveConversation('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('listByOwner returns only the owner conversations, newest first', async () => {
    await svc.createConversation(owner);
    await svc.createConversation(owner);
    await svc.createConversation({ clubId: 'club-2', userId: 'u2' });
    const list = await svc.listByOwner('club-1', 'u1');
    expect(list).toHaveLength(2);
  });
});
