import { cn } from '../../lib/utils'

/**
 * Thanh lọc ngang gọn (mobile): cuộn ngang, mỗi chip = nhãn + số đếm. Thay cho danh sách thẻ lọc xếp dọc chiếm gần hết màn hình.
 * Có `aria-pressed` để người dùng đọc màn hình biết chip đang chọn (không chỉ bằng màu).
 */
export function FilterChips<K extends string>({
  tabs, active, counts, onChange, label = 'Bộ lọc',
}: {
  tabs: [K, string][]
  active: K
  counts: Partial<Record<K, number>>
  onChange: (k: K) => void
  label?: string
}) {
  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
      {tabs.map(([k, l]) => {
        const on = k === active
        const n = counts[k] ?? 0
        return (
          <button
            key={k}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(k)}
            className={cn(
              'flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold',
              on
                ? 'border-transparent text-white [background:var(--pf-primary)]'
                : '[background:var(--pf-surface)] [border-color:var(--pf-border)] [color:var(--pf-text)]',
            )}
          >
            {l}
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                on ? 'bg-white/25 text-white' : '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]',
              )}
            >
              {n}
            </span>
          </button>
        )
      })}
    </div>
  )
}
