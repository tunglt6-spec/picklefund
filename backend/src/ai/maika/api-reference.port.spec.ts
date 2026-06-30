import { PickleFundApiReferencePort } from './api-reference.port';
import { MaikaIntent } from './maika.types';

describe('PickleFundApiReferencePort (read-only descriptors, no values)', () => {
  let port: PickleFundApiReferencePort;
  beforeEach(() => {
    port = new PickleFundApiReferencePort();
  });

  it('returns member endpoint for MEMBER_INSIGHT', () => {
    const refs = port.referencesFor(MaikaIntent.MEMBER_INSIGHT, false);
    expect(refs.some((r) => r.endpoint === '/members')).toBe(true);
    expect(refs.every((r) => r.method === 'GET')).toBe(true);
  });

  it('returns finance endpoints when financeRelated', () => {
    const refs = port.referencesFor(MaikaIntent.MEMBER_INSIGHT, true);
    const finance = refs.filter((r) => r.category === 'finance');
    expect(finance.length).toBeGreaterThan(0);
    expect(finance.every((r) => /KHÔNG tính/.test(r.note))).toBe(true);
  });

  it('FINANCE_REFERENCE intent always yields finance refs', () => {
    const refs = port.referencesFor(MaikaIntent.FINANCE_REFERENCE, false);
    expect(refs.some((r) => r.category === 'finance')).toBe(true);
  });

  it('never returns numeric values — only descriptors (GET endpoints)', () => {
    const refs = port.referencesFor(MaikaIntent.FUND_PERIOD_INSIGHT, true);
    for (const r of refs) {
      expect(r.method).toBe('GET');
      expect(typeof r.endpoint).toBe('string');
      // không có field giá trị số
      const rec = r as unknown as Record<string, unknown>;
      expect(rec.value).toBeUndefined();
      expect(rec.balance).toBeUndefined();
    }
  });

  it('UNKNOWN intent without finance → no references', () => {
    expect(port.referencesFor(MaikaIntent.UNKNOWN, false)).toEqual([]);
  });
});
