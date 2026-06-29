import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AIGatewayService } from '../ai-gateway.service';
import { AIRouterService } from '../ai-router.service';
import { TelemetryService } from '../telemetry.service';
import { TokenAccountingService } from '../token-accounting.service';
import { AIProviderManagerService } from '../ai-provider-manager.service';
import { AIConfigService } from '../ai-config.service';
import { AIGatewayRequest } from '../interfaces/ai-gateway.interface';
import { AIResponse } from '../interfaces/ai-provider.interface';

const mockRouterResponse = (): AIResponse & { retryCount: number } => ({
  content: 'Response',
  model: 'claude-sonnet-4-6',
  provider: 'litellm',
  promptTokens: 100,
  completionTokens: 50,
  totalTokens: 150,
  estimatedCostUsd: 0.001,
  latencyMs: 200,
  retryCount: 0,
});

describe('AIGatewayService', () => {
  let gateway: AIGatewayService;
  let router: jest.Mocked<AIRouterService>;
  let telemetry: TelemetryService;
  let tokenAccounting: TokenAccountingService;
  let providerManager: jest.Mocked<AIProviderManagerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        AIConfigService,
        TelemetryService,
        TokenAccountingService,
        {
          provide: AIRouterService,
          useValue: {
            route: jest.fn().mockResolvedValue(mockRouterResponse()),
          },
        },
        {
          provide: AIProviderManagerService,
          useValue: {
            checkHealth: jest.fn().mockResolvedValue([
              {
                provider: 'litellm',
                status: 'active',
                circuitBreakerState: 'CLOSED',
                lastCheckedAt: new Date(),
              },
            ]),
          },
        },
        AIGatewayService,
      ],
    }).compile();

    gateway = module.get(AIGatewayService);
    router = module.get(AIRouterService);
    telemetry = module.get(TelemetryService);
    tokenAccounting = module.get(TokenAccountingService);
    providerManager = module.get(AIProviderManagerService);
  });

  const makeRequest = (
    overrides: Partial<AIGatewayRequest> = {},
  ): AIGatewayRequest => ({
    messages: [{ role: 'user', content: 'Hello' }],
    clubId: 'club-1',
    userId: 'user-1',
    sessionId: 'sess-1',
    ...overrides,
  });

  it('returns a response with requestId', async () => {
    const res = await gateway.chat(makeRequest());
    expect(res.requestId).toBeTruthy();
    expect(res.content).toBe('Response');
    expect(res.provider).toBe('litellm');
  });

  it('records telemetry on success', async () => {
    const spy = jest.spyOn(telemetry, 'record');
    await gateway.chat(makeRequest());
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, provider: 'litellm' }),
    );
  });

  it('records token accounting on success', async () => {
    const spy = jest.spyOn(tokenAccounting, 'record');
    await gateway.chat(
      makeRequest({ clubId: 'club-1', userId: 'user-1', sessionId: 'sess-1' }),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        clubId: 'club-1',
        userId: 'user-1',
        sessionId: 'sess-1',
        totalTokens: 150,
      }),
    );
  });

  it('records failed telemetry on error', async () => {
    router.route.mockRejectedValueOnce(new Error('Provider down'));
    const spy = jest.spyOn(telemetry, 'record');
    await expect(gateway.chat(makeRequest())).rejects.toThrow('Provider down');
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });

  it('getHealthStatus returns overall health', async () => {
    const health = await gateway.getHealthStatus();
    expect(health.status).toBe('healthy');
    expect(health.providers).toHaveLength(1);
    expect(health.providers[0].provider).toBe('litellm');
  });

  it('telemetry does not capture prompt content', async () => {
    const spy = jest.spyOn(telemetry, 'record');
    await gateway.chat(
      makeRequest({ messages: [{ role: 'user', content: 'SENSITIVE DATA' }] }),
    );
    const recorded = spy.mock.calls[0][0];
    expect(JSON.stringify(recorded)).not.toContain('SENSITIVE DATA');
  });
});
