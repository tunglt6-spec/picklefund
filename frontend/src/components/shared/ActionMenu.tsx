import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface ActionMenuItem {
  key: string
  label: string
  icon?: ReactNode
  onClick: () => void
  /** Thao tác có tính phá hủy → chữ đỏ. */
  danger?: boolean
  disabled?: boolean
}

/**
 * Menu "Thao tác" gọn (mobile): gom các thao tác PHỤ (xuất tệp, chuyển kỳ, quản lý…) để giữ thao tác chính nổi bật,
 * thay cho hàng nút dài bị cắt ở mép phải. Mặc định chỉ hiện dưới 1024px (`lg:hidden`).
 */
export function ActionMenu({ items, label = 'Thao tác', className, iconOnly, primary }: { items: ActionMenuItem[]; label?: string; className?: string; iconOnly?: boolean; primary?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const outside = (e: Event) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus() } }
    document.addEventListener('mousedown', outside)
    document.addEventListener('touchstart', outside)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('touchstart', outside)
      document.removeEventListener('keydown', key)
    }
  }, [open])

  if (items.length === 0) return null
  return (
    <div ref={ref} className={cn('relative lg:hidden', className)}>
      <button
        ref={btn}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={iconOnly ? label : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border text-sm font-semibold ${primary ? 'border-transparent text-white [background:var(--pf-primary)]' : '[background:var(--pf-surface)] [border-color:var(--pf-border)] [color:var(--pf-text)] active:[background:var(--pf-color-muted-soft)]'} ${iconOnly ? 'min-w-[44px] justify-center' : 'px-3.5'}`}
      >
        {primary ? <Plus size={18} aria-hidden /> : <MoreHorizontal size={18} aria-hidden />} {iconOnly ? null : label}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[220px] overflow-hidden rounded-2xl border [background:var(--pf-surface)] [border-color:var(--pf-border)]"
          style={{ boxShadow: '0 8px 24px rgba(16,24,40,0.14)' }}
        >
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={() => { setOpen(false); it.onClick() }}
              className={cn(
                'flex min-h-[48px] w-full items-center gap-3 px-4 text-left text-sm font-medium disabled:opacity-40 active:[background:var(--pf-color-muted-soft)]',
                it.danger ? '[color:var(--pf-color-danger)]' : '[color:var(--pf-text)]',
              )}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
