import { cn } from '../../lib/utils'
import { ActionMenu } from './ActionMenu'

/**
 * Thanh lọc ngang gọn (mobile): cuộn ngang, mỗi chip = nhãn + số đếm. Thay cho danh sách thẻ lọc xếp dọc chiếm gần hết màn hình.
 * Có `aria-pressed` để người dùng đọc màn hình biết chip đang chọn (không chỉ bằng màu).
 */
export function FilterChips<K extends string>({
  tabs, active, counts, onChange, label = 'Bộ lọc', primary, moreLabel = 'Loại',
}: {
  tabs: [K, string][]
  active: K
  counts: Partial<Record<K, number>>
  onChange: (k: K) => void
  label?: string
  /** Chỉ các khóa này hiện thành chip; phần còn lại gom vào một nút menu (vd "Loại thông báo"). */
  primary?: K[]
  moreLabel?: string
}) {
  const shown = primary ? tabs.filter(([k]) => primary.includes(k)) : tabs
  const rest = primary ? tabs.filter(([k]) => !primary.includes(k)) : []
  const restActive = rest.find(([k]) => k === active)
  return (
    <div role="group" aria-label={label} className={cn('flex items-center gap-2 pb-1', primary ? 'flex-wrap' : 'overflow-x-auto no-scrollbar max-lg:-mx-4 max-lg:px-4')}>
      {shown.map(([k, l]) => {
        const on = k === active
        const n = counts[k] ?? 0
        return (
          <button
            key={k}
            type="button"
            data-pf-filter-control=""
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
      {rest.length > 0 && (
        <ActionMenu
          className="shrink-0"
          label={restActive ? `${moreLabel}: ${restActive[1]}` : moreLabel}
          items={rest.map(([k, l]) => ({ key: k, label: `${l} (${counts[k] ?? 0})`, onClick: () => onChange(k) }))}
        />
      )}
    </div>
  )
}
