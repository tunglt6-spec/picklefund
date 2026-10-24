import { useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Portal } from '../ui/Portal'
import { useDialogA11y } from '../../hooks/useDialogA11y'
import { cn } from '../../lib/utils'

export interface SwitcherItem {
  key: string
  label: string
  badge?: number
  /** Nhóm hiển thị trong bảng chọn (vd "Quản trị"); mục không có nhóm xếp trên cùng. */
  group?: string
}

/**
 * Bộ chọn chức năng (mobile): thay hàng tab ngang của module bằng MỘT tiêu đề bấm được "Công nợ ▾".
 * Chạm mở bảng chọn từ dưới liệt kê mọi chức năng cùng nhóm (có số chờ xử lý) → chuyển nghiệp vụ nhanh
 * mà không phải trải 5–6 tab thường trực, không có mục nào khuất ngoài mép phải.
 */
export function ModuleSwitcher({ title, items, active, onSelect }: {
  title?: string
  items: SwitcherItem[]
  active: string
  onSelect: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  useDialogA11y(open, panel, () => setOpen(false))
  const cur = items.find((i) => i.key === active) ?? items[0]
  const pending = items.reduce((n, i) => n + (i.key !== active ? (i.badge ?? 0) : 0), 0)
  const groups: { name: string; items: SwitcherItem[] }[] = []
  for (const it of items) {
    const name = it.group ?? ''
    let g = groups.find((x) => x.name === name)
    if (!g) { g = { name, items: [] }; groups.push(g) }
    g.items.push(it)
  }
  groups.sort((a, b) => (a.name === '' ? -1 : b.name === '' ? 1 : 0))

  return (
    <>
      <div className="sticky top-0 z-20 border-b px-4 py-2 [background:var(--pf-surface)] [border-color:var(--pf-border)] lg:hidden">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="flex min-h-[48px] w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-left [background:var(--pf-surface)] [border-color:var(--pf-border)]"
        >
          <span className="min-w-0">
            {title && <span className="block text-xs [color:var(--pf-color-muted)]">{title}</span>}
            <span className="block truncate text-base font-bold [color:var(--pf-text)]">{cur?.label}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {pending > 0 && <span className="inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[#DC2626] px-1.5 text-xs font-bold text-white">{pending}</span>}
            <ChevronDown size={20} className="[color:var(--pf-color-muted)]" aria-hidden />
          </span>
        </button>
      </div>
      {open && (
        <Portal>
          <div className="fixed inset-0 z-[60] lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
            <div
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-label={title ? `Chọn chức năng ${title}` : 'Chọn chức năng'}
              tabIndex={-1}
              className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] outline-none [background:var(--pf-surface)]"
            >
              <p className="mb-2 px-1 text-sm font-bold [color:var(--pf-text)]">{title ?? 'Chức năng'}</p>
              {groups.map((g) => (
                <div key={g.name || '_'} className="mb-2">
                  {g.name && <p className="px-1 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide [color:var(--pf-color-muted)]">{g.name}</p>}
                  <ul className="overflow-hidden rounded-2xl border [border-color:var(--pf-border)]">
                    {g.items.map((it, i) => {
                      const on = it.key === active
                      return (
                        <li key={it.key} className={cn(i > 0 && 'border-t [border-color:var(--pf-border)]')}>
                          <button
                            type="button"
                            aria-current={on ? 'true' : undefined}
                            onClick={() => { setOpen(false); if (!on) onSelect(it.key) }}
                            className={cn('flex min-h-[52px] w-full items-center justify-between gap-3 px-4 text-left text-base font-semibold',
                              on ? '[background:var(--pf-primary-soft)] [color:var(--pf-primary-text)]' : '[color:var(--pf-text)]')}
                          >
                            <span className="min-w-0 truncate">{it.label}</span>
                            <span className="flex shrink-0 items-center gap-2">
                              {typeof it.badge === 'number' && it.badge > 0 && <span className="inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[#DC2626] px-1.5 text-xs font-bold text-white">{it.badge}</span>}
                              {on && <Check size={18} aria-hidden />}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
