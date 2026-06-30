import { ConfigService } from '@nestjs/config';
import { BudgetExceededError, EmbeddingService } from './embedding.service';
import { LocalHashEmbeddingProvider } from './local-hash-embedding.provider';
import { VectorObservabilityService } from './vector-observability.service';
import { IEmbeddingProvider } from './embedding.interface';

function cfg(values: Record<string, string> = {}): ConfigService {
  return {
    get: (k: string, d?: string) => values[k] ?? d,
  } as unknown as ConfigService;
}

class FailingEmbeddingProvider implements IEmbeddingProvider {
  readonly name = 'fail';
  readonly version = 'v1';
  readonly dimension = 4;
  embed(): Promise<number[][]> {
    return Promise.reject(new Error('boom'));
  }
}

describe('EmbeddingService', () => {
  let obs: VectorObservabilityService;
  let provider: LocalHashEmbeddingProvider;

  beforeEach(() => {
    obs = new VectorObservabilityService();
    provider = new LocalHashEmbeddingProvider(16);
  });

  it('exposes version + dimension from provider', () => {
    const svc = new EmbeddingService(provider, cfg(), obs);
    expect(svc.dimension).toBe(16);
    expect(svc.version).toBe('local-hash:v1');
  });

  it('caches embeddings (provider called once for repeated text)', async () => {
    const svc = new EmbeddingService(provider, cfg(), obs);
    const spy = jest.spyOn(provider, 'embed');
    await svc.embed(['hello']);
    await svc.embed(['hello']);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(obs.snapshot().cacheHit).toBe(1);
    expect(obs.snapshot().cacheMiss).toBe(1);
  });

  it('batches misses by EMBEDDING_MAX_BATCH', async () => {
    const svc = new EmbeddingService(
      provider,
      cfg({ EMBEDDING_MAX_BATCH: '2' }),
      obs,
    );
    const spy = jest.spyOn(provider, 'embed');
    await svc.embed(['a', 'b', 'c']); // 3 misses → chunks [a,b],[c]
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('cost guardrail: budget exceeded → BudgetExceededError', async () => {
    const svc = new EmbeddingService(
      provider,
      cfg({ EMBEDDING_DAILY_BUDGET: '1' }),
      obs,
    );
    await expect(svc.embed(['a', 'b'])).rejects.toBeInstanceOf(
      BudgetExceededError,
    );
  });

  it('retry then dead-letter on persistent failure', async () => {
    const svc = new EmbeddingService(
      new FailingEmbeddingProvider(),
      cfg({ EMBEDDING_MAX_RETRIES: '1' }),
      obs,
    );
    await expect(svc.embed(['x'])).rejects.toThrow('boom');
    expect(svc.getDeadLetters()).toHaveLength(1);
    expect(obs.snapshot().embeddingFailures).toBeGreaterThanOrEqual(2); // initial + 1 retry
  });

  it('DLQ never stores raw text (only hash + safe metadata)', async () => {
    const svc = new EmbeddingService(
      new FailingEmbeddingProvider(),
      cfg({ EMBEDDING_MAX_RETRIES: '0' }),
      obs,
    );
    const secret = 'super secret raw text 0912345678';
    await expect(svc.embed([secret])).rejects.toBeDefined();
    const dlq = svc.getDeadLetters()[0] as unknown as Record<string, unknown>;
    // No raw-text fields.
    for (const k of [
      'text',
      'rawText',
      'input',
      'content',
      'title',
      'snippet',
    ]) {
      expect(dlq[k]).toBeUndefined();
    }
    expect(JSON.stringify(dlq)).not.toContain(secret);
    // Safe fields present; textHash is sha256 hex (64 chars).
    expect(typeof dlq.textHash).toBe('string');
    expect(dlq.textHash as string).toMatch(/^[a-f0-9]{64}$/);
    expect(dlq.requestId).toBeDefined();
    expect(dlq.length).toBe(secret.length);
  });

  it('non-Error rejection still dead-letters + throws', async () => {
    const weird: IEmbeddingProvider = {
      name: 'weird',
      version: 'v1',
      dimension: 4,
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      embed: () => Promise.reject('string failure'),
    };
    const svc = new EmbeddingService(
      weird,
      cfg({ EMBEDDING_MAX_RETRIES: '0' }),
      obs,
    );
    await expect(svc.embed(['x'])).rejects.toBeDefined();
    expect(svc.getDeadLetters()).toHaveLength(1);
  });

  it('BudgetExceededError default message', () => {
    expect(new BudgetExceededError().message).toContain('budget');
  });

  it('returns vectors aligned to input order', async () => {
    const svc = new EmbeddingService(provider, cfg(), obs);
    const vectors = await svc.embed(['a', 'b']);
    expect(vectors).toHaveLength(2);
    expect(vectors[0]).toHaveLength(16);
  });
});
