import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreakerState } from './interfaces/ai-provider.interface';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeoutMs: number;
  halfOpenMaxCalls: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeoutMs: 60_000,
  halfOpenMaxCalls: 1,
};

interface CircuitBreakerEntry {
  state: CircuitBreakerState;
  failureCount: number;
  lastFailureAt: number;
  openedAt?: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers = new Map<string, CircuitBreakerEntry>();
  private readonly halfOpenAttempts = new Map<string, number>();
  private config: CircuitBreakerConfig = { ...DEFAULT_CONFIG };

  configure(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getState(provider: string): CircuitBreakerState {
    const entry = this.breakers.get(provider);
    if (!entry) return 'CLOSED';

    if (entry.state === 'OPEN') {
      const elapsed = Date.now() - (entry.openedAt ?? 0);
      if (elapsed >= this.config.recoveryTimeoutMs) {
        entry.state = 'HALF_OPEN';
        this.halfOpenAttempts.set(provider, 0);
        this.logger.log(`Circuit breaker HALF_OPEN: ${provider}`);
      }
    }

    return entry.state;
  }

  isAllowed(provider: string): boolean {
    const state = this.getState(provider);
    if (state === 'CLOSED') return true;
    if (state === 'OPEN') return false;

    const attempts = this.halfOpenAttempts.get(provider) ?? 0;
    if (attempts < this.config.halfOpenMaxCalls) {
      this.halfOpenAttempts.set(provider, attempts + 1);
      return true;
    }
    return false;
  }

  recordSuccess(provider: string): void {
    const state = this.getState(provider);
    if (state === 'HALF_OPEN') {
      this.breakers.set(provider, {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureAt: 0,
      });
      this.halfOpenAttempts.delete(provider);
      this.logger.log(`Circuit breaker CLOSED after recovery: ${provider}`);
    } else {
      const entry = this.breakers.get(provider);
      if (entry) entry.failureCount = Math.max(0, entry.failureCount - 1);
    }
  }

  recordFailure(provider: string): void {
    const entry = this.breakers.get(provider) ?? {
      state: 'CLOSED' as CircuitBreakerState,
      failureCount: 0,
      lastFailureAt: 0,
    };

    entry.failureCount += 1;
    entry.lastFailureAt = Date.now();

    if (
      entry.state === 'CLOSED' &&
      entry.failureCount >= this.config.failureThreshold
    ) {
      entry.state = 'OPEN';
      entry.openedAt = Date.now();
      this.logger.warn(
        `Circuit breaker OPEN: ${provider} (${entry.failureCount} failures)`,
      );
    } else if (entry.state === 'HALF_OPEN') {
      entry.state = 'OPEN';
      entry.openedAt = Date.now();
      this.logger.warn(`Circuit breaker re-OPEN from HALF_OPEN: ${provider}`);
    }

    this.breakers.set(provider, entry);
  }

  reset(provider: string): void {
    this.breakers.delete(provider);
    this.halfOpenAttempts.delete(provider);
  }
}
