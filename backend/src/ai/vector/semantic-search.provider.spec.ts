import { ConfigService } from '@nestjs/config';
import { SemanticSearchProvider } from './semantic-search.provider';
import { EmbeddingService } from './embedding.service';
import { LocalHashEmbeddingProvider } from './local-hash-embedding.provider';
import { InMemoryVectorStoreProvider } from './in-memory-vector-store.provider';
import { VectorIndexService } from './vector-index.service';
import { VectorObservabilityService } from './vector-observability.service';
import { VectorContentPolicyService } from './vector-content-policy.service';
import { ClubMemoryService } from '../club-memory/club-memory.service';
import { InMemoryClubMemoryRepository } from '../club-memory/club-memory.repository';
import { ClubMemoryType } from '../club-memory/club-memory.types';
import { IEmbeddingProvider } from './embedding.interface';

function cfg(values: Record<string, string> = {}): ConfigService {
  return {
    get: (k: string, d?: string) => values[k] ?? d,
  } as unknown as ConfigService;
}

class FailingEmbeddingProvider implements IEmbeddingProvider {
  readonly name = 'fail';
  readonly version = 'v1';
  readonly dimension = 16;
  embed(): Promise<number[][]> {
    return Promise.reject(new Error('boom'));
  }
}

class SlowEmbeddingProvider implements IEmbeddingProvider {
  readonly name = 'slow';
  readonly version = 'v1';
  readonly dimension = 16;
  embed(texts: string[]): Promise<number[][]> {
    return new Promise((resolve) =>
      setTimeout(
        () => resolve(texts.map(() => new Array<number>(16).fill(0))),
        50,
      ),
    );
  }
}

describe('SemanticSearchProvider (sanitized query, fallback-safe, club-scoped)', () => {
  let clubMemory: ClubMemoryService;
  let store: InMemoryVectorStoreProvider;
  let obs: VectorObservabilityService;
  let embedding: EmbeddingService;
  let policy: VectorContentPolicyService;

  function makeProvider(
    emb: EmbeddingService = embedding,
    c: ConfigService = cfg(),
  ): SemanticSearchProvider {
    return new SemanticSearchProvider(emb, store, c, obs, policy);
  }

  beforeEach(async () => {
    clubMemory = new ClubMemoryService(new InMemoryClubMemoryRepository());
    store = new InMemoryVectorStoreProvider();
    obs = new VectorObservabilityService();
    policy = new VectorContentPolicyService();
    embedding = new EmbeddingService(
      new LocalHashEmbeddingProvider(64),
      cfg(),
      obs,
    );
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'court booking evening',
    });
    await new VectorIndexService(
      clubMemory,
      embedding,
      store,
      policy,
      obs,
    ).rebuildClub('club-1');
  });

  it('returns semantic matches for a related (safe) query', async () => {
    const r = await makeProvider().search('club-1', 'court evening', 5);
    expect(r.length).toBeGreaterThan(0);
    expect(obs.snapshot().semanticSuccess).toBe(1);
  });

  it('empty query → []', async () => {
    expect(await makeProvider().search('club-1', '   ', 5)).toEqual([]);
  });

  // ── HOTFIX: query đi qua content policy trước khi embed ──────────────────────
  it('finance query is BLOCKED — embed + store.query NOT called → []', async () => {
    const embedSpy = jest.spyOn(embedding, 'embed');
    const querySpy = jest.spyOn(store, 'query');
    const r = await makeProvider().search(
      'club-1',
      'số dư quỹ chính là bao nhiêu',
      5,
    );
    expect(r).toEqual([]);
    expect(embedSpy).not.toHaveBeenCalled();
    expect(querySpy).not.toHaveBeenCalled();
    expect(obs.snapshot().financeBlocked).toBeGreaterThan(0);
  });

  it.each([
    'phiếu thu của anh Tùng 1.000.000',
    'chi phí sân 500k',
    'tổng tài sản CLB',
    'công nợ thành viên',
    'receipt contribution expense balance',
  ])('finance/money query blocked → []: %s', async (q) => {
    const embedSpy = jest.spyOn(embedding, 'embed');
    expect(await makeProvider().search('club-1', q, 5)).toEqual([]);
    expect(embedSpy).not.toHaveBeenCalled();
  });

  it('email query is REDACTED before embedding (no raw PII to embed)', async () => {
    const embedSpy = jest.spyOn(embedding, 'embed');
    await makeProvider().search('club-1', 'tìm thông tin tung@example.com', 5);
    const embeddedText = embedSpy.mock.calls[0][0][0];
    expect(embeddedText).not.toContain('tung@example.com');
    expect(embeddedText).toContain('[redacted-email]');
  });

  it('phone query is REDACTED before embedding', async () => {
    const embedSpy = jest.spyOn(embedding, 'embed');
    await makeProvider().search('club-1', 'số điện thoại 0987654321', 5);
    const embeddedText = embedSpy.mock.calls[0][0][0];
    expect(embeddedText).not.toContain('0987654321');
    expect(embeddedText).toContain('[redacted-phone]');
  });

  it('CCCD/CMND query is REDACTED before embedding', async () => {
    const embedSpy = jest.spyOn(embedding, 'embed');
    await makeProvider().search('club-1', 'CCCD 001203004005', 5);
    const embeddedText = embedSpy.mock.calls[0][0][0];
    expect(embeddedText).not.toContain('001203004005');
    expect(embeddedText).toContain('[redacted-id]');
  });

  it('bank/account query is REDACTED before embedding', async () => {
    const embedSpy = jest.spyOn(embedding, 'embed');
    await makeProvider().search('club-1', 'STK 1234567890123', 5);
    const embeddedText = embedSpy.mock.calls[0][0][0];
    expect(embeddedText).not.toContain('1234567890123');
    expect(embeddedText).toContain('[redacted-id]');
  });

  it('embedding failure → [] (fallback), records failure', async () => {
    const failing = new EmbeddingService(
      new FailingEmbeddingProvider(),
      cfg(),
      obs,
    );
    const provider = makeProvider(failing);
    expect(await provider.search('club-1', 'court', 5)).toEqual([]);
    expect(obs.snapshot().semanticSuccess).toBe(0);
    expect(obs.snapshot().semanticAttempts).toBe(1);
  });

  it('timeout → [] (fallback) when provider slower than budget', async () => {
    const slow = new EmbeddingService(new SlowEmbeddingProvider(), cfg(), obs);
    const provider = makeProvider(slow, cfg({ SEMANTIC_TIMEOUT_MS: '1' }));
    expect(await provider.search('club-1', 'court', 5)).toEqual([]);
  });
});
