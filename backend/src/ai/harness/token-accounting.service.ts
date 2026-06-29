import { Injectable } from '@nestjs/common';
import { TokenUsageSummary } from './interfaces/ai-gateway.interface';

interface UsageEntry {
  requestId: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  clubId?: string;
  userId?: string;
  sessionId?: string;
  /** Optional — present only when the caller records latency for this entry. */
  latencyMs?: number;
  timestamp: Date;
}

/** Per-provider slice of a model's token usage. */
export interface ModelProviderBreakdown {
  provider: string;
  requestCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCostUsd: number;
}

/** Aggregated token statistics for a single AI model. */
export interface ModelUsageSummary {
  model: string;
  requestCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  averageLatency: number;
  providers: ModelProviderBreakdown[];
}

@Injectable()
export class TokenAccountingService {
  private readonly entries: UsageEntry[] = [];

  record(entry: UsageEntry): void {
    this.entries.push(entry);
    if (this.entries.length > 50_000) {
      this.entries.splice(0, this.entries.length - 50_000);
    }
  }

  getByUser(userId: string): TokenUsageSummary {
    return this.aggregate(this.entries.filter((e) => e.userId === userId));
  }

  getByClub(clubId: string): TokenUsageSummary {
    return this.aggregate(this.entries.filter((e) => e.clubId === clubId));
  }

  getBySession(sessionId: string): TokenUsageSummary {
    return this.aggregate(
      this.entries.filter((e) => e.sessionId === sessionId),
    );
  }

  getGlobal(): TokenUsageSummary {
    return this.aggregate(this.entries);
  }

  getByProvider(): Record<string, TokenUsageSummary> {
    const providers = [...new Set(this.entries.map((e) => e.provider))];
    const result: Record<string, TokenUsageSummary> = {};
    for (const p of providers) {
      result[p] = this.aggregate(this.entries.filter((e) => e.provider === p));
    }
    return result;
  }

  /**
   * Aggregated statistics for a specific AI model, including a per-provider
   * breakdown. `averageLatency` is computed only over entries that carry a
   * recorded latency (0 when none are available).
   */
  getByModel(model: string): ModelUsageSummary {
    const entries = this.entries.filter((e) => e.model === model);

    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let totalCostUsd = 0;
    let latencySum = 0;
    let latencyCount = 0;
    const byProvider = new Map<string, ModelProviderBreakdown>();

    for (const e of entries) {
      promptTokens += e.promptTokens;
      completionTokens += e.completionTokens;
      totalTokens += e.totalTokens;
      totalCostUsd += e.estimatedCostUsd;
      if (typeof e.latencyMs === 'number') {
        latencySum += e.latencyMs;
        latencyCount += 1;
      }

      const p = byProvider.get(e.provider) ?? {
        provider: e.provider,
        requestCount: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        totalCostUsd: 0,
      };
      p.requestCount += 1;
      p.promptTokens += e.promptTokens;
      p.completionTokens += e.completionTokens;
      p.totalTokens += e.totalTokens;
      p.totalCostUsd += e.estimatedCostUsd;
      byProvider.set(e.provider, p);
    }

    return {
      model,
      requestCount: entries.length,
      promptTokens,
      completionTokens,
      totalTokens,
      totalCostUsd,
      averageLatency: latencyCount > 0 ? Math.round(latencySum / latencyCount) : 0,
      providers: [...byProvider.values()],
    };
  }

  private aggregate(entries: UsageEntry[]): TokenUsageSummary {
    return entries.reduce(
      (acc, e) => ({
        totalRequests: acc.totalRequests + 1,
        totalPromptTokens: acc.totalPromptTokens + e.promptTokens,
        totalCompletionTokens: acc.totalCompletionTokens + e.completionTokens,
        totalTokens: acc.totalTokens + e.totalTokens,
        totalCostUsd: acc.totalCostUsd + e.estimatedCostUsd,
      }),
      {
        totalRequests: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
        totalCostUsd: 0,
      },
    );
  }
}
