/**
 * Shared AI Gateway hook — used by both Desktop and Mobile views.
 * Single entry point for all AI requests from the frontend.
 * Finance data: READ ONLY via backend AI endpoints. No write operations.
 */
import { useState, useCallback } from 'react';
import api from '../lib/api';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIGatewayRequest {
  messages: AIMessage[];
  clubId?: string;
  sessionId?: string;
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
  };
  /** Force a specific provider — must match backend ChatRequestDto (top-level). */
  providerOverride?: 'litellm' | 'openrouter' | 'ollama';
}

export interface AIGatewayResponse {
  requestId: string;
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
  status: 'active' | 'inactive' | 'error';
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  latencyMs?: number;
  lastError?: string;
  lastCheckedAt: string;
}

export interface AIHealthStatus {
  status: 'healthy' | 'degraded';
  defaultProvider: string;
  defaultModel: string;
  providers: AIProviderHealth[];
  telemetry: {
    totalRequests: number;
    successRate: number;
    totalCostUsd: number;
  };
  checkedAt: string;
}

interface UseAIGatewayState {
  loading: boolean;
  error: string | null;
  lastResponse: AIGatewayResponse | null;
}

export function useAIGateway() {
  const [state, setState] = useState<UseAIGatewayState>({
    loading: false,
    error: null,
    lastResponse: null,
  });

  const chat = useCallback(
    async (request: AIGatewayRequest): Promise<AIGatewayResponse> => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const response = await api.post<{ data: AIGatewayResponse }>(
          '/ai/chat',
          request,
        );
        const data = response.data.data;
        setState({ loading: false, error: null, lastResponse: data });
        return data;
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        const msg =
          axiosErr?.response?.data?.message ??
          axiosErr?.message ??
          'AI Gateway error';
        setState((s) => ({ ...s, loading: false, error: msg }));
        throw new Error(msg, { cause: err });
      }
    },
    [],
  );

  const getHealth = useCallback(async (): Promise<AIHealthStatus> => {
    const response = await api.get<{ data: AIHealthStatus }>('/ai/health');
    return response.data.data;
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, lastResponse: null });
  }, []);

  return {
    ...state,
    chat,
    getHealth,
    reset,
  };
}
