/**
 * Màu số tiền trên thẻ KPI (toàn app) — Xanh: dương/tốt · Đỏ: âm/chi/nợ · Vàng: báo động tới ngưỡng.
 *
 * kind:
 *  - balance : số dư/tài sản — âm → ĐỎ; 0 ≤ số dư < LOW_BALANCE_THRESHOLD → VÀNG (sắp cạn); còn lại → XANH
 *  - signed  : chênh lệch/chuyển kỳ — > 0 XANH · < 0 ĐỎ · 0 trung tính (không báo vàng)
 *  - income  : khoản thu/đã đóng — > 0 → XANH; 0 → trung tính
 *  - expense : khoản chi — > 0 → ĐỎ; 0 → trung tính
 *  - pending : chờ xác nhận/duyệt — > 0 → VÀNG; 0 → trung tính
 *  - debt    : công nợ/còn thiếu — > 0 → ĐỎ; 0 → XANH (hết nợ)
 */
export type MoneyKind = 'balance' | 'signed' | 'income' | 'expense' | 'pending' | 'debt'
export type MoneyTone = 'success' | 'warning' | 'danger' | 'neutral'

/** Ngưỡng báo động số dư thấp (VND). Dưới mức này (nhưng chưa âm) hiện VÀNG. */
export const LOW_BALANCE_THRESHOLD = 500_000

export function moneyTone(value: number | null | undefined, kind: MoneyKind = 'balance'): MoneyTone {
  if (value == null) return 'neutral'
  const v = Number(value)
  if (!Number.isFinite(v)) return 'neutral'
  switch (kind) {
    case 'balance':
      return v < 0 ? 'danger' : v < LOW_BALANCE_THRESHOLD ? 'warning' : 'success'
    case 'signed':
      return v > 0 ? 'success' : v < 0 ? 'danger' : 'neutral'
    case 'income':
      return v > 0 ? 'success' : 'neutral'
    case 'expense':
      return v > 0 ? 'danger' : 'neutral'
    case 'pending':
      return v > 0 ? 'warning' : 'neutral'
    case 'debt':
      return v > 0 ? 'danger' : 'success'
  }
}

const VAR: Record<Exclude<MoneyTone, 'neutral'>, string> = {
  success: 'var(--pf-tone-success)',
  warning: 'var(--pf-tone-warning)',
  danger: 'var(--pf-tone-danger)',
}

/** Màu chữ (đủ tương phản trên nền sáng/tối): pha màu tông với --pf-text. */
export function moneyColor(value: number | null | undefined, kind: MoneyKind = 'balance'): string | undefined {
  const t = moneyTone(value, kind)
  if (t === 'neutral') return undefined
  return `color-mix(in srgb, ${VAR[t]} 72%, var(--pf-text))`
}
