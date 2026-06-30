/**
 * VectorObservabilityService (Sprint 2, Epic 2.4).
 * Đếm metric in-memory (no PII/content): latency, failures, cache hit/miss,
 * fallback, semantic success rate, hybrid latency. Persistence deferred.
 */
import { Injectable } from '@nestjs/common';

export interface VectorMetrics {
  embeddingCount: number;
  embeddingFailures: number;
  embeddingLatencyMsTotal: number;
  vectorQueries: number;
  vectorLatencyMsTotal: number;
  cacheHit: number;
  cacheMiss: number;
  fallbackCount: number;
  semanticAttempts: number;
  semanticSuccess: number;
  hybridCount: number;
  hybridLatencyMsTotal: number;
  policySkipped: number;
  piiRedacted: number;
  financeBlocked: number;
}

@Injectable()
export class VectorObservabilityService {
  private m: VectorMetrics = VectorObservabilityService.empty();

  static empty(): VectorMetrics {
    return {
      embeddingCount: 0,
      embeddingFailures: 0,
      embeddingLatencyMsTotal: 0,
      vectorQueries: 0,
      vectorLatencyMsTotal: 0,
      cacheHit: 0,
      cacheMiss: 0,
      fallbackCount: 0,
      semanticAttempts: 0,
      semanticSuccess: 0,
      hybridCount: 0,
      hybridLatencyMsTotal: 0,
      policySkipped: 0,
      piiRedacted: 0,
      financeBlocked: 0,
    };
  }

  recordEmbedding(latencyMs: number, count: number): void {
    this.m.embeddingCount += count;
    this.m.embeddingLatencyMsTotal += latencyMs;
  }
  recordEmbeddingFailure(): void {
    this.m.embeddingFailures += 1;
  }
  recordCache(hit: boolean): void {
    if (hit) this.m.cacheHit += 1;
    else this.m.cacheMiss += 1;
  }
  recordVectorQuery(latencyMs: number): void {
    this.m.vectorQueries += 1;
    this.m.vectorLatencyMsTotal += latencyMs;
  }
  recordSemantic(success: boolean): void {
    this.m.semanticAttempts += 1;
    if (success) this.m.semanticSuccess += 1;
  }
  recordFallback(): void {
    this.m.fallbackCount += 1;
  }
  recordHybrid(latencyMs: number): void {
    this.m.hybridCount += 1;
    this.m.hybridLatencyMsTotal += latencyMs;
  }
  /** Content policy counters — metrics lỗi KHÔNG được làm vỡ indexing/search. */
  recordPolicySkipped(financeBlocked: boolean): void {
    this.m.policySkipped += 1;
    if (financeBlocked) this.m.financeBlocked += 1;
  }
  recordPiiRedacted(): void {
    this.m.piiRedacted += 1;
  }

  snapshot(): VectorMetrics & {
    avgEmbeddingLatencyMs: number;
    semanticSuccessRate: number;
  } {
    return {
      ...this.m,
      avgEmbeddingLatencyMs:
        this.m.embeddingCount > 0
          ? this.m.embeddingLatencyMsTotal / this.m.embeddingCount
          : 0,
      semanticSuccessRate:
        this.m.semanticAttempts > 0
          ? this.m.semanticSuccess / this.m.semanticAttempts
          : 0,
    };
  }

  reset(): void {
    this.m = VectorObservabilityService.empty();
  }
}
