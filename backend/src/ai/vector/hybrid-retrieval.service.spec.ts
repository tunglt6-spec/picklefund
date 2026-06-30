import { ConfigService } from '@nestjs/config';
import { HybridRetrievalEngine } from './hybrid-retrieval.service';
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
import { RetrievalEngine } from '../retrieval/retrieval.service';
import { IndexManager } from '../retrieval/index-manager';
import { NoopSemanticSearchProvider } from '../retrieval/noop-semantic-search.provider';
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

describe('HybridRetrievalEngine (deterministic priority + semantic supplement)', () => {
  let clubMemory: ClubMemoryService;
  let store: InMemoryVectorStoreProvider;
  let obs: VectorObservabilityService;
  let embedding: EmbeddingService;
  let deterministic: RetrievalEngine;

  beforeEach(async () => {
    clubMemory = new ClubMemoryService(new InMemoryClubMemoryRepository());
    store = new InMemoryVectorStoreProvider();
    obs = new VectorObservabilityService();
    embedding = new EmbeddingService(
      new LocalHashEmbeddingProvider(64),
      cfg(),
      obs,
    );
    deterministic = new RetrievalEngine(
      clubMemory,
      new IndexManager(),
      new NoopSemanticSearchProvider(),
    );
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'court evening',
      tags: ['indoor'],
    });
    await clubMemory.save('club-1', 'u1', {
      type: ClubMemoryType.FACT,
      content: 'court morning',
      tags: ['outdoor'],
    });
    await new VectorIndexService(
      clubMemory,
      embedding,
      store,
      new VectorContentPolicyService(),
      obs,
    ).rebuildClub('club-1');
  });

  function hybrid(emb = embedding): HybridRetrievalEngine {
    return new HybridRetrievalEngine(
      deterministic,
      new SemanticSearchProvider(
        emb,
        store,
        cfg(),
        obs,
        new VectorContentPolicyService(),
      ),
      clubMemory,
      obs,
    );
  }

  it('deterministic (tag-filtered) priority + semantic supplements the rest', async () => {
    // deterministic: keyword 'court' + tag 'indoor' → chỉ memory indoor.
    // semantic: 'court' khớp cả 2 → memory outdoor là supplement (deterministic miss).
    const r = await hybrid().retrieve('club-1', {
      text: 'court',
      tags: ['indoor'],
    });
    const tagsOf = r.map((m) => m.tags.join(','));
    expect(tagsOf[0]).toBe('indoor'); // deterministic first (priority)
    expect(tagsOf).toContain('outdoor'); // semantic supplement
    expect(r.length).toBe(2);
  });

  it('dedupe: memory matched by both appears once', async () => {
    const r = await hybrid().retrieve('club-1', { text: 'court' });
    const ids = r.map((m) => m.memoryId);
    expect(new Set(ids).size).toBe(ids.length); // no duplicates
    expect(r.length).toBe(2);
  });

  it('fallback: semantic empty (no text) → only deterministic + records fallback', async () => {
    const r = await hybrid().retrieve('club-1', { tags: ['indoor'] });
    expect(r.every((m) => m.tags.includes('indoor'))).toBe(true);
    expect(obs.snapshot().fallbackCount).toBeGreaterThan(0);
  });

  it('fallback: semantic provider fails → deterministic still works', async () => {
    const failing = new EmbeddingService(
      new FailingEmbeddingProvider(),
      cfg(),
      obs,
    );
    const r = await hybrid(failing).retrieve('club-1', {
      text: 'court',
      tags: ['indoor'],
    });
    expect(r.length).toBe(1); // chỉ deterministic (indoor)
    expect(r[0].tags).toContain('indoor');
  });

  it('skips semantic hit not loadable from club memory (stale vector)', async () => {
    const all = await clubMemory.listByClub('club-1');
    const victim = all[0];
    // Xoá khỏi Source of Truth nhưng store vẫn còn vector (stale) → semantic trả về,
    // load null → bỏ qua (tenant-safe; SoT là Memory Object).
    await clubMemory.delete('club-1', victim.memoryId);
    const r = await hybrid().retrieve('club-1', { text: 'court' });
    expect(r.map((m) => m.memoryId)).not.toContain(victim.memoryId);
  });

  it('respects topK after merge', async () => {
    const r = await hybrid().retrieve('club-1', { text: 'court', topK: 1 });
    expect(r).toHaveLength(1);
  });
});
