import { RetryPolicyService } from '../retry-policy.service';
import { AIProviderError } from '../errors/ai-provider.error';

describe('RetryPolicyService', () => {
  let service: RetryPolicyService;

  beforeEach(() => {
    service = new RetryPolicyService();
    service.configure({
      maxRetries: 2,
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffMultiplier: 2,
      timeoutMs: 5_000,
      // Deterministic backoff for the timing assertions below.
      jitter: false,
    });
  });

  it('resolves immediately on success', async () => {
    const op = jest.fn().mockResolvedValue('ok');
    const { result, retryCount } = await service.execute(op, 'p');
    expect(result).toBe('ok');
    expect(retryCount).toBe(0);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    const op = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');
    const { result, retryCount } = await service.execute(op, 'p');
    expect(result).toBe('ok');
    expect(retryCount).toBe(1);
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries', async () => {
    const op = jest.fn().mockRejectedValue(new Error('always-fail'));
    await expect(service.execute(op, 'p')).rejects.toThrow('always-fail');
    expect(op).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('does not retry on timeout', async () => {
    const op = jest
      .fn()
      .mockRejectedValue(new Error('Request timeout after 5000ms [p]'));
    await expect(service.execute(op, 'p')).rejects.toThrow('timeout');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('applies exponential backoff', async () => {
    service.configure({
      initialDelayMs: 50,
      backoffMultiplier: 3,
      maxDelayMs: 1000,
      jitter: false,
    });
    const delays: number[] = [];
    const originalSleep = (service as any).sleep.bind(service);
    jest.spyOn(service as any, 'sleep').mockImplementation((ms: number) => {
      delays.push(ms);
      return Promise.resolve();
    });

    const op = jest
      .fn()
      .mockRejectedValueOnce(new Error('e'))
      .mockRejectedValueOnce(new Error('e'))
      .mockResolvedValue('ok');
    await service.execute(op, 'p');

    expect(delays[0]).toBe(50); // 50 * 3^0
    expect(delays[1]).toBe(150); // 50 * 3^1
  });

  it('caps delay at maxDelayMs', async () => {
    service.configure({
      initialDelayMs: 1000,
      backoffMultiplier: 100,
      maxDelayMs: 500,
      jitter: false,
    });
    const delays: number[] = [];
    jest.spyOn(service as any, 'sleep').mockImplementation((ms: number) => {
      delays.push(ms);
      return Promise.resolve();
    });

    const op = jest
      .fn()
      .mockRejectedValueOnce(new Error('e'))
      .mockResolvedValue('ok');
    await service.execute(op, 'p');

    expect(delays[0]).toBe(500);
  });

  it('applies jitter within [base/2, base] when enabled', async () => {
    service.configure({
      initialDelayMs: 100,
      backoffMultiplier: 2,
      maxDelayMs: 10_000,
      jitter: true,
    });
    const delays: number[] = [];
    jest.spyOn(service as any, 'sleep').mockImplementation((ms: number) => {
      delays.push(ms);
      return Promise.resolve();
    });

    const op = jest
      .fn()
      .mockRejectedValueOnce(new Error('e'))
      .mockResolvedValue('ok');
    await service.execute(op, 'p');

    // base = 100 * 2^0 = 100 → jittered in [50, 100]
    expect(delays[0]).toBeGreaterThanOrEqual(50);
    expect(delays[0]).toBeLessThanOrEqual(100);
  });

  // ── Error classification: NO RETRY on client/permanent errors ──────────────
  it.each([400, 401, 403, 404, 409, 422])(
    'does NOT retry on HTTP %i (permanent client error)',
    async (status) => {
      const op = jest.fn().mockRejectedValue(
        new AIProviderError('litellm', `HTTP ${status}`, {
          statusCode: status,
        }),
      );
      await expect(service.execute(op, 'litellm')).rejects.toBeInstanceOf(
        AIProviderError,
      );
      expect(op).toHaveBeenCalledTimes(1);
    },
  );

  it('does NOT retry on a provider TIMEOUT error', async () => {
    const op = jest
      .fn()
      .mockRejectedValue(
        new AIProviderError('litellm', 'timeout', { kind: 'TIMEOUT' }),
      );
    await expect(service.execute(op, 'litellm')).rejects.toBeInstanceOf(
      AIProviderError,
    );
    expect(op).toHaveBeenCalledTimes(1);
  });

  // ── Error classification: RETRY on transient errors ────────────────────────
  it.each([429, 500, 502, 503, 504])(
    'retries on HTTP %i (transient) then succeeds',
    async (status) => {
      const op = jest
        .fn()
        .mockRejectedValueOnce(
          new AIProviderError('litellm', `HTTP ${status}`, {
            statusCode: status,
          }),
        )
        .mockResolvedValue('ok');
      const { result, retryCount } = await service.execute(op, 'litellm');
      expect(result).toBe('ok');
      expect(retryCount).toBe(1);
      expect(op).toHaveBeenCalledTimes(2);
    },
  );

  it('retries on a NETWORK error then succeeds', async () => {
    const op = jest
      .fn()
      .mockRejectedValueOnce(
        new AIProviderError('litellm', 'unavailable', { kind: 'NETWORK' }),
      )
      .mockResolvedValue('ok');
    const { result } = await service.execute(op, 'litellm');
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(2);
  });
});
