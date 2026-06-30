/**
 * Vector layer — types (Sprint 2, Epic 2.4).
 *
 * Vector Store là DERIVED VIEW (rebuild từ Memory Objects — Source of Truth).
 * KHÔNG lưu số liệu tài chính/PII. Scope theo clubId (tenant isolation).
 */

/** Một bản ghi vector (derived từ ClubMemoryObject). */
export interface VectorRecord {
  id: string; // = memoryId
  clubId: string;
  vector: number[];
  /** Metadata derived an toàn (type/tags/updatedAt/snippet) — KHÔNG PII/finance. */
  metadata: {
    type: string;
    tags: string[];
    snippet: string;
    updatedAt: number;
    embeddingVersion: string;
  };
}

export interface VectorQueryHit {
  id: string;
  score: number; // cosine similarity [−1, 1]
}

export interface VectorQueryOptions {
  topK: number;
  /** Ngưỡng tối thiểu (loại hit < threshold). */
  threshold?: number;
}
