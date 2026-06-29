/**
 * Retrieval — types (Sprint 2, Epic 2.3).
 * Deterministic retrieval (keyword/tag/metadata). KHÔNG semantic/embedding/vector.
 */
import { ClubMemoryType } from '../club-memory/club-memory.types';

export interface RetrievalQuery {
  text?: string;
  tags?: string[];
  type?: ClubMemoryType;
  /** Metadata retrieval — exact match, AND logic (mọi key phải khớp). */
  metadata?: Record<string, string | number | boolean>;
  topK?: number;
}

export interface RetrievalMatch {
  memoryId: string;
  clubId: string;
  type: ClubMemoryType;
  title: string | null;
  snippet: string;
  score: number;
  tags: readonly string[];
  updatedAt: Date;
}

/** Derived index entry — KHÔNG phải Source of Truth (rebuild từ ClubMemoryObject). */
export interface IndexEntry {
  memoryId: string;
  clubId: string;
  type: ClubMemoryType;
  title: string | null;
  content: string;
  keywords: string[];
  tags: string[];
  /** Derived view của ClubMemoryObject.metadata (Memory Object vẫn là SoT). */
  metadata: Record<string, unknown>;
  updatedAt: Date;
}
