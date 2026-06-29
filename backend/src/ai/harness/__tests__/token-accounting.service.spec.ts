import { TokenAccountingService } from '../token-accounting.service';

const makeEntry = (overrides = {}) => ({
  requestId: 'req-1',
  provider: 'litellm',
  model: 'claude-sonnet-4-6',
  promptTokens: 100,
  completionTokens: 50,
  totalTokens: 150,
  estimatedCostUsd: 0.0015,
  clubId: 'club-1',
  userId: 'user-1',
  sessionId: 'sess-1',
  timestamp: new Date(),
  ...overrides,
});

describe('TokenAccountingService', () => {
  let service: TokenAccountingService;

  beforeEach(() => {
    service = new TokenAccountingService();
  });

  it('returns zero summary when empty', () => {
    const s = service.getGlobal();
    expect(s.totalRequests).toBe(0);
    expect(s.totalTokens).toBe(0);
    expect(s.totalCostUsd).toBe(0);
  });

  it('records and aggregates global usage', () => {
    service.record(makeEntry({ totalTokens: 100, estimatedCostUsd: 0.001 }));
    service.record(makeEntry({ totalTokens: 200, estimatedCostUsd: 0.002 }));
    const s = service.getGlobal();
    expect(s.totalRequests).toBe(2);
    expect(s.totalTokens).toBe(300);
    expect(s.totalCostUsd).toBeCloseTo(0.003);
  });

  it('filters by userId', () => {
    service.record(makeEntry({ userId: 'user-a', totalTokens: 100 }));
    service.record(makeEntry({ userId: 'user-b', totalTokens: 500 }));
    expect(service.getByUser('user-a').totalTokens).toBe(100);
    expect(service.getByUser('user-b').totalTokens).toBe(500);
    expect(service.getByUser('user-c').totalTokens).toBe(0);
  });

  it('filters by clubId', () => {
    service.record(makeEntry({ clubId: 'club-x', totalTokens: 300 }));
    service.record(makeEntry({ clubId: 'club-y', totalTokens: 700 }));
    expect(service.getByClub('club-x').totalTokens).toBe(300);
    expect(service.getByClub('club-y').totalTokens).toBe(700);
  });

  it('filters by sessionId', () => {
    service.record(makeEntry({ sessionId: 's1', totalTokens: 400 }));
    service.record(makeEntry({ sessionId: 's2', totalTokens: 600 }));
    expect(service.getBySession('s1').totalTokens).toBe(400);
    expect(service.getBySession('s2').totalTokens).toBe(600);
  });

  it('groups by provider', () => {
    service.record(makeEntry({ provider: 'litellm', totalTokens: 200 }));
    service.record(makeEntry({ provider: 'ollama', totalTokens: 100 }));
    const byProvider = service.getByProvider();
    expect(byProvider['litellm'].totalTokens).toBe(200);
    expect(byProvider['ollama'].totalTokens).toBe(100);
  });

  it('tracks prompt vs completion tokens separately', () => {
    service.record(
      makeEntry({ promptTokens: 80, completionTokens: 20, totalTokens: 100 }),
    );
    const s = service.getGlobal();
    expect(s.totalPromptTokens).toBe(80);
    expect(s.totalCompletionTokens).toBe(20);
  });
});
