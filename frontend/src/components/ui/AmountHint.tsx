/**
 * Gợi ý số tiền có dấu phân cách hàng nghìn dưới ô nhập số (chỉ mobile, <1024px) để dễ đọc `1000000` → `1.000.000 đ`.
 * Không đổi giá trị/kiểu dữ liệu của ô nhập.
 */
export function AmountHint({ value }: { value: string | number | null | undefined }) {
  const n = Number(value)
  if (value === '' || value == null || !Number.isFinite(n) || n === 0) return null
  return <p className="mt-1 text-xs font-medium tabular-nums [color:var(--pf-color-muted)] lg:hidden" aria-live="polite">= {n.toLocaleString('vi-VN')} đ</p>
}
