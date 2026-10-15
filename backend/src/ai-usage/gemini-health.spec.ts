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
