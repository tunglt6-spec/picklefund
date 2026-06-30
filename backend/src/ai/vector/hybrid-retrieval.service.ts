/**
 * HybridRetrievalEngine (Sprint 2, Epic 2.4).
 *
 * Deterministic (Epic 2.3 RetrievalEngine) = PRIORITY; Semantic = SUPPLEMENT ONLY.
 * - Semantic KHÔNG override deterministic.
 * - Semantic fail/empty → fallback: chỉ deterministic.
 * - Dedupe theo memoryId (deterministic thắng); tie-break deterministic.
 * KHÔNG refactor RetrievalEngine/ContextBuilder (composition, additive).
 */
import { Injectable } from '@nestjs/common';
import { RetrievalEngine } from '../retrieval/retrieval.service';
import { RetrievalMatch, RetrievalQuery } from '../retrieval/retrieval.types';
import { ClubMemoryService } from '../club-memory/club-memory.service';
import { SemanticSearchProvider } from './semantic-search.provider';
import { VectorObservabilityService } from './vector-observability.service';

@Injectable()
export class HybridRetrievalEngine {
  constructor(
    private readonly deterministic: RetrievalEngine,
    private readonly semantic: SemanticSearchProvider,
    private readonly clubMemory: ClubMemoryService,
    private readonly obs: VectorObservabilityService,
  ) {}

  async retrieve(
    clubId: string,
    query: RetrievalQuery,
  ): Promise<RetrievalMatch[]> {
    const start = Date.now();
    const topK = query.topK && query.topK > 0 ? query.topK : 10;

    // 1) Deterministic (priority) — luôn chạy, là nền.
    const deterministic = await this.deterministic.retrieve(clubId, query);
    const seen = new Set(deterministic.map((m) => m.memoryId));

    // 2) Semantic (supplement) — chỉ khi có text; fail → [] (fallback).
    const semanticHits = query.text
      ? await this.semantic.search(clubId, query.text, topK)
      : [];
    if (semanticHits.length === 0) this.obs.recordFallback();

    // 3) Hydrate semantic-only hits (không nằm trong deterministic) thành RetrievalMatch.
    const supplements: RetrievalMatch[] = [];
    for (const hit of semanticHits) {
      if (seen.has(hit.memoryId)) continue; // deterministic thắng (no override)
      const obj = await this.clubMemory.load(clubId, hit.memoryId);
      if (!obj) continue; // tenant isolation: chỉ club hiện tại
      seen.add(hit.memoryId);
      supplements.push({
        memoryId: obj.memoryId,
        clubId: obj.clubId,
        type: obj.type,
        title: obj.title,
        snippet: obj.content.slice(0, 200),
        score: hit.score,
        tags: [...obj.tags],
        updatedAt: obj.updatedAt,
      });
    }
    // Semantic supplements xếp theo score ↓ rồi memoryId ↑ (deterministic).
    supplements.sort(
      (a, b) => b.score - a.score || a.memoryId.localeCompare(b.memoryId),
    );

    // 4) Merge: deterministic trước (priority), semantic-only sau; cắt topK.
    const merged = [...deterministic, ...supplements].slice(0, topK);
    this.obs.recordHybrid(Date.now() - start);
    return merged;
  }
}
