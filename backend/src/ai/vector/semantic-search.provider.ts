/**
 * SemanticSearchProvider (Sprint 2, Epic 2.4) — implements Epic 2.3
 * ISemanticSearchProvider. Embedding search + similarity + topK + threshold +
 * timeout. Mọi lỗi (embed/budget/timeout) → trả [] để Hybrid fallback deterministic.
 * Read-only, scope clubId (tenant isolation).
 */
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ISemanticSearchProvider,
  SemanticMatch,
} from '../retrieval/semantic-search.interface';
import { EmbeddingService } from './embedding.service';
import { VECTOR_STORE_PROVIDER } from './vector-store.interface';
import type { IVectorStoreProvider } from './vector-store.interface';
import { VectorObservabilityService } from './vector-observability.service';
import { VectorContentPolicyService } from './vector-content-policy.service';

@Injectable()
export class SemanticSearchProvider implements ISemanticSearchProvider {
  readonly name = 'vector-semantic';

  constructor(
    private readonly embedding: EmbeddingService,
    @Inject(VECTOR_STORE_PROVIDER) private readonly store: IVectorStoreProvider,
    private readonly config: ConfigService,
    private readonly obs: VectorObservabilityService,
    private readonly policy: VectorContentPolicyService,
  ) {}

  async search(
    clubId: string,
    query: string,
    topK: number,
  ): Promise<SemanticMatch[]> {
    if (!query.trim()) return [];

    // HOTFIX (Codex): sanitize query TRƯỚC khi embed — raw query KHÔNG vào embedding.
    const sanitized = this.policy.sanitizeForEmbedding({
      title: 'semantic-query',
      content: query,
      clubId,
    });
    if (!sanitized.allowed) {
      // finance/money query → block, KHÔNG embed/query store; return [] an toàn.
      this.safeRecordSkip(sanitized.blockedReasons);
      return [];
    }

    const threshold = Number(this.config.get('SEMANTIC_THRESHOLD', '0.1'));
    const timeoutMs = Number(this.config.get('SEMANTIC_TIMEOUT_MS', '2000'));
    try {
      const matches = await this.withTimeout(
        this.run(clubId, sanitized.sanitizedText, topK, threshold),
        timeoutMs,
      );
      this.obs.recordSemantic(true);
      return matches;
    } catch {
      // embed lỗi / budget exceeded / timeout → fallback deterministic.
      this.obs.recordSemantic(false);
      return [];
    }
  }

  /** Chỉ embed sanitizedText (đã redact PII) — raw query không bao giờ tới đây. */
  private async run(
    clubId: string,
    sanitizedText: string,
    topK: number,
    threshold: number,
  ): Promise<SemanticMatch[]> {
    const [vector] = await this.embedding.embed([sanitizedText]);
    const start = Date.now();
    const hits = await this.store.query(clubId, vector, { topK, threshold });
    this.obs.recordVectorQuery(Date.now() - start);
    return hits.map((h) => ({ memoryId: h.id, score: h.score }));
  }

  // Metrics lỗi KHÔNG được làm vỡ search.
  private safeRecordSkip(blockedReasons: string[]): void {
    try {
      const finance = blockedReasons.some(
        (r) => r.startsWith('finance-term') || r === 'money-pattern',
      );
      this.obs.recordPolicySkipped(finance);
    } catch {
      /* noop */
    }
  }

  private withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('semantic timeout')), ms);
    });
    return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
  }
}
