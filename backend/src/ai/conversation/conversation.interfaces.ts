/**
 * Conversation Memory — abstractions (Sprint 2, Epic 2.2).
 * Repository là abstraction; in-memory default volatile (persistence deferred).
 */
import { Conversation, MessageRole } from './conversation.types';

export interface CreateConversationInput {
  clubId: string | null;
  userId: string;
  title?: string | null;
  /** Nếu có, tạo message SYSTEM mở đầu. */
  systemPrompt?: string;
}

export interface AppendMessageInput {
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface IConversationRepository {
  create(conversation: Conversation): Promise<Conversation>;
  findById(conversationId: string): Promise<Conversation | null>;
  replace(conversation: Conversation): Promise<Conversation>;
  listByOwner(clubId: string | null, userId: string): Promise<Conversation[]>;
  clear(): Promise<void>;
}

export const CONVERSATION_REPOSITORY = 'CONVERSATION_REPOSITORY';
