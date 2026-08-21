import { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from './Button'
import { Portal } from './Portal'

interface ConfirmDialogProps {
  open: boolean
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title = 'Bạn có chắc chắn muốn xóa?',
  message = 'Hành động này sẽ bị xóa vĩnh viễn và không thể khôi phục lại.',
  confirmLabel = 'Xóa',
  cancelLabel = 'Hủy bỏ',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => cancelRef.current?.focus(), 0)
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t) }
  }, [open, onCancel])

  if (!open) return null

  const iconBg = variant === 'danger' ? 'bg-red-50' : 'bg-amber-50'
  const iconColor = variant === 'danger' ? 'text-red-500' : 'text-amber-500'
  const btnClass = variant === 'danger'
    ? 'bg-red-500 hover:bg-red-500 text-white'
    : 'bg-amber-500 hover:bg-amber-500 text-white'

  return (
    <Portal>
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onCancel} />
      <div role="dialog" aria-modal="true" aria-label={title}
        className="relative w-full max-w-sm [background:var(--pf-surface)] rounded-2xl shadow-2xl shadow-slate-900/10 overflow-hidden">
        {/* Close */}
        <button onClick={onCancel} aria-label="Đóng"
          className="absolute right-4 top-4 h-9 w-9 flex items-center justify-center rounded-lg [color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pf-primary)]">
          <X size={15} />
        </button>

        <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center">
          {/* Icon */}
          <div className={`h-12 w-12 rounded-full ${iconBg} flex items-center justify-center mb-4`}>
            <AlertTriangle size={22} className={iconColor} />
          </div>

          <h2 className="text-base font-bold [color:var(--pf-text)] mb-2">{title}</h2>
          <p className="text-sm [color:var(--pf-color-muted)] leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <Button ref={cancelRef} variant="outline" className="flex-1" onClick={onCancel}>{cancelLabel}</Button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-9 px-4 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors ${btnClass}`}
          >
            <X size={14} />{confirmLabel}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  )
}
