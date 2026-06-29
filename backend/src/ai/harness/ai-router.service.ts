import { Injectable, Logger } from '@nestjs/common';
import {
  AIMessage,
  AIRequestOptions,
  AIResponse,
} from './interfaces/ai-provider.interface';
import { AIProviderManagerService } from './ai-provider-manager.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { RetryPolicyService } from './retry-policy.service';
import { AIConfigService } from './ai-config.service';
import { AIProviderError } from './errors/ai-provider.error';

@Injectable()
export class AIRouterService {
  private readonly logger = new Logger(AIRouterService.name);

  constructor(
    private readonly providerManager: AIProviderManagerService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly retryPolicy: RetryPolicyService,
    private readonly aiConfig: AIConfigService,
  ) {}

  async route(
    messages: AIMessage[],
    options?: AIRequestOptions,
    providerOverride?: string,
  ): Promise<AIResponse & { retryCount: number }> {
    const globalConfig = this.aiConfig.getGlobal();

    // If a specific provider is requested, use it directly
    if (providerOverride) {
      return this.callProvider(providerOverride, messages, options);
    }

    // Otherwise, try providers in priority order with failover
    const providers = this.providerManager.getAvailableProviders();

    if (providers.length === 0) {
      throw new Error('No AI providers available — all circuit breakers open');
    }

    let lastError: Error | undefined;

    for (const provider of providers) {
      if (!globalConfig.fallbackEnabled && providers.indexOf(provider) > 0) {
        break;
      }

      try {
        this.logger.debug(`Routing to provider: ${provider.name}`);
        const result = await this.callProvider(
          provider.name,
          messages,
          options,
        );
        return result;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error('Provider failed');
        // Log provider + error kind only — never the message body/prompt.
        const kind = err instanceof AIProviderError ? err.kind : 'ERROR';
        this.logger.warn(`Provider ${provider.name} failed (${kind})`);

        if (!globalConfig.fallbackEnabled) break;
      }
    }

    throw lastError ?? new Error('All AI providers failed');
  }

  private async callProvider(
    providerName: string,
    messages: AIMessage[],
    options?: AIRequestOptions,
  ): Promise<AIResponse & { retryCount: number }> {
    const provider = this.providerManager.getProvider(providerName);
    if (!provider) throw new Error(`Provider not found: ${providerName}`);

    if (!this.circuitBreaker.isAllowed(providerName)) {
      throw new Error(`Circuit breaker OPEN for provider: ${providerName}`);
    }

    try {
      const { result, retryCount } = await this.retryPolicy.execute(
        () => provider.chat(messages, options),
        providerName,
      );

      this.circuitBreaker.recordSuccess(providerName);
      return { ...result, retryCount };
    } catch (err) {
      this.circuitBreaker.recordFailure(providerName);
      throw err;
    }
  }
}
