/**
 * In-memory Conversation Repository — VOLATILE default (Epic 2.2).
 * KHÔNG persistence (SQLite/Postgres/Qdrant deferred), nhất quán với Epic 2.1.
 */
import { Injectable } from '@nestjs/common';
import { IConversationRepository } from './conversation.interfaces';
import { Conversation } from './conversation.types';

@Injectable()
export class InMemoryConversationRepository implements IConversationRepository {
  private readonly store = new Map<string, Conversation>();

  create(conversation: Conversation): Promise<Conversation> {
    this.store.set(conversation.conversationId, conversation);
    return Promise.resolve(conversation);
  }

  findById(conversationId: string): Promise<Conversation | null> {
    return Promise.resolve(this.store.get(conversationId) ?? null);
  }

  replace(conversation: Conversation): Promise<Conversation> {
    this.store.set(conversation.conversationId, conversation);
    return Promise.resolve(conversation);
  }

  listByOwner(clubId: string | null, userId: string): Promise<Conversation[]> {
    const result = [...this.store.values()]
      .filter((c) => c.userId === userId && c.clubId === clubId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return Promise.resolve(result);
  }

  clear(): Promise<void> {
    this.store.clear();
    return Promise.resolve();
  }
}
