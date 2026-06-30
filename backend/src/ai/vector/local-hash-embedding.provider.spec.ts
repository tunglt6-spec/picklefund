import { LocalHashEmbeddingProvider } from './local-hash-embedding.provider';
import { InMemoryVectorStoreProvider } from './in-memory-vector-store.provider';

describe('LocalHashEmbeddingProvider', () => {
  it('deterministic + correct dimension + L2-normalized', async () => {
    const p = new LocalHashEmbeddingProvider(32);
    const [v1] = await p.embed(['sân ngoài trời']);
    const [v2] = await p.embed(['sân ngoài trời']);
    expect(v1).toHaveLength(32);
    expect(v1).toEqual(v2); // deterministic
    const norm = Math.sqrt(v1.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1);
  });

  it('similar text → higher cosine than unrelated', async () => {
    const p = new LocalHashEmbeddingProvider(64);
    const [a, b, c] = await p.embed([
      'court booking evening',
      'court booking evening rules',
      'completely different topic xyz',
    ]);
    const simAB = InMemoryVectorStoreProvider.cosine(a, b);
    const simAC = InMemoryVectorStoreProvider.cosine(a, c);
    expect(simAB).toBeGreaterThan(simAC);
  });

  it('empty text → zero vector (no NaN)', async () => {
    const p = new LocalHashEmbeddingProvider(8);
    const [v] = await p.embed(['']);
    expect(v.every((x) => x === 0)).toBe(true);
  });

  it('metadata: name/version/dimension', () => {
    const p = new LocalHashEmbeddingProvider(16);
    expect(p.name).toBe('local-hash');
    expect(p.version).toBe('v1');
    expect(p.dimension).toBe(16);
  });

  it('defaults to dimension 64 when not provided', () => {
    expect(new LocalHashEmbeddingProvider().dimension).toBe(64);
  });

  it('hash is non-negative deterministic', () => {
    expect(LocalHashEmbeddingProvider.hash('x')).toBe(
      LocalHashEmbeddingProvider.hash('x'),
    );
    expect(LocalHashEmbeddingProvider.hash('abc')).toBeGreaterThanOrEqual(0);
  });
});
