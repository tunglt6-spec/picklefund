import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MoreHorizontal, Plus } from '../icons/mobileLucide'
import { cn } from '../../lib/utils'
import { Portal } from '../ui/Portal'

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
  const menu = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ left: 0, top: 0, width: 220, maxHeight: 400 })

  const toggle = () => {
    if (open) { setOpen(false); return }
    const rect = btn.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.min(260, window.innerWidth - 24)
    const bottom = window.innerHeight - 84 // keep clear of the mobile navigation/safe area
    const below = Math.max(0, bottom - rect.bottom - 6)
    const above = Math.max(0, rect.top - 18)
    const height = Math.min(items.length * 48 + 4, 400)
    const upwards = below < height && above > below
    const maxHeight = Math.min(height, upwards ? above : below)
    setPosition({ left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)), top: upwards ? Math.max(12, rect.top - maxHeight - 6) : rect.bottom + 6, width, maxHeight })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const outside = (e: Event) => { if (!ref.current?.contains(e.target as Node) && !menu.current?.contains(e.target as Node)) setOpen(false) }
    const reposition = (e: Event) => { if (!menu.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus() } }
    document.addEventListener('mousedown', outside)
    document.addEventListener('touchstart', outside)
    document.addEventListener('keydown', key)
    document.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('touchstart', outside)
      document.removeEventListener('keydown', key)
      document.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
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
        onClick={toggle}
        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border text-sm font-semibold ${primary ? 'border-transparent text-white [background:var(--pf-primary)]' : '[background:var(--pf-surface)] [border-color:var(--pf-border)] [color:var(--pf-text)] active:[background:var(--pf-color-muted-soft)]'} ${iconOnly ? 'min-w-[44px] justify-center' : 'px-3.5'}`}
      >
        {primary ? <Plus size={18} aria-hidden /> : <MoreHorizontal size={18} aria-hidden />} {iconOnly ? null : label}
      </button>
      {open && (
        <Portal>
        <div
          ref={menu}
          role="menu"
          aria-label={label}
          style={position}
          className="lg-glass-strong fixed z-50 overflow-y-auto rounded-2xl lg:hidden"
          onKeyDown={e => {
            if (!['ArrowDown','ArrowUp','Home','End'].includes(e.key)) return
            e.preventDefault()
            const buttons = [...(menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
            const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
            const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length
            buttons[next]?.focus()
          }}
        >
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={() => { setOpen(false); btn.current?.focus(); it.onClick() }}
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
        </Portal>
      )}
    </div>
  )
}
