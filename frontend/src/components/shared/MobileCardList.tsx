/**
 * MobileCardList (UDP-01) — render danh sách dạng card cho mobile (thay bảng rộng).
 * Feature Parity: dùng kèm DataTable — desktop bảng, mobile card list (cùng dữ liệu).
 */
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface MobileCardListProps<T> {
  items: T[]
  itemKey: (item: T, index: number) => string
  renderCard: (item: T, index: number) => ReactNode
  onItemClick?: (item: T) => void
  className?: string
  emptyText?: string
  itemLabel?: (item: T) => string
}

export function MobileCardList<T>({
  items,
  itemKey,
  renderCard,
  onItemClick,
  className,
  emptyText = 'Không có dữ liệu',
  itemLabel,
}: MobileCardListProps<T>) {
  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-sm [color:var(--pf-color-muted)]">
        {emptyText}
      </p>
    )
  }
  return (
    <div className={cn('pf-record-grid pf-stagger pf-cardlist grid grid-cols-1 min-[600px]:grid-cols-2 gap-2.5', className)}>
      {items.map((item, i) => (
        <div
          key={itemKey(item, i)}
          onClick={onItemClick ? () => onItemClick(item) : undefined}
          role={itemLabel && onItemClick ? 'button' : undefined}
          tabIndex={itemLabel && onItemClick ? 0 : undefined}
          aria-label={itemLabel?.(item)}
          onKeyDown={itemLabel && onItemClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onItemClick(item) } } : undefined}
          className={cn(
            'pf-record-card pf-glass rounded-2xl p-4',
            onItemClick && 'active:[background:var(--pf-color-muted-soft)]',
          )}
        >
          {renderCard(item, i)}
        </div>
      ))}
    </div>
  )
}
