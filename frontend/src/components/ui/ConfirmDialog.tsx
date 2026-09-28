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
  // onCancel qua ref → KHÔNG đưa vào deps (arrow inline đổi identity mỗi render sẽ khiến
  // effect chạy lại và cướp focus mỗi lần cha re-render). deps = [open]: focus 1 lần khi mở.
  const onCancelRef = useRef(onCancel)
  useEffect(() => { onCancelRef.current = onCancel }, [onCancel])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancelRef.current() }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => cancelRef.current?.focus(), 0)
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t) }
  }, [open])

  if (!open) return null

  // Token-only (dark-safe): danger → đỏ token, warning → cam token.
  const accent = variant === 'danger' ? 'var(--pf-color-danger)' : 'var(--pf-color-warning)'
  const accentSoft = variant === 'danger' ? 'var(--pf-color-danger-soft)' : 'var(--pf-color-warning-soft)'

  return (
    <Portal>
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onCancel} />
      <div role="dialog" aria-modal="true" aria-label={title}
        className="relative w-full max-w-sm [background:var(--pf-surface)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Close */}
        <button onClick={onCancel} aria-label="Đóng"
          className="absolute right-4 top-4 h-9 w-9 flex items-center justify-center rounded-lg [color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pf-primary)]">
          <X size={15} />
        </button>

        <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center">
          {/* Icon */}
          <div className="h-12 w-12 rounded-full flex items-center justify-center mb-4" style={{ background: accentSoft }}>
            <AlertTriangle size={22} style={{ color: accent }} />
          </div>

          <h2 className="text-base font-bold [color:var(--pf-text)] mb-2">{title}</h2>
          <p className="text-sm [color:var(--pf-color-muted)] leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <Button ref={cancelRef} variant="outline" className="flex-1 min-h-11" onClick={onCancel}>{cancelLabel}</Button>
          <button
            onClick={onConfirm}
            style={{ background: accent }}
            className="flex-1 min-h-11 px-4 text-sm font-medium rounded-lg text-white flex items-center justify-center gap-2 transition-all hover:brightness-95 active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pf-primary)]"
          >
            <X size={14} />{confirmLabel}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  )
}
