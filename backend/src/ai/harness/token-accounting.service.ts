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
  timestamp: Date;
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
