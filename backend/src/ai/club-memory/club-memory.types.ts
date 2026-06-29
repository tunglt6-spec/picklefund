/**
 * Club Memory — types (Sprint 2, Epic 2.3).
 *
 * Scope theo clubId (KHÔNG userId, KHÔNG PII, KHÔNG số liệu tài chính).
 * Immutable (deep freeze). Tài chính chỉ reference Finance Engine RC1 (không cache).
 */

export enum ClubMemoryType {
  FACT = 'FACT',
  RULE = 'RULE',
  PREFERENCE = 'PREFERENCE',
  POLICY = 'POLICY',
  KNOWLEDGE = 'KNOWLEDGE',
  OPERATIONAL_NOTE = 'OPERATIONAL_NOTE',
}

/** Club Memory Object — immutable; owner = clubId. */
export interface ClubMemoryObject {
  readonly memoryId: string;
  readonly clubId: string;
  readonly type: ClubMemoryType;
  readonly title: string | null;
  readonly content: string;
  readonly tags: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
  // Audit metadata
  readonly createdBy: string | null;
  readonly updatedBy: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
