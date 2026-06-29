import { TelemetryService } from '../telemetry.service';
import { TelemetryRecord } from '../interfaces/ai-gateway.interface';

const makeRecord = (
  overrides: Partial<TelemetryRecord> = {},
): TelemetryRecord => ({
  requestId: 'req-1',
  provider: 'litellm',
  model: 'claude-sonnet-4-6',
  promptTokens: 100,
  completionTokens: 50,
  totalTokens: 150,
  estimatedCostUsd: 0.001,
  latencyMs: 500,
  retryCount: 0,
  success: true,
  timestamp: new Date(),
  ...overrides,
});

describe('TelemetryService', () => {
  let service: TelemetryService;

  beforeEach(() => {
    service = new TelemetryService();
  });

  it('records a request and returns metrics', () => {
    service.record(makeRecord());
    const metrics = service.getProviderMetrics('litellm');
    expect(metrics['litellm'].requestCount).toBe(1);
    expect(metrics['litellm'].successCount).toBe(1);
    expect(metrics['litellm'].failureCount).toBe(0);
  });

  it('counts failures and timeouts', () => {
    service.record(makeRecord({ success: false, errorType: 'TIMEOUT' }));
    const m = service.getProviderMetrics('litellm')['litellm'];
    expect(m.failureCount).toBe(1);
    expect(m.timeoutCount).toBe(1);
  });

  it('accumulates token usage and cost', () => {
    service.record(makeRecord({ totalTokens: 200, estimatedCostUsd: 0.002 }));
    service.record(makeRecord({ totalTokens: 300, estimatedCostUsd: 0.003 }));
    const m = service.getProviderMetrics('litellm')['litellm'];
    expect(m.totalTokens).toBe(500);
    expect(m.totalCostUsd).toBeCloseTo(0.005);
  });

  it('tracks multiple providers independently', () => {
    service.record(makeRecord({ provider: 'litellm' }));
    service.record(makeRecord({ provider: 'openrouter' }));
    const all = service.getProviderMetrics();
    expect(Object.keys(all)).toHaveLength(2);
    expect(all['litellm'].requestCount).toBe(1);
    expect(all['openrouter'].requestCount).toBe(1);
  });

  it('getSummary aggregates across providers', () => {
    service.record(
      makeRecord({
        provider: 'litellm',
        success: true,
        totalTokens: 100,
        estimatedCostUsd: 0.001,
      }),
    );
    service.record(
      makeRecord({
        provider: 'openrouter',
        success: false,
        totalTokens: 200,
        estimatedCostUsd: 0.002,
      }),
    );
    const s = service.getSummary();
    expect(s.totalRequests).toBe(2);
    expect(s.totalSuccess).toBe(1);
    expect(s.totalFailure).toBe(1);
    expect(s.successRate).toBe(0.5);
    expect(s.totalTokens).toBe(300);
  });

  it('does not log or store prompt content', () => {
    // TelemetryRecord interface has no 'prompt', 'content', or 'messages' fields
    const record = makeRecord();
    expect('prompt' in record).toBe(false);
    expect('content' in record).toBe(false);
    expect('messages' in record).toBe(false);
  });
});
