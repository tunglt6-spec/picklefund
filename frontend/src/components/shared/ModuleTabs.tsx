/**
 * ModuleTabs — shell mỏng gom nhiều màn ĐÃ CÓ thành tab con của một "module".
 *
 * Nguyên tắc (UI Consolidation v2.1): shell CHỈ là thanh tab + render thẳng page đã có
 * bên dưới. KHÔNG bọc PageShell/PageHeader (mỗi page tự giữ khung + header của nó → không
 * đúp), KHÔNG thêm scroll container (AppLayout đã có `overflow-y-auto`). Tab active lưu ở
 * query `?tab=` nên deep-link + nút Back hoạt động; RBAC do từng page tự đọc `useAuthStore`
 * nên giữ nguyên. Không đổi bất kỳ nghiệp vụ nào — chỉ tinh gọn điều hướng.
 */
import { createContext, useContext, useRef, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { LayoutGrid, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useIsMobile } from '../../hooks/useIsMobile'
import { MobileFunctionHeader, MobileModuleMenu, saveMenuScroll, type MenuItem } from '../mobile/ModuleNav'
import type { ModuleKey } from '../mobile/hubApps'

export interface ModuleTab {
  key: string
  label: string
  badge?: number
  /** Nhóm trong bảng chọn chức năng trên mobile (vd "Quản trị"). */
  group?: string
  /** Mobile (<1024px): biểu tượng của ô chức năng trong lưới. */
  icon?: LucideIcon
  /** Mobile: phân hệ → màu icon ô chức năng. */
  module?: ModuleKey
  /** Mobile: nhãn ô/tiêu đề màn khi khác nhãn tab desktop (vd "Tài khoản thành viên"). */
  menuLabel?: string
  /** Mobile: màn này tự có lưới/tiêu đề riêng (lồng ModuleTabs) nên không vẽ header chức năng bên ngoài. */
  nested?: boolean
  element: ReactNode
}

/**
 * EmbeddedContext — báo cho các page biết chúng đang được render LÀM TAB trong một module
 * (không phải route đứng riêng). PageHeader/màn con dùng để BỎ tiêu đề h1 trùng (module +
 * tab đã định danh) nhưng vẫn GIỮ phụ đề + nút thao tác. Chỉ bật khi ModuleTabs có `title`.
 */
const EmbeddedContext = createContext(false)
export const useEmbedded = () => useContext(EmbeddedContext)

interface ModuleTabsProps {
  tabs: ModuleTab[]
  /** Tiêu đề module (vd "Tài chính"). Có title ⇒ bật chế độ embedded (ẩn h1 trùng ở page con). */
  title?: string
  /** Tab mặc định khi URL chưa có ?tab= (mặc định: tab đầu tiên). */
  defaultKey?: string
  /** Tên tham số URL giữ chức năng đang mở (mặc định `tab`; module lồng nhau dùng `view`). */
  paramKey?: string
  /** Mobile: nút quay lại ở lưới chức năng — 'parent' (xóa tham số cấp trên) hoặc đường dẫn cụ thể. */
  menuBack?: 'parent' | string
  /** Tham số URL của cấp trên (dùng khi menuBack='parent'). */
  parentParam?: string
  /** Mô tả ngắn dưới tiêu đề lưới (mobile). */
  subtitle?: string
  /** Phân hệ mặc định cho mọi ô (khi tab không tự khai báo). */
  module?: ModuleKey
}

export function ModuleTabs({ tabs, title, defaultKey, paramKey = 'tab', menuBack, parentParam, subtitle, module }: ModuleTabsProps) {
  const embedded = !!title
  const compact = useIsMobile(1024)
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const anchor = useRef<HTMLDivElement>(null)
  const fallback = defaultKey ?? tabs[0]?.key
  const requested = params.get(paramKey)
  const hasRequested = tabs.some((t) => t.key === requested)
  const active = hasRequested ? requested! : fallback
  const current = tabs.find((t) => t.key === active) ?? tabs[0]

  const select = (key: string) => {
    const next = new URLSearchParams(params)
    next.set(paramKey, key)
    setParams(next)
  }

  // ── Mobile (<1024px): lưới icon chọn chức năng (cùng hệ thống trang Ứng dụng) → màn nghiệp vụ có header gọn. ──
  // Không có chức năng được chọn ⇒ hiện lưới. Chỉ 1 chức năng ⇒ vào thẳng.
  if (compact && tabs.length > 1) {
    const scrollId = `${location.pathname}|${paramKey}`
    const withSearch = (p: URLSearchParams) => (p.toString() ? `?${p.toString()}` : '')
    const goBack = () => {
      if ((location.state as { pfMenu?: boolean } | null)?.pfMenu) { navigate(-1); return }
      const next = new URLSearchParams(params)
      next.delete(paramKey)
      navigate({ pathname: location.pathname, search: withSearch(next) }, { replace: true })
    }
    if (!hasRequested) {
      const items: MenuItem[] = tabs.map((t) => ({
        key: t.key, label: t.menuLabel ?? t.label, to: '', icon: t.icon ?? LayoutGrid, badgeCount: t.badge, group: t.group, module: t.module ?? module,
      }))
      const menuBackFn = menuBack === undefined ? undefined : () => {
        if (menuBack !== 'parent') { navigate(menuBack); return }
        if ((location.state as { pfMenu?: boolean } | null)?.pfMenu) { navigate(-1); return }
        const next = new URLSearchParams(params)
        next.delete(paramKey)
        if (parentParam) next.delete(parentParam)
        navigate({ pathname: location.pathname, search: withSearch(next) }, { replace: true })
      }
      return (
        <MobileModuleMenu
          title={title ?? 'Chức năng'}
          subtitle={subtitle}
          items={items}
          scrollId={scrollId}
          onBack={menuBackFn}
          onSelect={(it) => {
            saveMenuScroll(scrollId, anchor.current)
            const next = new URLSearchParams(params)
            next.set(paramKey, it.key)
            navigate({ pathname: location.pathname, search: withSearch(next) }, { state: { pfMenu: true } })
          }}
        >
          <div ref={anchor} />
        </MobileModuleMenu>
      )
    }
    return (
      <div className="flex min-h-full w-full flex-col">
        {!current?.nested && <MobileFunctionHeader title={current?.menuLabel ?? current?.label ?? ''} parent={title} onBack={goBack} />}
        <EmbeddedContext.Provider value={embedded}>
          <div className="flex-1" role="region" aria-label={current?.menuLabel ?? current?.label}>{current?.element}</div>
        </EmbeddedContext.Provider>
      </div>
    )
  }

  return (
    <div className="flex min-h-full w-full flex-col" style={{ background: 'transparent' }}>
      {/* Tiêu đề module (như mockup) — cuộn theo trang, tab bar dính bên dưới */}
      {title && (
        <div className="pf-center-x w-full px-4 pt-4 sm:px-6 sm:pt-6" style={{ maxWidth: 1600 }}>
          <h1 className="text-xl font-bold sm:text-2xl [color:var(--pf-text)] max-lg:text-[22px] max-lg:font-[800]" style={{ letterSpacing: '-0.02em' }}>
            {title}
          </h1>
        </div>
      )}
      {/* Thanh tab module — sticky trắng, full-bleed; nội dung tab căn cùng max-width page */}
      <div
        className="pf-glass-bar sticky top-0 z-20 shrink-0 border-b"
      >
        <div className="pf-center-x w-full px-4 sm:px-6" style={{ maxWidth: 1600 }}>
          {/* Chuẩn v2.1 — tab dạng NÚT TO như sidebar: active nền tím gradient + chữ trắng. */}
          <div role="tablist" aria-label={title ?? 'Mục con'} className="flex gap-2 overflow-x-auto no-scrollbar py-2.5"
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
              const i = tabs.findIndex((t) => t.key === active)
              const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]
              select(n.key)
              requestAnimationFrame(() => document.getElementById(`mtab-${n.key}`)?.focus())
            }}>
            {tabs.map((t) => {
              const isActive = t.key === active
              return (
                <button
                  key={t.key}
                  id={`mtab-${t.key}`}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => select(t.key)}
                  className={cn(
                    'shrink-0 whitespace-nowrap rounded-xl max-lg:rounded-xl max-lg:min-h-[44px] border px-4 py-2.5 [@media(pointer:coarse)]:py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.97]',
                    isActive
                      ? 'border-transparent text-white [box-shadow:0_8px_18px_-8px_rgba(109,93,251,0.6)] max-lg:[box-shadow:var(--pf-shadow-pill)]'
                      : '[border-color:var(--pf-border)] [background:var(--pf-surface)] [color:var(--pf-color-muted)] hover:-translate-y-px hover:[color:var(--pf-primary-text)] hover:[border-color:var(--pf-primary-soft)] hover:[background:var(--pf-primary-soft)]',
                  )}
                  style={isActive ? { background: 'var(--pf-grad-brand)' } : undefined}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {t.label}
                    {typeof t.badge === 'number' && t.badge > 0 && (
                      <span className={cn(
                        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-xs font-bold',
                        isActive ? 'bg-white/25 text-white' : 'bg-red-500 text-white',
                      )}>
                        {t.badge}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Nội dung tab = page ĐÃ CÓ (tự bọc PageShell/header của nó) */}
      <EmbeddedContext.Provider value={embedded}>
        <div className="flex-1" role="tabpanel" aria-labelledby={current ? `mtab-${current.key}` : undefined}>{current?.element}</div>
      </EmbeddedContext.Provider>
    </div>
  )
}
