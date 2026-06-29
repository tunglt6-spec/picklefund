import { Injectable } from '@nestjs/common';
import { TelemetryRecord } from './interfaces/ai-gateway.interface';

export interface ProviderMetrics {
  requestCount: number;
  successCount: number;
  failureCount: number;
  retryCount: number;
  timeoutCount: number;
  totalLatencyMs: number;
  totalTokens: number;
  totalCostUsd: number;
}

@Injectable()
export class TelemetryService {
  private readonly records: TelemetryRecord[] = [];
  private readonly providerMetrics = new Map<string, ProviderMetrics>();

  record(entry: TelemetryRecord): void {
    this.records.push(entry);

    const metrics =
      this.providerMetrics.get(entry.provider) ?? this.emptyMetrics();
    metrics.requestCount += 1;
    metrics.totalLatencyMs += entry.latencyMs;
    metrics.totalTokens += entry.totalTokens;
    metrics.totalCostUsd += entry.estimatedCostUsd;
    metrics.retryCount += entry.retryCount;

    if (entry.success) {
      metrics.successCount += 1;
    } else {
      metrics.failureCount += 1;
      if (entry.errorType === 'TIMEOUT') metrics.timeoutCount += 1;
    }

    this.providerMetrics.set(entry.provider, metrics);

    // keep in-memory buffer bounded to last 10k records
    if (this.records.length > 10_000) {
      this.records.splice(0, this.records.length - 10_000);
    }
  }

  getProviderMetrics(provider?: string): Record<string, ProviderMetrics> {
    if (provider) {
      const m = this.providerMetrics.get(provider);
      return m ? { [provider]: m } : {};
    }
    const result: Record<string, ProviderMetrics> = {};
    this.providerMetrics.forEach((v, k) => (result[k] = { ...v }));
    return result;
  }

  getSummary() {
    let totalRequests = 0;
    let totalSuccess = 0;
    let totalFailure = 0;
    let totalCostUsd = 0;
    let totalTokens = 0;

    this.providerMetrics.forEach((m) => {
      totalRequests += m.requestCount;
      totalSuccess += m.successCount;
      totalFailure += m.failureCount;
      totalCostUsd += m.totalCostUsd;
      totalTokens += m.totalTokens;
    });

    return {
      totalRequests,
      totalSuccess,
      totalFailure,
      successRate: totalRequests > 0 ? totalSuccess / totalRequests : 0,
      totalCostUsd,
      totalTokens,
      providerMetrics: this.getProviderMetrics(),
    };
  }

  private emptyMetrics(): ProviderMetrics {
    return {
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      retryCount: 0,
      timeoutCount: 0,
      totalLatencyMs: 0,
      totalTokens: 0,
      totalCostUsd: 0,
    };
  }
}
