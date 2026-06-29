import { Injectable, Logger } from '@nestjs/common';
import { isRetryableError } from './errors/ai-provider.error';

export interface RetryPolicyConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  timeoutMs: number;
  /** Apply randomized jitter to backoff delays (avoids thundering herd). */
  jitter: boolean;
}

const DEFAULT_CONFIG: RetryPolicyConfig = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 10_000,
  backoffMultiplier: 2,
  timeoutMs: 30_000,
  jitter: true,
};

@Injectable()
export class RetryPolicyService {
  private readonly logger = new Logger(RetryPolicyService.name);
  private config: RetryPolicyConfig = { ...DEFAULT_CONFIG };

  configure(config: Partial<RetryPolicyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): RetryPolicyConfig {
    return { ...this.config };
  }

  async execute<T>(
    operation: () => Promise<T>,
    providerName: string,
  ): Promise<{ result: T; retryCount: number }> {
    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt <= this.config.maxRetries) {
      try {
        const result = await this.withTimeout(
          operation(),
          this.config.timeoutMs,
          providerName,
        );
        return { result, retryCount: attempt };
      } catch (err) {
        lastError = err as Error;

        // Only retry transient failures. Validation / auth / authorization /
        // business-rule errors (4xx) and client timeouts are permanent.
        const retryable = isRetryableError(lastError);

        if (attempt >= this.config.maxRetries || !retryable) break;

        const delay = this.calcDelay(attempt);
        // Never log error bodies/prompts — only provider + attempt + delay.
        this.logger.warn(
          `Retry ${attempt + 1}/${this.config.maxRetries} for ${providerName} after ${delay}ms`,
        );
        await this.sleep(delay);
        attempt++;
      }
    }

    throw lastError ?? new Error(`All retries exhausted for ${providerName}`);
  }

  /**
   * Exponential backoff with optional jitter, capped at maxDelayMs.
   * Jitter uses the "equal jitter" strategy: half the capped base delay plus a
   * random [0, half] component, i.e. the slept time is in [base/2, base].
   */
  private calcDelay(attempt: number): number {
    const base = Math.min(
      this.config.initialDelayMs *
        Math.pow(this.config.backoffMultiplier, attempt),
      this.config.maxDelayMs,
    );
    if (!this.config.jitter) return base;
    const half = base / 2;
    return Math.round(half + Math.random() * half);
  }

  private withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    label: string,
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Request timeout after ${ms}ms [${label}]`)),
        ms,
      );
    });
    // Promise.race propagates the original error untouched; the timer is always
    // cleared so a slow-but-successful call never leaks a pending timeout.
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
