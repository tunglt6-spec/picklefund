/**
 * EPIC13: kiểm tra biến môi trường BẮT BUỘC lúc boot (fail-fast).
 * Trả về danh sách KEY thiếu — KHÔNG bao giờ trả/log GIÁ TRỊ secret.
 * Ngăn khởi động production với thiếu secret (JWT/DB) → tránh app chạy hỏng.
 */
export const REQUIRED_ENV_KEYS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

export function getMissingRequiredEnv(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return REQUIRED_ENV_KEYS.filter((k) => {
    const v = env[k];
    return v === undefined || v.trim() === '';
  });
}
