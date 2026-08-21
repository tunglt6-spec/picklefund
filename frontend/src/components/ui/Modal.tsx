import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Portal } from './Portal'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  footer?: ReactNode
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export function Modal({ open, onClose, title, subtitle, children, size = 'md', footer }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // A11y: đóng bằng Esc + đưa focus vào panel khi mở (screen reader / bàn phím).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => panelRef.current?.focus(), 0)
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t) }
  }, [open, onClose])

  if (!open) return null

  return (
    <Portal>
    <div
      // Portal ra body + h-[100dvh]: overlay bám viewport thật (thoát .pf-page/scroll ancestor),
      // dvh = vùng nhìn thấy thực trên mobile → modal luôn căn đúng, không tụt lên/xuống.
      className="fixed inset-x-0 top-0 h-[100dvh] z-50 flex items-end justify-center p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="pf-modal-backdrop absolute inset-0 bg-slate-900/40 pointer-events-none" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
        'pf-modal-panel relative z-10 w-full [background:var(--pf-surface)] shadow-2xl shadow-slate-900/10 overflow-hidden flex flex-col outline-none',
        'rounded-t-2xl max-h-[90dvh] sm:rounded-2xl sm:max-h-[calc(100dvh-2rem)]',
        sizeClasses[size]
      )}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-[color:var(--pf-border)] shrink-0">
          <div>
            <h2 className="text-base font-semibold [color:var(--pf-text)]">{title}</h2>
            {subtitle && <p className="text-xs [color:var(--pf-color-muted)] mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-9 w-9 items-center justify-center rounded-lg [color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)] hover:[color:var(--pf-text)] transition-colors ml-4 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pf-primary)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[color:var(--pf-border)] shrink-0 [background:var(--pf-surface-muted)]">
            {footer}
          </div>
        )}
      </div>
    </div>
    </Portal>
  )
}
