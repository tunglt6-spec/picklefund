/**
 * Conversation Memory — types (Sprint 2, Epic 2.2).
 *
 * Lưu Conversation → Messages (không lưu blob text rời). Message IMMUTABLE.
 * KHÔNG embedding/semantic/vector. Tài chính KHÔNG cache — Finance Engine RC1 ONLY.
 */

export enum MessageRole {
  SYSTEM = 'SYSTEM',
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  TOOL = 'TOOL',
}

export enum ConversationStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

/** Message Object — immutable. */
export interface ConversationMessage {
  readonly messageId: string;
  readonly conversationId: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly timestamp: Date;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly tokenCount: number;
}

/** Conversation — immutable; owner = (clubId, userId) để cách ly tenant. */
export interface Conversation {
  readonly conversationId: string;
  readonly clubId: string | null;
  readonly userId: string;
  readonly title: string | null;
  readonly status: ConversationStatus;
  readonly summary: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly messages: readonly ConversationMessage[];
}

/**
 * Ước lượng token đơn giản, deterministic (≈ 4 ký tự / token).
 * KHÔNG dùng model/embedding — chỉ phục vụ token budget của Context Window.
 */
export function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}
