/**
 * Portal — render children thẳng ra <body>, THOÁT mọi ancestor trong vùng route
 * (`.pf-page` page-transition có transform, `<main overflow-hidden>`, container cuộn…).
 *
 * LÝ DO: `position:fixed` bị "giam" bởi ancestor có transform/filter/will-change/contain →
 * modal căn theo phần tử nội dung (dài) thay vì viewport → tụt lên/xuống, phải cuộn. Portal ra
 * body đảm bảo overlay LUÔN bám viewport thật (chuẩn SaaS — mọi thư viện modal đều portal).
 */
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted || typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
