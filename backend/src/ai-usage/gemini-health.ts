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

  /**
   * Chuỗi model theo TẦNG tác vụ (tránh đốt hạn mức model "đắt" cho việc ngắn):
   *  - short (chat Lisa, brief, tóm tắt ~180 từ): Flash-Lite trước (hạn mức free 500 yêu cầu/ngày) → dự phòng → model chính.
   *  - long  (báo cáo điều hành nhiều mục, đầu ra dài): model chính (Flash) → Flash-Lite khi Flash hết hạn mức/bị khoá.
   * Env: GEMINI_MODEL (chính/long), GEMINI_MODEL_SHORT hoặc GEMINI_MODEL_LITE (short), GEMINI_FALLBACK_MODELS.
   */
  static tiered(tier: 'short' | 'long', cfg: { main: string; lite?: string | null; fallbacks?: string | null }): string[] {
    const lite = (cfg.lite && cfg.lite.trim()) || 'gemini-3.1-flash-lite';
    const fb = (cfg.fallbacks ?? 'gemini-2.5-flash-lite,gemini-2.5-flash').split(',').map((x) => x.trim()).filter(Boolean);
    const order = tier === 'short' ? [lite, ...fb.filter((m) => /lite/.test(m)), cfg.main, ...fb.filter((m) => !/lite/.test(m))]
      : [cfg.main, ...fb.filter((m) => !/lite/.test(m)), lite, ...fb.filter((m) => /lite/.test(m))];
    return order.filter((m, i, a) => !!m && a.indexOf(m) === i);
  }
}

/**
 * Ngân sách hạn mức CỤC BỘ (free tier Gemini): đếm yêu cầu theo phút & theo ngày (reset 00:00 giờ Thái Bình Dương như Google)
 * để KHÔNG tự đốt hạn mức vào các lần thử chắc chắn 429. Giá trị mặc định lấy từ bảng Rate limit thật trên AI Studio của dự án:
 *   Flash (2.5/3.x): 5 RPM · 20 RPD | Flash-Lite 3.1: 15 RPM · 500 RPD | 2.5 Flash-Lite: 10 RPM · 20 RPD.
 * Gói trả phí: đặt GEMINI_TIER=paid để tắt giới hạn cục bộ. Ghi đè bằng GEMINI_LIMITS='{"model":{"rpm":..,"rpd":..}}'.
 */
export type GeminiLimit = { rpm: number; rpd: number };

export class GeminiBudget {
  private static minute = new Map<string, number[]>();
  private static day = new Map<string, { date: string; n: number }>();
  static now = () => Date.now();
  static env: { tier?: string | null; limits?: string | null } = {};

  static configure(env: { tier?: string | null; limits?: string | null }) { this.env = env; }

  static dayKey(t = this.now()): string {
    return new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  }

  static limitFor(model: string): GeminiLimit | null {
    if ((this.env.tier ?? '').toLowerCase() === 'paid') return null;
    try {
      const o = this.env.limits ? JSON.parse(this.env.limits) : null;
      if (o && o[model]) return o[model];
    } catch { /* bỏ qua JSON hỏng */ }
    if (model === 'gemini-3.1-flash-lite') return { rpm: 15, rpd: 500 };
    if (/flash-lite/.test(model)) return { rpm: 10, rpd: 20 };
    if (/flash/.test(model)) return { rpm: 5, rpd: 20 };
    return null;
  }

  /** Còn ngân sách để gọi model này? (không tăng bộ đếm) */
  static canUse(model: string): { ok: true } | { ok: false; reason: 'RPM' | 'RPD'; used: number; limit: number } {
    const lim = this.limitFor(model);
    if (!lim) return { ok: true };
    const t = this.now();
    const d = this.day.get(model);
    const usedDay = d && d.date === this.dayKey(t) ? d.n : 0;
    if (usedDay >= lim.rpd) return { ok: false, reason: 'RPD', used: usedDay, limit: lim.rpd };
    const recent = (this.minute.get(model) ?? []).filter((x) => t - x < 60_000);
    if (recent.length >= lim.rpm) return { ok: false, reason: 'RPM', used: recent.length, limit: lim.rpm };
    return { ok: true };
  }

  /** Ghi nhận 1 yêu cầu sắp gửi tới Google (tính cả lần thất bại — Google cũng tính). */
  static note(model: string) {
    const t = this.now();
    const arr = (this.minute.get(model) ?? []).filter((x) => t - x < 60_000);
    arr.push(t);
    this.minute.set(model, arr);
    const key = this.dayKey(t);
    const d = this.day.get(model);
    this.day.set(model, d && d.date === key ? { date: key, n: d.n + 1 } : { date: key, n: 1 });
  }

  static snapshot(models: string[]): { model: string; usedToday: number; rpd: number | null; rpm: number | null }[] {
    const key = this.dayKey();
    return models.map((m) => {
      const lim = this.limitFor(m);
      const d = this.day.get(m);
      return { model: m, usedToday: d && d.date === key ? d.n : 0, rpd: lim?.rpd ?? null, rpm: lim?.rpm ?? null };
    });
  }

  static reset() { this.minute.clear(); this.day.clear(); }
}
