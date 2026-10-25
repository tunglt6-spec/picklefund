import { useEffect, useRef, type ReactNode } from 'react'
import { ChevronLeft } from '../icons/mobileLucide'
import { HubSectionTitle, TileGrid } from './HubParts'
import type { AppItem } from './hubApps'

export interface MenuItem extends AppItem {
  /** Nhóm trong lưới (vd "Quản trị"); mục không có nhóm xếp trước. */
  group?: string
}

/** Tìm phần tử cuộn gần nhất (AppLayout cuộn trong 1 container riêng, không phải window). */
function scroller(el: HTMLElement | null): HTMLElement | null {
  let n = el?.parentElement ?? null
  while (n) {
    const oy = getComputedStyle(n).overflowY
    if (oy === 'auto' || oy === 'scroll') return n
    n = n.parentElement
  }
  return null
}

export const scrollKey = (id: string) => `pf_menu_scroll:${id}`

/** Lưu vị trí cuộn của lưới chức năng trước khi mở một chức năng (để Quay lại đúng chỗ). */
export function saveMenuScroll(id: string, from: HTMLElement | null) {
  try { sessionStorage.setItem(scrollKey(id), String(scroller(from)?.scrollTop ?? 0)) } catch { /* noop */ }
}

/**
 * Màn chọn chức năng (mobile): lưới icon CÙNG hệ thống với trang Ứng dụng (TileGrid).
 * Thay hàng tab chuyển nghiệp vụ. Có nhóm → tiêu đề nhóm; có `onBack` → nút quay lại cấp trên.
 */
export function MobileModuleMenu({ title, subtitle, items, onSelect, onBack, scrollId, children }: {
  title: string
  subtitle?: string
  items: MenuItem[]
  onSelect: (item: MenuItem) => void
  onBack?: () => void
  scrollId: string
  children?: ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let y = 0
    try { y = Number(sessionStorage.getItem(scrollKey(scrollId)) ?? 0) } catch { /* noop */ }
    const sc = scroller(root.current)
    if (sc && y > 0) requestAnimationFrame(() => { sc.scrollTop = y })
  }, [scrollId])

  const groups: { name: string; items: MenuItem[] }[] = []
  for (const it of items) {
    const name = it.group ?? ''
    let g = groups.find((x) => x.name === name)
    if (!g) { g = { name, items: [] }; groups.push(g) }
    g.items.push(it)
  }
  groups.sort((a, b) => (a.name === '' ? -1 : b.name === '' ? 1 : 0))

  return (
    <div ref={root} data-mobile-function-menu data-has-back={!!onBack} className="mx-auto w-full max-w-2xl px-4 pb-6 pt-3">
      <div className="flex items-center gap-2">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Quay lại"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border [background:var(--pf-surface)] [border-color:var(--pf-border)] [color:var(--pf-primary-text)] active:scale-95">
            <ChevronLeft size={22} aria-hidden />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="break-words text-[22px] font-[800] leading-tight [color:var(--pf-text)]" style={{ letterSpacing: '-0.02em' }}>{title}</h1>
          {subtitle && <p className="text-sm [color:var(--pf-color-muted)]">{subtitle}</p>}
        </div>
      </div>
      {children}
      {groups.map((g, gi) => (
        <div key={g.name || '_'} className="pf-glass-group" data-mod={g.items[0]?.module}>
          {g.name && <HubSectionTitle first={gi === 0}>{g.name}</HubSectionTitle>}
          <TileGrid items={g.items} onSelect={(it) => onSelect(it as MenuItem)} />
        </div>
      ))}
    </div>
  )
}

/** Header gọn của màn nghiệp vụ: nút quay lại nhóm chức năng + tên chức năng cụ thể. Không mang theo tab/lưới cấp cha. */
export function MobileFunctionHeader({ title, parent, onBack, right }: { title: string; parent?: string; onBack: () => void; right?: ReactNode }) {
  return (
    <div className="pf-mobile-function-head sticky top-0 z-20 border-b px-4 py-2 [background:var(--pf-surface)] [border-color:var(--pf-border)] lg:hidden">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-2">
        <button type="button" onClick={onBack} aria-label={parent ? `Quay lại ${parent}` : 'Quay lại'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border [background:var(--pf-surface)] [border-color:var(--pf-border)] [color:var(--pf-primary-text)] active:scale-95">
          <ChevronLeft size={22} aria-hidden />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-[800] [color:var(--pf-text)]">{title}</h1>
        {right}
      </div>
    </div>
  )
}
