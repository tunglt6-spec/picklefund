import { Logger } from '@nestjs/common';
import {
  IAIProvider,
  AIMessage,
  AIRequestOptions,
  AIResponse,
  AIProviderHealth,
  AIProviderConfig,
  OpenAIChatCompletion,
} from '../interfaces/ai-provider.interface';
import { AIProviderError } from '../errors/ai-provider.error';

export class OpenRouterProvider implements IAIProvider {
  readonly name = 'openrouter';
  readonly priority: number;
  private readonly logger = new Logger(OpenRouterProvider.name);
  private readonly config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.priority = config.priority;
  }

  isEnabled(): boolean {
    return this.config.enabled && Boolean(this.config.apiKey);
  }

  async chat(
    messages: AIMessage[],
    options?: AIRequestOptions,
  ): Promise<AIResponse> {
    const model = options?.model ?? this.config.defaultModel;
    const startMs = Date.now();

    const body = JSON.stringify({
      model,
      messages,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP ?? 1.0,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options?.timeout ?? this.config.timeoutMs,
    );

    try {
      const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
          'HTTP-Referer': 'https://picklefund.app',
          'X-Title': 'PickleFund AI',
        },
        body,
        signal: controller.signal,
      });

      if (!res.ok) {
        await res.text().catch(() => undefined);
        throw new AIProviderError(
          this.name,
          `OpenRouter provider error (HTTP ${res.status})`,
          { statusCode: res.status, kind: 'HTTP' },
        );
      }

      const data = (await res.json()) as OpenAIChatCompletion;
      const latencyMs = Date.now() - startMs;
      const usage = data.usage ?? {};
      const promptTokens: number = usage.prompt_tokens ?? 0;
      const completionTokens: number = usage.completion_tokens ?? 0;
      const totalTokens = promptTokens + completionTokens;

      return {
        content: data.choices?.[0]?.message?.content ?? '',
        model: data.model ?? model,
        provider: this.name,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostUsd:
          promptTokens * this.config.costPerInputToken +
          completionTokens * this.config.costPerOutputToken,
        latencyMs,
        retryCount: 0,
      };
    } catch (err: unknown) {
      if (err instanceof AIProviderError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new AIProviderError(
          this.name,
          `OpenRouter request timeout after ${this.config.timeoutMs}ms`,
          { kind: 'TIMEOUT' },
        );
      }
      throw new AIProviderError(this.name, 'OpenRouter provider unavailable', {
        kind: 'NETWORK',
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async healthCheck(): Promise<AIProviderHealth> {
    const startMs = Date.now();
    if (!this.isEnabled()) {
      return {
        provider: this.name,
        status: 'inactive',
        circuitBreakerState: 'CLOSED',
        lastCheckedAt: new Date(),
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5_000);
      const res = await fetch(`${this.config.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      return {
        provider: this.name,
        status: res.ok ? 'active' : 'error',
        circuitBreakerState: 'CLOSED',
        latencyMs: Date.now() - startMs,
        lastCheckedAt: new Date(),
      };
    } catch (err: unknown) {
      return {
        provider: this.name,
        status: 'error',
        circuitBreakerState: 'CLOSED',
        lastError: err instanceof Error ? err.message : 'health check failed',
        lastCheckedAt: new Date(),
      };
    }
  }
}
