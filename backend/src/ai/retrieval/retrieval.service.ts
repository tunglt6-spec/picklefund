/**
 * RetrievalEngine (Sprint 2, Epic 2.3).
 *
 * Deterministic retrieval over Club Memory (keyword/tag/metadata).
 * - Index là derived view; rebuild từ ClubMemoryService (Source of Truth) mỗi lần
 *   retrieve → luôn nhất quán với update/delete.
 * - Semantic provider hiện là No-op (Epic 2.4 thay Provider). KHÔNG LLM ranking.
 * - KHÔNG gọi Finance Engine; KHÔNG cache tài chính.
 */
import { Inject, Injectable } from '@nestjs/common';
import { ClubMemoryService } from '../club-memory/club-memory.service';
import { IndexManager } from './index-manager';
import { RetrievalMatch, RetrievalQuery } from './retrieval.types';
import { SEMANTIC_SEARCH_PROVIDER } from './semantic-search.interface';
import type { ISemanticSearchProvider } from './semantic-search.interface';

@Injectable()
export class RetrievalEngine {
  constructor(
    private readonly clubMemory: ClubMemoryService,
    private readonly indexManager: IndexManager,
    @Inject(SEMANTIC_SEARCH_PROVIDER)
    private readonly semantic: ISemanticSearchProvider,
  ) {}

  /** Tên semantic provider hiện hành (Epic 2.3 = 'noop'). */
  semanticProviderName(): string {
    return this.semantic.name;
  }

  async retrieve(
    clubId: string,
    query: RetrievalQuery,
  ): Promise<RetrievalMatch[]> {
    // Rebuild index từ Source of Truth (derived; delete/update-safe).
    const objects = await this.clubMemory.listByClub(clubId);
    this.indexManager.rebuild(clubId, objects);

    // Deterministic keyword/tag/metadata retrieval.
    const matches = this.indexManager.search(clubId, query);

    // Semantic provider (No-op ở Epic 2.3) — interface sẵn sàng cho Epic 2.4.
    // No-op trả [] nên không ảnh hưởng kết quả; KHÔNG rerank/LLM.
    await this.semantic.search(clubId, query.text ?? '', query.topK ?? 20);

    return matches;
  }
}
