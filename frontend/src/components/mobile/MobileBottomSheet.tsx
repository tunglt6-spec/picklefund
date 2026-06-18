import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface MobileBottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  actions?: React.ReactNode
}

export function MobileBottomSheet({ open, onClose, title, children, actions }: MobileBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative bg-white rounded-t-[24px] flex flex-col max-h-[90dvh] shadow-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        {title && (
          <div className="px-5 py-3 border-b border-slate-100 flex-shrink-0">
            <h3 className="text-[17px] font-[700] text-slate-900">{title}</h3>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>

        {/* Sticky actions */}
        {actions && (
          <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100 bg-white">
            {actions}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
