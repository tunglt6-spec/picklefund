/**
 * Sức khoẻ đường Gemini (dùng chung Maika + Lisa).
 *  - classifyGeminiError: phân loại lỗi để biết NGUYÊN NHÂN thật (hết hạn mức ≠ model bị gỡ ≠ sai key).
 *  - GeminiBreaker: cầu dao in-memory — model vừa lỗi QUOTA/NOT_FOUND thì tạm không gọi lại (đỡ tốn
 *    thời gian chờ + request vô ích mỗi lần), tự mở lại sau thời gian khoá hoặc khi self-test thành công.
 */
export type GeminiErrorKind = 'QUOTA' | 'MODEL_GONE' | 'AUTH' | 'TIMEOUT' | 'OTHER';

export function classifyGeminiError(message: string | undefined | null): GeminiErrorKind {
  const m = String(message ?? '').toLowerCase();
  if (/\b429\b|quota|too many requests|resource[_ ]exhausted|rate limit|exceeded your/.test(m)) return 'QUOTA';
  if (/\b404\b|not found|no longer available|is not supported|model.*(deprecated|retired)/.test(m)) return 'MODEL_GONE';
  if (/\b401\b|\b403\b|api key|permission denied|unauthenticated|forbidden/.test(m)) return 'AUTH';
  if (/timeout|timed out|etimedout|econnreset|deadline/.test(m)) return 'TIMEOUT';
  return 'OTHER';
}

/** Thời gian khoá (ms) theo loại lỗi. QUOTA hồi lại theo phút; MODEL_GONE gần như vĩnh viễn; AUTH khoá lâu vì cần sửa key. */
export const BREAK_MS: Record<GeminiErrorKind, number> = {
  QUOTA: 5 * 60_000,
  MODEL_GONE: 6 * 3_600_000,
  AUTH: 30 * 60_000,
  TIMEOUT: 30_000,
  OTHER: 0,
};

export const GEMINI_KIND_HINT: Record<GeminiErrorKind, string> = {
  QUOTA: 'Hết hạn mức (429) — kiểm tra billing/quota của GOOGLE_API_KEY tại Google AI Studio (hoặc chờ reset).',
  MODEL_GONE: 'Model không còn tồn tại (404) — Google đã gỡ; đổi sang model hiện hành qua biến GEMINI_MODEL / GEMINI_FALLBACK_MODELS.',
  AUTH: 'Key bị từ chối (401/403) — kiểm tra GOOGLE_API_KEY còn hiệu lực và đã bật Generative Language API.',
  TIMEOUT: 'Quá thời gian chờ / mất kết nối tới Google.',
  OTHER: 'Lỗi khác từ Gemini.',
};

export class GeminiBreaker {
  private static until = new Map<string, { at: number; kind: GeminiErrorKind }>();

  static now = () => Date.now();

  static isBlocked(model: string): { kind: GeminiErrorKind; remainingMs: number } | null {
    const e = this.until.get(model);
    if (!e) return null;
    const remaining = e.at - this.now();
    if (remaining <= 0) { this.until.delete(model); return null; }
    return { kind: e.kind, remainingMs: remaining };
  }

  /** Ghi nhận lỗi: trả về loại lỗi đã phân loại. */
  static trip(model: string, message: string | undefined | null): GeminiErrorKind {
    const kind = classifyGeminiError(message);
    const ms = BREAK_MS[kind];
    if (ms > 0) this.until.set(model, { at: this.now() + ms, kind });
    return kind;
  }

  static reset(model?: string) {
    if (model) this.until.delete(model); else this.until.clear();
  }

  /** Danh sách model thử theo thứ tự: model cấu hình → model dự phòng (env GEMINI_FALLBACK_MODELS, mặc định gemini-2.5-flash). */
  static candidates(primary: string, fallbackEnv?: string | null): string[] {
    const fb = (fallbackEnv ?? 'gemini-2.5-flash').split(',').map((s) => s.trim()).filter(Boolean);
    return [primary, ...fb].filter((m, i, a) => !!m && a.indexOf(m) === i);
  }
}
