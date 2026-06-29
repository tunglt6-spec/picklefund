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

export class LiteLLMProvider implements IAIProvider {
  readonly name = 'litellm';
  readonly priority: number;
  private readonly logger = new Logger(LiteLLMProvider.name);
  private readonly config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.priority = config.priority;
  }

  isEnabled(): boolean {
    return this.config.enabled && Boolean(this.config.baseUrl);
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
        headers: this.buildHeaders(),
        body,
        signal: controller.signal,
      });

      if (!res.ok) {
        // Drain the body so the socket can be reused, but never surface it —
        // it may contain prompt echoes, keys or PII. Only the status is kept.
        await res.text().catch(() => undefined);
        throw new AIProviderError(
          this.name,
          `LiteLLM provider error (HTTP ${res.status})`,
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
          `LiteLLM request timeout after ${this.config.timeoutMs}ms`,
          { kind: 'TIMEOUT' },
        );
      }
      // fetch/network failure (ECONNRESET, ECONNREFUSED, DNS, …) — transient.
      throw new AIProviderError(this.name, 'LiteLLM provider unavailable', {
        kind: 'NETWORK',
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async healthCheck(): Promise<AIProviderHealth> {
    const startMs = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5_000);
      const res = await fetch(`${this.config.baseUrl}/health`, {
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

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }
}
