import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProviderConfig } from './interfaces/ai-provider.interface';
import { RetryPolicyConfig } from './retry-policy.service';
import { CircuitBreakerConfig } from './circuit-breaker.service';

export interface AIGlobalConfig {
  defaultProvider: string;
  defaultModel: string;
  timeoutMs: number;
  maxTokens: number;
  temperature: number;
  topP: number;
  fallbackEnabled: boolean;
  ollamaFallbackEnabled: boolean;
}

@Injectable()
export class AIConfigService implements OnModuleInit {
  private readonly logger = new Logger(AIConfigService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.logger.log('AI Config Service initialized');
    this.logger.log(`Default provider: ${this.getGlobal().defaultProvider}`);
    this.validateConfig();
  }

  /**
   * Fail fast: in production an enabled provider missing its required config is
   * a deploy error, not a silent runtime degradation. In dev/test we only warn
   * so the harness still boots with localhost defaults.
   */
  private validateConfig(): void {
    const isProduction = this.config.get('NODE_ENV') === 'production';
    const problems: string[] = [];

    const litellm = this.getLiteLLMConfig();
    if (litellm.enabled) {
      if (!litellm.baseUrl)
        problems.push('LITELLM_BASE_URL is required when LITELLM_ENABLED=true');
      if (!litellm.apiKey)
        problems.push('LITELLM_API_KEY is required when LITELLM_ENABLED=true');
    }

    const openrouter = this.getOpenRouterConfig();
    if (openrouter.enabled) {
      if (!openrouter.baseUrl)
        problems.push(
          'OPENROUTER_BASE_URL is required when OPENROUTER_ENABLED=true',
        );
      if (!openrouter.apiKey)
        problems.push(
          'OPENROUTER_API_KEY is required when OPENROUTER_ENABLED=true',
        );
    }

    const ollama = this.getOllamaConfig();
    if (ollama.enabled && !ollama.baseUrl) {
      problems.push(
        'OLLAMA_BASE_URL is required when AI_FALLBACK_TO_LOCAL=true',
      );
    }

    if (problems.length === 0) return;

    const summary = `AI Harness configuration invalid:\n - ${problems.join('\n - ')}`;
    if (isProduction) {
      throw new Error(summary);
    }
    this.logger.warn(summary);
  }

  getGlobal(): AIGlobalConfig {
    return {
      defaultProvider: this.config.get('AI_DEFAULT_PROVIDER', 'litellm'),
      defaultModel: this.config.get('AI_DEFAULT_MODEL', 'claude-sonnet-4-6'),
      timeoutMs: Number(this.config.get('AI_TIMEOUT_MS', '30000')),
      maxTokens: Number(this.config.get('AI_MAX_TOKENS', '4096')),
      temperature: Number(this.config.get('AI_TEMPERATURE', '0.7')),
      topP: Number(this.config.get('AI_TOP_P', '1.0')),
      fallbackEnabled:
        this.config.get('AI_FALLBACK_ENABLED', 'true') === 'true',
      ollamaFallbackEnabled:
        this.config.get('AI_FALLBACK_TO_LOCAL', 'false') === 'true',
    };
  }

  getLiteLLMConfig(): AIProviderConfig {
    return {
      name: 'litellm',
      enabled: this.config.get('LITELLM_ENABLED', 'true') === 'true',
      priority: Number(this.config.get('LITELLM_PRIORITY', '1')),
      baseUrl: this.config.get('LITELLM_BASE_URL', 'http://localhost:4000'),
      apiKey: this.config.get('LITELLM_API_KEY', ''),
      defaultModel: this.config.get(
        'LITELLM_DEFAULT_MODEL',
        'claude-sonnet-4-6',
      ),
      costPerInputToken: Number(
        this.config.get('LITELLM_COST_INPUT_PER_TOKEN', '0.000003'),
      ),
      costPerOutputToken: Number(
        this.config.get('LITELLM_COST_OUTPUT_PER_TOKEN', '0.000015'),
      ),
      maxContextTokens: Number(
        this.config.get('LITELLM_CONTEXT_WINDOW', '200000'),
      ),
      timeoutMs: Number(this.config.get('AI_TIMEOUT_MS', '30000')),
    };
  }

  getOpenRouterConfig(): AIProviderConfig {
    return {
      name: 'openrouter',
      enabled: this.config.get('OPENROUTER_ENABLED', 'false') === 'true',
      priority: Number(this.config.get('OPENROUTER_PRIORITY', '2')),
      baseUrl: this.config.get(
        'OPENROUTER_BASE_URL',
        'https://openrouter.ai/api/v1',
      ),
      apiKey: this.config.get('OPENROUTER_API_KEY', ''),
      defaultModel: this.config.get(
        'OPENROUTER_DEFAULT_MODEL',
        'openai/gpt-4o',
      ),
      costPerInputToken: Number(
        this.config.get('OPENROUTER_COST_INPUT_PER_TOKEN', '0.000005'),
      ),
      costPerOutputToken: Number(
        this.config.get('OPENROUTER_COST_OUTPUT_PER_TOKEN', '0.000015'),
      ),
      maxContextTokens: Number(
        this.config.get('OPENROUTER_CONTEXT_WINDOW', '128000'),
      ),
      timeoutMs: Number(this.config.get('AI_TIMEOUT_MS', '30000')),
    };
  }

  getOllamaConfig(): AIProviderConfig {
    return {
      name: 'ollama',
      enabled: this.config.get('AI_FALLBACK_TO_LOCAL', 'false') === 'true',
      priority: Number(this.config.get('OLLAMA_PRIORITY', '3')),
      baseUrl: this.config.get('OLLAMA_BASE_URL', 'http://localhost:11434'),
      defaultModel: this.config.get('OLLAMA_DEFAULT_MODEL', 'llama3.2'),
      costPerInputToken: 0,
      costPerOutputToken: 0,
      maxContextTokens: Number(
        this.config.get('OLLAMA_CONTEXT_WINDOW', '32000'),
      ),
      timeoutMs: Number(this.config.get('OLLAMA_TIMEOUT_MS', '60000')),
    };
  }

  getRetryConfig(): RetryPolicyConfig {
    return {
      maxRetries: Number(this.config.get('AI_MAX_RETRIES', '3')),
      initialDelayMs: Number(
        this.config.get('AI_RETRY_INITIAL_DELAY_MS', '500'),
      ),
      maxDelayMs: Number(this.config.get('AI_RETRY_MAX_DELAY_MS', '10000')),
      backoffMultiplier: Number(this.config.get('AI_RETRY_BACKOFF', '2')),
      timeoutMs: Number(this.config.get('AI_TIMEOUT_MS', '30000')),
      jitter: this.config.get('AI_RETRY_JITTER', 'true') === 'true',
    };
  }

  getCircuitBreakerConfig(): CircuitBreakerConfig {
    return {
      failureThreshold: Number(this.config.get('AI_CB_FAILURE_THRESHOLD', '5')),
      recoveryTimeoutMs: Number(
        this.config.get('AI_CB_RECOVERY_TIMEOUT_MS', '60000'),
      ),
      halfOpenMaxCalls: Number(this.config.get('AI_CB_HALF_OPEN_CALLS', '1')),
    };
  }
}
