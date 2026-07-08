export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN')
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function getInitials(name: string): string {
  return name.split(' ').slice(-2).map(n => n[0]).join('').toUpperCase()
}

/** Kỳ có phải Quỹ Chính không (type thiếu → mặc định 'chung', khớp backend Prisma default). */
export function isChungPeriod(p: { type?: string }): boolean {
  return (p.type ?? 'chung') === 'chung'
}

/**
 * Kỳ Quỹ Chính đang mở — nguồn chân lý DUY NHẤT cho "kỳ mặc định" trên toàn app
 * (Sidebar, Dashboard tài chính, Thu Quỹ, Chi Phí, Báo cáo, Công nợ, Thủ quỹ...).
 * Luôn ưu tiên type='chung' (Quỹ Chính) trước Quỹ Phụ — tránh lẫn dữ liệu 2 quỹ.
 */
export function getActiveChungPeriod<T extends { status: string; type?: string }>(
  periods: T[],
): T | undefined {
  return periods.find(p => isChungPeriod(p) && p.status === 'active')
}
