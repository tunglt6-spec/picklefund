import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConversationController } from './conversation.controller';
import {
  Conversation,
  ConversationStatus,
  MessageRole,
} from './conversation.types';
import type { JwtUser } from '../../common/decorators';

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

const u1: JwtUser = {
  userId: 'u1',
  clubId: 'club-1',
  role: 'CLUB_ADMIN',
  username: 'u1',
  memberId: null,
};
const superAdmin: JwtUser = {
  userId: 'sa',
  clubId: null,
  role: 'SUPER_ADMIN',
  username: 'sa',
  memberId: null,
};

describe('ConversationController', () => {
  let service: {
    createConversation: jest.Mock;
    listByOwner: jest.Mock;
    loadConversation: jest.Mock;
    appendMessage: jest.Mock;
    summarizeConversation: jest.Mock;
    archiveConversation: jest.Mock;
  };
  let builder: { build: jest.Mock };
  let ctrl: ConversationController;

  beforeEach(() => {
    service = {
      createConversation: jest.fn(),
      listByOwner: jest.fn(),
      loadConversation: jest.fn(),
      appendMessage: jest.fn(),
      summarizeConversation: jest.fn(),
      archiveConversation: jest.fn(),
    };
    builder = { build: jest.fn() };
    ctrl = new ConversationController(service as never, builder as never);
  });

  it('create uses clubId/userId from JWT', async () => {
    service.createConversation.mockResolvedValue(conv());
    await ctrl.create({ title: 't' }, u1);
    expect(service.createConversation.mock.calls[0][0]).toMatchObject({
      clubId: 'club-1',
      userId: 'u1',
    });
  });

  it('create without title passes null', async () => {
    service.createConversation.mockResolvedValue(conv());
    await ctrl.create({}, u1);
    expect(service.createConversation.mock.calls[0][0].title).toBeNull();
  });

  it('append without metadata still works', async () => {
    service.loadConversation.mockResolvedValue(
      conv({ userId: 'u1', clubId: 'club-1' }),
    );
    service.appendMessage.mockResolvedValue(conv());
    await ctrl.append('c1', { role: MessageRole.ASSISTANT, content: 'ok' }, u1);
    expect(service.appendMessage.mock.calls[0][1].metadata).toBeUndefined();
  });

  it('list scopes by owner', async () => {
    service.listByOwner.mockResolvedValue([]);
    await ctrl.list(u1);
    expect(service.listByOwner).toHaveBeenCalledWith('club-1', 'u1');
  });

  it('load own conversation returns it', async () => {
    service.loadConversation.mockResolvedValue(
      conv({ userId: 'u1', clubId: 'club-1' }),
    );
    expect((await ctrl.load('c1', u1)).data?.conversationId).toBe('c1');
  });

  it('load missing → NotFound', async () => {
    service.loadConversation.mockResolvedValue(null);
    await expect(ctrl.load('c1', u1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cannot load another users conversation (cross-user)', async () => {
    service.loadConversation.mockResolvedValue(
      conv({ userId: 'other', clubId: 'club-1' }),
    );
    await expect(ctrl.load('c1', u1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('cannot load another clubs conversation (cross-club)', async () => {
    service.loadConversation.mockResolvedValue(
      conv({ userId: 'u1', clubId: 'club-2' }),
    );
    await expect(ctrl.load('c1', u1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('superadmin bypasses ownership', async () => {
    service.loadConversation.mockResolvedValue(
      conv({ userId: 'x', clubId: 'y' }),
    );
    expect((await ctrl.load('c1', superAdmin)).data?.conversationId).toBe('c1');
  });

  it('append requires ownership then delegates', async () => {
    service.loadConversation.mockResolvedValue(
      conv({ userId: 'u1', clubId: 'club-1' }),
    );
    service.appendMessage.mockResolvedValue(conv());
    await ctrl.append('c1', { role: MessageRole.USER, content: 'hi' }, u1);
    expect(service.appendMessage).toHaveBeenCalled();
  });

  it('append blocked for non-owner', async () => {
    service.loadConversation.mockResolvedValue(conv({ userId: 'other' }));
    await expect(
      ctrl.append('c1', { role: MessageRole.USER, content: 'hi' }, u1),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('summarize + archive require ownership', async () => {
    service.loadConversation.mockResolvedValue(
      conv({ userId: 'u1', clubId: 'club-1' }),
    );
    service.summarizeConversation.mockResolvedValue(conv());
    service.archiveConversation.mockResolvedValue(conv());
    await ctrl.summarize('c1', u1);
    await ctrl.archive('c1', u1);
    expect(service.summarizeConversation).toHaveBeenCalledWith('c1');
    expect(service.archiveConversation).toHaveBeenCalledWith('c1');
  });

  it('context builds for owner', async () => {
    service.loadConversation.mockResolvedValue(
      conv({ userId: 'u1', clubId: 'club-1' }),
    );
    builder.build.mockResolvedValue({
      conversationId: 'c1',
      messages: [],
      tokensUsed: 0,
    });
    const res = await ctrl.context('c1', u1);
    expect(res.data.conversationId).toBe('c1');
    expect(builder.build).toHaveBeenCalled();
  });
});
