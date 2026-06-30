import { InMemoryVectorStoreProvider } from './in-memory-vector-store.provider';
import { VectorRecord } from './vector.types';

function rec(id: string, clubId: string, vector: number[]): VectorRecord {
  return {
    id,
    clubId,
    vector,
    metadata: {
      type: 'FACT',
      tags: [],
      snippet: '',
      updatedAt: 1,
      embeddingVersion: 'v1',
    },
  };
}

describe('InMemoryVectorStoreProvider', () => {
  let store: InMemoryVectorStoreProvider;
  beforeEach(() => {
    store = new InMemoryVectorStoreProvider();
  });

  it('cosine similarity edge cases', () => {
    expect(InMemoryVectorStoreProvider.cosine([], [])).toBe(0);
    expect(InMemoryVectorStoreProvider.cosine([1, 0], [1])).toBe(0); // length mismatch
    expect(InMemoryVectorStoreProvider.cosine([0, 0], [1, 1])).toBe(0); // zero norm
    expect(InMemoryVectorStoreProvider.cosine([1, 0], [1, 0])).toBeCloseTo(1);
  });

  it('upsert + query by similarity (topK), club-scoped', async () => {
    await store.upsert([
      rec('a', 'club-1', [1, 0]),
      rec('b', 'club-1', [0, 1]),
      rec('x', 'club-2', [1, 0]),
    ]);
    const hits = await store.query('club-1', [1, 0], { topK: 5 });
    expect(hits[0].id).toBe('a'); // most similar
    expect(hits.map((h) => h.id)).not.toContain('x'); // no cross-club
  });

  it('threshold filters low-similarity hits', async () => {
    await store.upsert([
      rec('a', 'club-1', [1, 0]),
      rec('b', 'club-1', [0, 1]),
    ]);
    const hits = await store.query('club-1', [1, 0], {
      topK: 5,
      threshold: 0.5,
    });
    expect(hits.map((h) => h.id)).toEqual(['a']); // b has score 0 < 0.5
  });

  it('query empty club returns []', async () => {
    expect(await store.query('none', [1, 0], { topK: 5 })).toEqual([]);
  });

  it('deleteByIds / deleteByClub / size / clear', async () => {
    await store.upsert([
      rec('a', 'club-1', [1, 0]),
      rec('b', 'club-1', [0, 1]),
    ]);
    expect(await store.size('club-1')).toBe(2);
    await store.deleteByIds('club-1', ['a']);
    expect(await store.size('club-1')).toBe(1);
    await store.deleteByClub('club-1');
    expect(await store.size('club-1')).toBe(0);
    await store.upsert([rec('a', 'club-9', [1, 0])]);
    await store.clear();
    expect(await store.size('club-9')).toBe(0);
  });

  it('deleteByIds on a club with no entries is a no-op', async () => {
    await expect(store.deleteByIds('ghost', ['a'])).resolves.toBeUndefined();
    expect(await store.size('ghost')).toBe(0);
  });

  it('deterministic ordering: equal score → id asc', async () => {
    await store.upsert([
      rec('mB', 'club-1', [1, 0]),
      rec('mA', 'club-1', [1, 0]),
    ]);
    expect(
      (await store.query('club-1', [1, 0], { topK: 5 })).map((h) => h.id),
    ).toEqual(['mA', 'mB']);
  });
});
