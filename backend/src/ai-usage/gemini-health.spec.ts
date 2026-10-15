import { classifyGeminiError, GeminiBreaker } from './gemini-health';

describe('gemini-health', () => {
  afterEach(() => { GeminiBreaker.reset(); GeminiBreaker.now = () => Date.now(); });

  it('phân loại lỗi Gemini đúng nguyên nhân', () => {
    expect(classifyGeminiError('[429 Too Many Requests] You exceeded your current quota')).toBe('QUOTA');
    expect(classifyGeminiError('[404 Not Found] models/gemini-1.5-flash is not found')).toBe('MODEL_GONE');
    expect(classifyGeminiError('This model models/gemini-2.0-flash is no longer available to new users')).toBe('MODEL_GONE');
    expect(classifyGeminiError('[403 Forbidden] API key not valid')).toBe('AUTH');
    expect(classifyGeminiError('ETIMEDOUT')).toBe('TIMEOUT');
    expect(classifyGeminiError('weird')).toBe('OTHER');
  });

  it('cầu dao: QUOTA khoá 5 phút rồi tự mở; OTHER không khoá', () => {
    let t = 1_000_000;
    GeminiBreaker.now = () => t;
    expect(GeminiBreaker.trip('m', 'HTTP 429 quota')).toBe('QUOTA');
    expect(GeminiBreaker.isBlocked('m')?.kind).toBe('QUOTA');
    t += 5 * 60_000 + 1;
    expect(GeminiBreaker.isBlocked('m')).toBeNull();
    GeminiBreaker.trip('x', 'lỗi lạ');
    expect(GeminiBreaker.isBlocked('x')).toBeNull();
  });

  it('danh sách model: không còn 2.0/1.5 mặc định, bỏ trùng', () => {
    expect(GeminiBreaker.candidates('gemini-3.5-flash')).toEqual(['gemini-3.5-flash', 'gemini-2.5-flash']);
    expect(GeminiBreaker.candidates('gemini-2.5-flash')).toEqual(['gemini-2.5-flash']);
    expect(GeminiBreaker.candidates('a', 'b, c ,a')).toEqual(['a', 'b', 'c']);
  });
});

import { GeminiBudget } from './gemini-health';

describe('GeminiBreaker.tiered', () => {
  it('short: Flash-Lite trước; long: Flash chính trước, Lite làm dự phòng', () => {
    const cfg = { main: 'gemini-3.5-flash', lite: 'gemini-3.1-flash-lite' };
    expect(GeminiBreaker.tiered('short', cfg)).toEqual(['gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-flash']);
    expect(GeminiBreaker.tiered('long', cfg)).toEqual(['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite']);
  });
});

describe('GeminiBudget (free tier từ bảng Rate limit thật)', () => {
  afterEach(() => { GeminiBudget.reset(); GeminiBudget.configure({}); GeminiBudget.now = () => Date.now(); });

  it('Flash: 5 RPM / 20 RPD; Flash-Lite 3.1: 15 RPM / 500 RPD', () => {
    expect(GeminiBudget.limitFor('gemini-2.5-flash')).toEqual({ rpm: 5, rpd: 20 });
    expect(GeminiBudget.limitFor('gemini-3.5-flash')).toEqual({ rpm: 5, rpd: 20 });
    expect(GeminiBudget.limitFor('gemini-3.1-flash-lite')).toEqual({ rpm: 15, rpd: 500 });
    expect(GeminiBudget.limitFor('gemini-2.5-flash-lite')).toEqual({ rpm: 10, rpd: 20 });
  });

  it('chặn khi hết RPM rồi mở lại sau 60s', () => {
    let t = Date.UTC(2026, 9, 15, 18, 0, 0);
    GeminiBudget.now = () => t;
    for (let i = 0; i < 5; i++) { expect(GeminiBudget.canUse('gemini-2.5-flash').ok).toBe(true); GeminiBudget.note('gemini-2.5-flash'); }
    const r = GeminiBudget.canUse('gemini-2.5-flash');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('RPM');
    t += 61_000;
    expect(GeminiBudget.canUse('gemini-2.5-flash').ok).toBe(true);
  });

  it('chặn khi hết RPD (20) và reset sang ngày mới (giờ Thái Bình Dương)', () => {
    let t = Date.UTC(2026, 9, 15, 18, 0, 0);
    GeminiBudget.now = () => t;
    for (let i = 0; i < 20; i++) { t += 61_000; GeminiBudget.note('gemini-2.5-flash'); }
    const r = GeminiBudget.canUse('gemini-2.5-flash');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('RPD');
    t += 24 * 3_600_000;
    expect(GeminiBudget.canUse('gemini-2.5-flash').ok).toBe(true);
  });

  it('GEMINI_TIER=paid tắt giới hạn cục bộ; GEMINI_LIMITS ghi đè', () => {
    GeminiBudget.configure({ tier: 'paid' });
    expect(GeminiBudget.limitFor('gemini-2.5-flash')).toBeNull();
    GeminiBudget.configure({ limits: '{"gemini-2.5-flash":{"rpm":60,"rpd":1000}}' });
    expect(GeminiBudget.limitFor('gemini-2.5-flash')).toEqual({ rpm: 60, rpd: 1000 });
  });
});
