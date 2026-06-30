import { IntentRouter } from './intent-router.service';
import { MaikaIntent } from './maika.types';

describe('IntentRouter (deterministic, no LLM)', () => {
  let router: IntentRouter;
  beforeEach(() => {
    router = new IntentRouter();
  });

  it('classifies member queries', () => {
    const r = router.classify('Cho tôi biết về thành viên CLB');
    expect(r.intent).toBe(MaikaIntent.MEMBER_INSIGHT);
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.financeRelated).toBe(false);
  });

  it('classifies fund period queries', () => {
    expect(router.classify('kỳ quỹ hiện tại thế nào').intent).toBe(
      MaikaIntent.FUND_PERIOD_INSIGHT,
    );
  });

  it('classifies tournament queries', () => {
    expect(router.classify('lịch giải đấu sắp tới').intent).toBe(
      MaikaIntent.TOURNAMENT_INSIGHT,
    );
  });

  it('classifies workflow + history + overview', () => {
    expect(router.classify('quy trình thu quỹ ra sao').intent).toBe(
      MaikaIntent.WORKFLOW_INSIGHT,
    );
    expect(router.classify('lịch sử hoạt động CLB').intent).toBe(
      MaikaIntent.HISTORY_LOOKUP,
    );
    expect(router.classify('tổng quan tổ chức').intent).toBe(
      MaikaIntent.ORGANIZATION_OVERVIEW,
    );
  });

  it('flags finance-only query as FINANCE_REFERENCE + financeRelated', () => {
    const r = router.classify('số dư quỹ chính bao nhiêu');
    expect(r.intent).toBe(MaikaIntent.FINANCE_REFERENCE);
    expect(r.financeRelated).toBe(true);
    expect(r.matchedKeywords.length).toBeGreaterThan(0);
  });

  it('keeps specific intent but flags financeRelated when mixed', () => {
    // "quy trình" (workflow) đứng trước về số keyword nhưng vẫn cờ finance.
    const r = router.classify('quy trình đóng quỹ của thành viên');
    expect(r.financeRelated).toBe(true);
    expect([
      MaikaIntent.WORKFLOW_INSIGHT,
      MaikaIntent.MEMBER_INSIGHT,
    ]).toContain(r.intent);
  });

  it('returns UNKNOWN with confidence 0 for unrelated text', () => {
    const r = router.classify('xin chào trời đẹp quá');
    expect(r.intent).toBe(MaikaIntent.UNKNOWN);
    expect(r.confidence).toBe(0);
  });

  it('is deterministic — same input → same output', () => {
    const a = router.classify('thành viên thành viên member');
    const b = router.classify('thành viên thành viên member');
    expect(a).toEqual(b);
    expect(a.confidence).toBeLessThanOrEqual(1);
  });

  it('handles empty/undefined query safely', () => {
    expect(router.classify('').intent).toBe(MaikaIntent.UNKNOWN);
    expect(router.classify(undefined as unknown as string).intent).toBe(
      MaikaIntent.UNKNOWN,
    );
  });
});
