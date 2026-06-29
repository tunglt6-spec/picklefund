export type AIProviderStatus = 'active' | 'inactive' | 'error';
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequestOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  timeout?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  retryCount: number;
}

export interface AIProviderHealth {
  provider: string;
  status: AIProviderStatus;
  circuitBreakerState: CircuitBreakerState;
  latencyMs?: number;
  lastError?: string;
  lastCheckedAt: Date;
}

export interface AIProviderConfig {
  name: string;
  enabled: boolean;
  priority: number;
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
  costPerInputToken: number;
  costPerOutputToken: number;
  maxContextTokens: number;
  timeoutMs: number;
}

/** Minimal shape of an OpenAI-compatible chat completion (LiteLLM / OpenRouter). */
export interface OpenAIChatCompletion {
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/** Minimal shape of an Ollama /api/chat response. */
export interface OllamaChatResponse {
  model?: string;
  message?: { content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface IAIProvider {
  readonly name: string;
  readonly priority: number;
  isEnabled(): boolean;
  chat(messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse>;
  healthCheck(): Promise<AIProviderHealth>;
}
