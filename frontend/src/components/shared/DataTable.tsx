/**
 * DataTable (UDP-01) — bảng generic: header nhẹ, row thoáng, hỗ trợ render tuỳ biến.
 * Desktop hiển thị bảng; mobile nên dùng MobileCardList (xem ResponsiveTable wrapper ở page).
 * Bảng tự cuộn ngang trong container (overflow-x) để không phá layout.
 */
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface Column<T> {
  key: string
  header: ReactNode
  /** Render cell; nếu bỏ trống dùng (row as Record)[key]. */
  render?: (row: T, index: number) => ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  onRowClick?: (row: T) => void
  className?: string
  emptyText?: string
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  className,
  emptyText = 'Không có dữ liệu',
}: DataTableProps<T>) {
  const alignCls = (a?: Column<T>['align']) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left'

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-[color:var(--pf-border)]">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap [color:var(--pf-color-muted)]',
                  alignCls(c.align),
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center [color:var(--pf-color-muted)]"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b transition-colors border-[color:var(--pf-border-soft)]',
                  onRowClick && 'cursor-pointer hover:[background:var(--pf-color-muted-soft)]',
                )}
              >
                {columns.map((c) => {
                  const fallback = (row as Record<string, ReactNode>)[c.key]
                  return (
                    <td
                      key={c.key}
                      className={cn(
                        'px-4 py-3 align-middle [color:var(--pf-text)]',
                        alignCls(c.align),
                        c.className,
                      )}
                    >
                      {c.render ? c.render(row, i) : fallback}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
