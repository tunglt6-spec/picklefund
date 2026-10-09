import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Bọc 1 <table> thô: dưới 1024px hiển thị mỗi hàng thành THẺ (CSS .pf-table-cards ở index.css).
 * Gắn data-label (lấy từ <th>) cho từng <td> để hiện nhãn cột; theo dõi thay đổi DOM nên bảng đổi dữ liệu vẫn đúng.
 * Từ 1024px trở lên giữ nguyên bảng.
 */
export function TableCardsWrap({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const apply = () => {
      const table = root.querySelector('table')
      if (!table) return
      const heads = Array.from(table.querySelectorAll('thead th')).map((th) => (th.textContent ?? '').trim())
      table.querySelectorAll('tbody tr').forEach((tr) => {
        Array.from(tr.children).forEach((td, i) => {
          const label = heads[i] ?? ''
          if (label && td.getAttribute('data-label') !== label) td.setAttribute('data-label', label)
          if (!label && td.hasAttribute('data-label')) td.removeAttribute('data-label')
        })
      })
    }
    apply()
    const mo = new MutationObserver(apply)
    mo.observe(root, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [])

  return <div ref={ref} className={`pf-table-cards ${className}`}>{children}</div>
}
