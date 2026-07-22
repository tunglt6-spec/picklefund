/**
 * Parse số nguyên từ query string một cách AN TOÀN cho Prisma.
 * 'abc' → Number('abc') = NaN → nếu lọt vào take/slice sẽ làm Prisma ném lỗi 500.
 * Quy ước: giá trị không hợp lệ → undefined (service tự dùng default + clamp).
 */
export function intQuery(v?: string): number | undefined {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}
