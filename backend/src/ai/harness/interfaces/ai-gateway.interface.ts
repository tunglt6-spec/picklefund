import {
  AIMessage,
  AIRequestOptions,
  AIResponse,
} from './ai-provider.interface';

export interface AIGatewayRequest {
  messages: AIMessage[];
  clubId?: string;
  userId?: string;
  sessionId?: string;
  options?: AIRequestOptions;
  providerOverride?: string;
}

export interface AIGatewayResponse extends AIResponse {
  requestId: string;
  clubId?: string;
  userId?: string;
  sessionId?: string;
}

export interface TelemetryRecord {
  requestId: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  retryCount: number;
  success: boolean;
  errorType?: string;
  clubId?: string;
  userId?: string;
  timestamp: Date;
}

export interface TokenUsageSummary {
  totalRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCostUsd: number;
}
