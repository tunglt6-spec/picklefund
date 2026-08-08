/**
 * Resolve một Design Token `--pf-*` thành giá trị màu cụ thể (hex/rgb).
 *
 * DÙNG CHO SVG CHART FILL (recharts `<Cell fill=...>`): `var(--x)` KHÔNG hợp lệ
 * trong SVG presentation attribute (`fill`), chỉ hợp lệ trong CSS `style`. Vì vậy
 * cột/lát biểu đồ đặt `fill="var(--pf-...)"` sẽ về màu mặc định (đen). Hàm này đọc
 * giá trị đã tính từ `:root` nên tự bám theo theme sáng/tối đang bật.
 *
 * Gọi TRONG thân component (mỗi lần render) để bám theme hiện tại.
 */
export function pfColor(token: string, fallback = '#64748B'): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  return v || fallback
}

/** Bảng màu chuẩn cho cột biểu đồ (đã resolve sang màu cụ thể, bám theme). */
export function pfChartPalette(): string[] {
  return [
    pfColor('--pf-color-warning'),
    pfColor('--pf-color-muted'),
    pfColor('--pf-color-info'),
    pfColor('--pf-color-primary'),
    pfColor('--pf-color-success'),
    pfColor('--pf-color-danger'),
    pfColor('--pf-color-ai'),
    pfColor('--pf-color-warning'),
  ]
}
