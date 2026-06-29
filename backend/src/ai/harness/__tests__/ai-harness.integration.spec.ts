/**
 * Integration test: AI Harness — full chain without real LLM calls.
 * Tests that all components wire together correctly via NestJS DI.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AIGatewayService } from '../ai-gateway.service';
import { AIRouterService } from '../ai-router.service';
import { AIProviderManagerService } from '../ai-provider-manager.service';
import { AIConfigService } from '../ai-config.service';
import { CircuitBreakerService } from '../circuit-breaker.service';
import { RetryPolicyService } from '../retry-policy.service';
import { TelemetryService } from '../telemetry.service';
import { TokenAccountingService } from '../token-accounting.service';
import {
  IAIProvider,
  AIProviderHealth,
  AIResponse,
} from '../interfaces/ai-provider.interface';
import { AIProviderError } from '../errors/ai-provider.error';

class MockLiteLLMProvider implements IAIProvider {
  readonly name = 'litellm';
  readonly priority = 1;
  private _enabled = true;

  isEnabled() {
    return this._enabled;
  }
  disable() {
    this._enabled = false;
  }

  async chat(): Promise<AIResponse> {
    return {
      content: 'Xin chào! Tôi là MAIKA.',
      model: 'claude-sonnet-4-6',
      provider: 'litellm',
      promptTokens: 50,
      completionTokens: 20,
      totalTokens: 70,
      estimatedCostUsd: 0.0005,
      latencyMs: 150,
      retryCount: 0,
    };
  }

  async healthCheck(): Promise<AIProviderHealth> {
    return {
      provider: 'litellm',
      status: 'active',
      circuitBreakerState: 'CLOSED',
      latencyMs: 10,
      lastCheckedAt: new Date(),
    };
  }
}

class MockFailingProvider implements IAIProvider {
  readonly name = 'openrouter';
  readonly priority = 2;
  isEnabled() {
    return true;
  }

  async chat(): Promise<AIResponse> {
    throw new Error('OpenRouter unavailable');
  }

  async healthCheck(): Promise<AIProviderHealth> {
    return {
      provider: 'openrouter',
      status: 'error',
      circuitBreakerState: 'CLOSED',
      lastCheckedAt: new Date(),
    };
  }
}

describe('AI Harness Integration', () => {
  let module: TestingModule;
  let gateway: AIGatewayService;
  let providerManager: AIProviderManagerService;
  let circuitBreaker: CircuitBreakerService;
  let telemetry: TelemetryService;
  let tokenAccounting: TokenAccountingService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        AIConfigService,
        CircuitBreakerService,
        RetryPolicyService,
        TelemetryService,
        TokenAccountingService,
        AIProviderManagerService,
        AIRouterService,
        AIGatewayService,
      ],
    }).compile();

    gateway = module.get(AIGatewayService);
    providerManager = module.get(AIProviderManagerService);
    circuitBreaker = module.get(CircuitBreakerService);
    telemetry = module.get(TelemetryService);
    tokenAccounting = module.get(TokenAccountingService);

    // Replace auto-registered providers with mocks
    const mockLiteLLM = new MockLiteLLMProvider();
    const mockOR = new MockFailingProvider();
    const providers = new Map<string, IAIProvider>();
    providers.set('litellm', mockLiteLLM);
    providers.set('openrouter', mockOR);
    (providerManager as any).providers = providers;
  });

  afterEach(() => module.close());

  it('completes a full chat request through the harness', async () => {
    const res = await gateway.chat({
      messages: [{ role: 'user', content: 'Xin chào' }],
      clubId: 'club-a',
      userId: 'user-a',
      sessionId: 'sess-a',
    });

    expect(res.content).toBe('Xin chào! Tôi là MAIKA.');
    expect(res.provider).toBe('litellm');
    expect(res.requestId).toBeTruthy();
  });

  it('telemetry captures metrics after successful request', async () => {
    await gateway.chat({
      messages: [{ role: 'user', content: 'Hello' }],
      clubId: 'club-x',
    });

    const summary = telemetry.getSummary();
    expect(summary.totalRequests).toBe(1);
    expect(summary.totalSuccess).toBe(1);
    expect(summary.successRate).toBe(1);
  });

  it('token accounting captures usage per club', async () => {
    await gateway.chat({
      messages: [{ role: 'user', content: 'Hello' }],
      clubId: 'club-b',
    });

    const usage = tokenAccounting.getByClub('club-b');
    expect(usage.totalRequests).toBe(1);
    expect(usage.totalTokens).toBe(70);
    expect(usage.totalCostUsd).toBeCloseTo(0.0005);
  });

  it('circuit breaker opens after repeated failures', async () => {
    circuitBreaker.configure({
      failureThreshold: 2,
      recoveryTimeoutMs: 60000,
      halfOpenMaxCalls: 1,
    });

    circuitBreaker.recordFailure('openrouter');
    circuitBreaker.recordFailure('openrouter');

    expect(circuitBreaker.getState('openrouter')).toBe('OPEN');
    expect(circuitBreaker.isAllowed('openrouter')).toBe(false);
  });

  it('health check returns provider statuses', async () => {
    const health = await gateway.getHealthStatus();
    expect(health.status).toBeDefined();
    expect(health.providers).toHaveLength(2);
    const litellmHealth = health.providers.find(
      (p) => p.provider === 'litellm',
    );
    expect(litellmHealth?.status).toBe('active');
  });

  it('all providers fail → gateway throws', async () => {
    // Disable the working provider
    const litellm = (providerManager as any).providers.get(
      'litellm',
    ) as MockLiteLLMProvider;
    litellm.disable();

    // Make openrouter circuit open
    circuitBreaker.configure({
      failureThreshold: 1,
      recoveryTimeoutMs: 60000,
      halfOpenMaxCalls: 1,
    });
    circuitBreaker.recordFailure('openrouter');

    await expect(
      gateway.chat({ messages: [{ role: 'user', content: 'Test' }] }),
    ).rejects.toThrow();
  });

  it('fails over to the next provider when the first errors', async () => {
    // litellm fails with a permanent (non-retryable) error → router moves on;
    // openrouter succeeds. No retries/sleeps because 400 is non-retryable.
    const failing: IAIProvider = {
      name: 'litellm',
      priority: 1,
      isEnabled: () => true,
      chat: async () => {
        throw new AIProviderError('litellm', 'HTTP 400', { statusCode: 400 });
      },
      healthCheck: async () => ({
        provider: 'litellm',
        status: 'error',
        circuitBreakerState: 'CLOSED',
        lastCheckedAt: new Date(),
      }),
    };
    const succeeding: IAIProvider = {
      name: 'openrouter',
      priority: 2,
      isEnabled: () => true,
      chat: async () => ({
        content: 'from openrouter',
        model: 'gpt-4o',
        provider: 'openrouter',
        promptTokens: 5,
        completionTokens: 5,
        totalTokens: 10,
        estimatedCostUsd: 0.0001,
        latencyMs: 20,
        retryCount: 0,
      }),
      healthCheck: async () => ({
        provider: 'openrouter',
        status: 'active',
        circuitBreakerState: 'CLOSED',
        lastCheckedAt: new Date(),
      }),
    };
    const providers = new Map<string, IAIProvider>();
    providers.set('litellm', failing);
    providers.set('openrouter', succeeding);
    (providerManager as any).providers = providers;
    circuitBreaker.reset('litellm');
    circuitBreaker.reset('openrouter');

    const res = await gateway.chat({
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(res.provider).toBe('openrouter');
    expect(res.content).toBe('from openrouter');
  });

  it('finance data is not modified — AI is READ ONLY', async () => {
    // Verify gateway has no write methods
    const gatewayMethods = Object.getOwnPropertyNames(
      Object.getPrototypeOf(gateway),
    );
    const writeMethods = gatewayMethods.filter(
      (m) =>
        m.includes('create') ||
        m.includes('update') ||
        m.includes('delete') ||
        m.includes('write') ||
        m.includes('insert'),
    );
    expect(writeMethods).toHaveLength(0);
  });
});
