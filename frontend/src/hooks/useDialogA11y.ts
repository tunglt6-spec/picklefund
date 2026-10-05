import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

// onClose (tuỳ chọn): đóng bằng Esc cho overlay tự dựng (Modal đã tự xử lý Esc nên không truyền).
export function useDialogA11y(open: boolean, panelRef: RefObject<HTMLElement | null>, onClose?: () => void) {
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const t = onCloseRef.current ? setTimeout(() => {
      const p = panelRef.current
      if (p && !p.contains(document.activeElement)) p.focus()
    }, 0) : undefined
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCloseRef.current) { onCloseRef.current(); return }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null)
      if (items.length === 0) { e.preventDefault(); panel.focus(); return }
      const first = items[0]
      const last = items[items.length - 1]
      const cur = document.activeElement
      if (e.shiftKey && (cur === first || cur === panel)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      if (t) clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      if (prev && document.contains(prev)) prev.focus()
    }
  }, [open, panelRef])
}
