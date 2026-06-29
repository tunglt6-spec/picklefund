import { AIRouterService } from '../ai-router.service';
import { AIProviderManagerService } from '../ai-provider-manager.service';
import { CircuitBreakerService } from '../circuit-breaker.service';
import { RetryPolicyService } from '../retry-policy.service';
import { AIConfigService } from '../ai-config.service';
import { AIMessage, AIResponse } from '../interfaces/ai-provider.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';

const mockResponse = (provider: string): AIResponse => ({
  content: 'Hello',
  model: 'test-model',
  provider,
  promptTokens: 10,
  completionTokens: 5,
  totalTokens: 15,
  estimatedCostUsd: 0.0001,
  latencyMs: 100,
  retryCount: 0,
});

describe('AIRouterService', () => {
  let router: AIRouterService;
  let providerManager: jest.Mocked<AIProviderManagerService>;
  let circuitBreaker: CircuitBreakerService;
  let retryPolicy: RetryPolicyService;
  let aiConfig: AIConfigService;

  const messages: AIMessage[] = [{ role: 'user', content: 'Hello' }];

  beforeEach(async () => {
    circuitBreaker = new CircuitBreakerService();
    retryPolicy = new RetryPolicyService();
    retryPolicy.configure({
      maxRetries: 1,
      initialDelayMs: 1,
      maxDelayMs: 1,
      backoffMultiplier: 1,
      timeoutMs: 5000,
    });

    const mockProvider = (name: string, chatFn: () => Promise<AIResponse>) => ({
      name,
      priority: name === 'litellm' ? 1 : 2,
      isEnabled: () => true,
      chat: jest.fn().mockImplementation(chatFn),
      healthCheck: jest.fn(),
    });

    const litellmProvider = mockProvider('litellm', () =>
      Promise.resolve(mockResponse('litellm')),
    );
    const openrouterProvider = mockProvider('openrouter', () =>
      Promise.resolve(mockResponse('openrouter')),
    );

    providerManager = {
      getProvider: jest.fn((name: string) =>
        name === 'litellm' ? litellmProvider : openrouterProvider,
      ),
      getAvailableProviders: jest.fn(() => [
        litellmProvider,
        openrouterProvider,
      ]),
      checkHealth: jest.fn(),
      registerProvider: jest.fn(),
      listProviders: jest.fn(),
      resetCircuitBreaker: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [AIConfigService],
    }).compile();
    aiConfig = module.get(AIConfigService);

    router = new AIRouterService(
      providerManager,
      circuitBreaker,
      retryPolicy,
      aiConfig,
    );
  });

  it('routes to first available provider', async () => {
    const result = await router.route(messages);
    expect(result.provider).toBe('litellm');
  });

  it('routes to specific provider when overridden', async () => {
    const result = await router.route(messages, undefined, 'openrouter');
    expect(result.provider).toBe('openrouter');
  });

  it('fails over to next provider when primary fails', async () => {
    const failProvider = {
      name: 'litellm',
      priority: 1,
      isEnabled: () => true,
      chat: jest.fn().mockRejectedValue(new Error('LiteLLM down')),
      healthCheck: jest.fn(),
    };
    const goodProvider = {
      name: 'openrouter',
      priority: 2,
      isEnabled: () => true,
      chat: jest.fn().mockResolvedValue(mockResponse('openrouter')),
      healthCheck: jest.fn(),
    };

    (providerManager.getAvailableProviders as jest.Mock).mockReturnValue([
      failProvider,
      goodProvider,
    ]);
    (providerManager.getProvider as jest.Mock).mockImplementation(
      (n: string) => (n === 'litellm' ? failProvider : goodProvider),
    );

    const result = await router.route(messages);
    expect(result.provider).toBe('openrouter');
  });

  it('throws when no providers are available', async () => {
    (providerManager.getAvailableProviders as jest.Mock).mockReturnValue([]);
    await expect(router.route(messages)).rejects.toThrow(
      'No AI providers available',
    );
  });

  it('records circuit breaker success after successful call', async () => {
    const cbSpy = jest.spyOn(circuitBreaker, 'recordSuccess');
    await router.route(messages, undefined, 'litellm');
    expect(cbSpy).toHaveBeenCalledWith('litellm');
  });

  it('records circuit breaker failure after failed call', async () => {
    const failProvider = {
      name: 'litellm',
      priority: 1,
      isEnabled: () => true,
      chat: jest.fn().mockRejectedValue(new Error('fail')),
      healthCheck: jest.fn(),
    };
    (providerManager.getProvider as jest.Mock).mockReturnValue(failProvider);
    (providerManager.getAvailableProviders as jest.Mock).mockReturnValue([
      failProvider,
    ]);

    const cbSpy = jest.spyOn(circuitBreaker, 'recordFailure');
    await expect(router.route(messages)).rejects.toThrow();
    expect(cbSpy).toHaveBeenCalledWith('litellm');
  });
});
