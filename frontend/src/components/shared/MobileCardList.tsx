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
}

export function MobileCardList<T>({
  items,
  itemKey,
  renderCard,
  onItemClick,
  className,
  emptyText = 'Không có dữ liệu',
}: MobileCardListProps<T>) {
  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-sm [color:var(--pf-color-muted)]">
        {emptyText}
      </p>
    )
  }
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {items.map((item, i) => (
        <div
          key={itemKey(item, i)}
          onClick={onItemClick ? () => onItemClick(item) : undefined}
          className={cn(
            'rounded-2xl border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]',
            onItemClick && 'active:[background:var(--pf-color-muted-soft)]',
          )}
        >
          {renderCard(item, i)}
        </div>
      ))}
    </div>
  )
}
