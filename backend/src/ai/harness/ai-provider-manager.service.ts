import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  IAIProvider,
  AIProviderHealth,
} from './interfaces/ai-provider.interface';
import { AIConfigService } from './ai-config.service';
import { LiteLLMProvider } from './providers/litellm.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { CircuitBreakerService } from './circuit-breaker.service';
import { RetryPolicyService } from './retry-policy.service';

@Injectable()
export class AIProviderManagerService implements OnModuleInit {
  private readonly logger = new Logger(AIProviderManagerService.name);
  private readonly providers = new Map<string, IAIProvider>();

  constructor(
    private readonly aiConfig: AIConfigService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly retryPolicy: RetryPolicyService,
  ) {}

  onModuleInit() {
    // Apply configurable settings from env/config
    this.circuitBreaker.configure(this.aiConfig.getCircuitBreakerConfig());
    this.retryPolicy.configure(this.aiConfig.getRetryConfig());

    // Register providers in priority order
    this.registerProvider(
      new LiteLLMProvider(this.aiConfig.getLiteLLMConfig()),
    );
    this.registerProvider(
      new OpenRouterProvider(this.aiConfig.getOpenRouterConfig()),
    );
    this.registerProvider(new OllamaProvider(this.aiConfig.getOllamaConfig()));

    const enabled = [...this.providers.values()]
      .filter((p) => p.isEnabled())
      .map((p) => p.name);
    this.logger.log(
      `AI Providers registered: ${[...this.providers.keys()].join(', ')} | Enabled: ${enabled.join(', ') || 'none'}`,
    );
  }

  registerProvider(provider: IAIProvider): void {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): IAIProvider | undefined {
    return this.providers.get(name);
  }

  getEnabledProviders(): IAIProvider[] {
    return [...this.providers.values()]
      .filter((p) => p.isEnabled())
      .sort((a, b) => a.priority - b.priority);
  }

  getAvailableProviders(): IAIProvider[] {
    return this.getEnabledProviders().filter((p) =>
      this.circuitBreaker.isAllowed(p.name),
    );
  }

  async checkHealth(): Promise<AIProviderHealth[]> {
    const checks = [...this.providers.values()].map(async (p) => {
      const health = await p.healthCheck().catch(
        (): AIProviderHealth => ({
          provider: p.name,
          status: 'error',
          circuitBreakerState: this.circuitBreaker.getState(p.name),
          lastCheckedAt: new Date(),
        }),
      );
      health.circuitBreakerState = this.circuitBreaker.getState(p.name);
      return health;
    });
    return Promise.all(checks);
  }

  listProviders(): Array<{
    name: string;
    enabled: boolean;
    priority: number;
    circuitBreakerState: string;
  }> {
    return [...this.providers.values()].map((p) => ({
      name: p.name,
      enabled: p.isEnabled(),
      priority: p.priority,
      circuitBreakerState: this.circuitBreaker.getState(p.name),
    }));
  }

  resetCircuitBreaker(providerName: string): void {
    this.circuitBreaker.reset(providerName);
    this.logger.log(`Circuit breaker reset for: ${providerName}`);
  }
}
