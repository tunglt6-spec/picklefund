/**
 * EmbeddingService (Sprint 2, Epic 2.4).
 *
 * Batch embedding + cache (TTL) + cost guardrail (daily budget) + retry + DLQ
 * + embedding version + observability. Provider plug-in qua EMBEDDING_PROVIDER.
 * Budget exceeded → throw BudgetExceededError (caller fallback deterministic).
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { EMBEDDING_PROVIDER } from './embedding.interface';
import type { IEmbeddingProvider } from './embedding.interface';
import { VectorObservabilityService } from './vector-observability.service';

/** DLQ entry — KHÔNG chứa raw text/title/content/snippet (chỉ hash + metadata an toàn). */
export interface DeadLetterEntry {
  requestId: string;
  textHash: string;
  reason: string;
  provider: string;
  createdAt: number;
  length: number;
  embeddingVersion: string;
}

export class BudgetExceededError extends Error {
  constructor(message = 'Embedding budget exceeded') {
    super(message);
    this.name = 'BudgetExceededError';
  }
}

export interface EmbeddingConfig {
  cacheTtlMs: number;
  maxBatch: number;
  dailyBudget: number; // 0 = unlimited
  maxRetries: number;
}

interface CacheEntry {
  vector: number[];
  ts: number;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly deadLetters: DeadLetterEntry[] = [];
  private usedToday = 0;
  private budgetDay = -1;

  constructor(
    @Inject(EMBEDDING_PROVIDER) private readonly provider: IEmbeddingProvider,
    private readonly config: ConfigService,
    private readonly obs: VectorObservabilityService,
  ) {}

  get version(): string {
    return `${this.provider.name}:${this.provider.version}`;
  }
  get dimension(): number {
    return this.provider.dimension;
  }

  getConfig(): EmbeddingConfig {
    return {
      cacheTtlMs: Number(this.config.get('EMBEDDING_CACHE_TTL_MS', '300000')),
      maxBatch: Number(this.config.get('EMBEDDING_MAX_BATCH', '64')),
      dailyBudget: Number(this.config.get('EMBEDDING_DAILY_BUDGET', '0')),
      maxRetries: Number(this.config.get('EMBEDDING_MAX_RETRIES', '2')),
    };
  }

  getDeadLetters(): ReadonlyArray<DeadLetterEntry> {
    return this.deadLetters;
  }

  /** Embed có cache + batch + budget; trả về 1 vector / input (đúng thứ tự). */
  async embed(texts: string[]): Promise<number[][]> {
    const cfg = this.getConfig();
    const now = Date.now();
    this.rolloverBudget(now);

    const results: (number[] | null)[] = new Array<number[] | null>(
      texts.length,
    ).fill(null);
    const missIdx: number[] = [];

    texts.forEach((t, i) => {
      const cached = this.cache.get(this.key(t));
      if (cached && now - cached.ts <= cfg.cacheTtlMs) {
        results[i] = cached.vector;
        this.obs.recordCache(true);
      } else {
        missIdx.push(i);
        this.obs.recordCache(false);
      }
    });

    if (missIdx.length > 0) {
      this.assertBudget(missIdx.length, cfg);
      for (let b = 0; b < missIdx.length; b += cfg.maxBatch) {
        const chunkIdx = missIdx.slice(b, b + cfg.maxBatch);
        const chunkTexts = chunkIdx.map((i) => texts[i]);
        const vectors = await this.embedWithRetry(chunkTexts, cfg.maxRetries);
        chunkIdx.forEach((i, k) => {
          results[i] = vectors[k];
          this.cache.set(this.key(texts[i]), { vector: vectors[k], ts: now });
        });
        this.usedToday += chunkIdx.length;
      }
    }

    return results.map((r) => r ?? []);
  }

  private async embedWithRetry(
    texts: string[],
    maxRetries: number,
  ): Promise<number[][]> {
    let attempt = 0;
    let lastErr: unknown;
    while (attempt <= maxRetries) {
      const start = Date.now();
      try {
        const vectors = await this.provider.embed(texts);
        this.obs.recordEmbedding(Date.now() - start, texts.length);
        return vectors;
      } catch (err) {
        lastErr = err;
        this.obs.recordEmbeddingFailure();
        attempt++;
      }
    }
    // Retry exhausted → dead letter queue (KHÔNG lưu raw text — chỉ hash + metadata).
    const reason = lastErr instanceof Error ? lastErr.name : 'embedding failed';
    for (const t of texts) {
      this.deadLetters.push({
        requestId: randomUUID(),
        textHash: this.hash(t),
        reason,
        provider: this.provider.name,
        createdAt: Date.now(),
        length: t.length,
        embeddingVersion: this.version,
      });
    }
    this.logger.warn(`Embedding failed after retries (${reason})`);
    throw lastErr instanceof Error
      ? lastErr
      : new Error('Embedding failed after retries');
  }

  private assertBudget(n: number, cfg: EmbeddingConfig): void {
    if (cfg.dailyBudget > 0 && this.usedToday + n > cfg.dailyBudget) {
      throw new BudgetExceededError(
        `Embedding daily budget exceeded (${cfg.dailyBudget})`,
      );
    }
  }

  private rolloverBudget(now: number): void {
    const day = Math.floor(now / 86_400_000);
    if (day !== this.budgetDay) {
      this.budgetDay = day;
      this.usedToday = 0;
    }
  }

  /** Cache key = version + SHA-256(text). KHÔNG lộ raw text trong key. */
  private key(text: string): string {
    return `${this.version}:${this.hash(text)}`;
  }

  private hash(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }
}
