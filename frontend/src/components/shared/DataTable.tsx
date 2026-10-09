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
  /** Dạng thẻ (mobile): dùng cột này làm tiêu đề thẻ (mặc định cột hiển thị đầu tiên). */
  mobileTitle?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  onRowClick?: (row: T) => void
  className?: string
  emptyText?: string
  /** Class tuỳ biến cho <tr> theo row (vd highlight dòng đang chọn). */
  rowClassName?: (row: T, index: number) => string
  /** Dưới 1024px hiển thị dạng THẺ (cột đầu = tiêu đề, cột có header rỗng = nút thao tác) thay vì bảng cuộn ngang. */
  mobileCards?: boolean
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  className,
  emptyText = 'Không có dữ liệu',
  rowClassName,
  mobileCards = false,
}: DataTableProps<T>) {
  const alignCls = (a?: Column<T>['align']) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left'

  const cell = (c: Column<T>, row: T, i: number) =>
    c.render ? c.render(row, i) : ((row as Record<string, ReactNode>)[c.key])
  const visible = columns.filter((c) => c.key !== 'sel' && !(typeof c.header === 'string' && c.header === ''))
  const actionCols = columns.filter((c) => typeof c.header === 'string' && c.header === '' && c.key !== 'sel')
  const titleCol = visible.find((c) => c.mobileTitle) ?? visible[0]
  const restCols = visible.filter((c) => c !== titleCol)

  const cards = mobileCards && (
    <ul className="pf-cardlist flex flex-col gap-2 p-1 lg:hidden">
      {rows.length === 0 ? (
        <li className="py-8 text-center text-sm [color:var(--pf-color-muted)]">{emptyText}</li>
      ) : (
        rows.map((row, i) => (
          <li
            key={rowKey(row, i)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn('pf-rowcard p-3', onRowClick && 'cursor-pointer', rowClassName?.(row, i))}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 text-sm font-semibold [color:var(--pf-text)]">{titleCol ? cell(titleCol, row, i) : null}</div>
              {actionCols.length > 0 && (
                <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {actionCols.map((c) => <span key={c.key}>{cell(c, row, i)}</span>)}
                </div>
              )}
            </div>
            {restCols.length > 0 && (
              <dl className="mt-2 divide-y [&>div]:py-1.5 text-[13px] [--tw-divide-opacity:1] divide-[color:var(--pf-border-soft)]">
                {restCols.map((c) => (
                  <div key={c.key} className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] [color:var(--pf-color-muted)]">{c.header}</dt>
                    <dd className="min-w-0 break-words text-right [color:var(--pf-text)]">{cell(c, row, i)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))
      )}
    </ul>
  )

  return (
    <>
    {cards}
    <div className={cn('w-full overflow-x-auto', mobileCards && 'hidden lg:block', className)}>
      <table className="pf-rows w-full text-sm">
        <thead>
          <tr className="border-b border-[color:var(--pf-border)]">
            {columns.map((c) => (
              <th scope="col"
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
                  rowClassName?.(row, i),
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
    </>
  )
}
