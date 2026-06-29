/**
 * Semantic Search abstraction (Sprint 2, Epic 2.3).
 *
 * Epic 2.3 CHỈ tạo interface + No-op default. Epic 2.4 thay Provider (embedding/vector)
 * mà KHÔNG cần refactor caller. KHÔNG embedding/vector ở Epic 2.3.
 */
export interface SemanticMatch {
  memoryId: string;
  score: number;
}

export interface ISemanticSearchProvider {
  readonly name: string;
  /** Trả về matches theo độ tương đồng ngữ nghĩa. No-op provider trả []. */
  search(clubId: string, query: string, topK: number): Promise<SemanticMatch[]>;
}

export const SEMANTIC_SEARCH_PROVIDER = 'SEMANTIC_SEARCH_PROVIDER';
