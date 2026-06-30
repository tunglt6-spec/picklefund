import { VectorObservabilityService } from './vector-observability.service';

describe('VectorObservabilityService', () => {
  let obs: VectorObservabilityService;
  beforeEach(() => {
    obs = new VectorObservabilityService();
  });

  it('records metrics + computes derived rates', () => {
    obs.recordEmbedding(100, 2);
    obs.recordEmbeddingFailure();
    obs.recordCache(true);
    obs.recordCache(false);
    obs.recordVectorQuery(20);
    obs.recordSemantic(true);
    obs.recordSemantic(false);
    obs.recordFallback();
    obs.recordHybrid(50);

    const s = obs.snapshot();
    expect(s.embeddingCount).toBe(2);
    expect(s.embeddingFailures).toBe(1);
    expect(s.cacheHit).toBe(1);
    expect(s.cacheMiss).toBe(1);
    expect(s.vectorQueries).toBe(1);
    expect(s.fallbackCount).toBe(1);
    expect(s.avgEmbeddingLatencyMs).toBe(50);
    expect(s.semanticSuccessRate).toBe(0.5);
  });

  it('snapshot with no data → zero rates (no division by zero)', () => {
    const s = obs.snapshot();
    expect(s.avgEmbeddingLatencyMs).toBe(0);
    expect(s.semanticSuccessRate).toBe(0);
  });

  it('reset clears metrics', () => {
    obs.recordFallback();
    obs.reset();
    expect(obs.snapshot().fallbackCount).toBe(0);
  });
});
