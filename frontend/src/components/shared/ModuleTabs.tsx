/**
 * ModuleTabs — shell mỏng gom nhiều màn ĐÃ CÓ thành tab con của một "module".
 *
 * Nguyên tắc (UI Consolidation v2.1): shell CHỈ là thanh tab + render thẳng page đã có
 * bên dưới. KHÔNG bọc PageShell/PageHeader (mỗi page tự giữ khung + header của nó → không
 * đúp), KHÔNG thêm scroll container (AppLayout đã có `overflow-y-auto`). Tab active lưu ở
 * query `?tab=` nên deep-link + nút Back hoạt động; RBAC do từng page tự đọc `useAuthStore`
 * nên giữ nguyên. Không đổi bất kỳ nghiệp vụ nào — chỉ tinh gọn điều hướng.
 */
import { createContext, useContext, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { cn } from '../../lib/utils'

export interface ModuleTab {
  key: string
  label: string
  badge?: number
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
}

export function ModuleTabs({ tabs, title, defaultKey }: ModuleTabsProps) {
  const embedded = !!title
  const [params, setParams] = useSearchParams()
  const fallback = defaultKey ?? tabs[0]?.key
  const requested = params.get('tab')
  const active = tabs.some((t) => t.key === requested) ? requested! : fallback
  const current = tabs.find((t) => t.key === active) ?? tabs[0]

  const select = (key: string) => {
    const next = new URLSearchParams(params)
    next.set('tab', key)
    setParams(next)
  }

  return (
    <div className="flex min-h-full w-full flex-col" style={{ background: 'var(--pf-bg)' }}>
      {/* Tiêu đề module (như mockup) — cuộn theo trang, tab bar dính bên dưới */}
      {title && (
        <div className="pf-center-x w-full px-4 pt-4 sm:px-6 sm:pt-6" style={{ maxWidth: 1600 }}>
          <h1 className="text-xl font-bold sm:text-2xl [color:var(--pf-text)]" style={{ letterSpacing: '-0.02em' }}>
            {title}
          </h1>
        </div>
      )}
      {/* Thanh tab module — sticky trắng, full-bleed; nội dung tab căn cùng max-width page */}
      <div
        className="sticky top-0 z-20 shrink-0 border-b [border-color:var(--pf-border)]"
        style={{ background: 'var(--pf-surface)' }}
      >
        <div className="pf-center-x w-full px-4 sm:px-6" style={{ maxWidth: 1600 }}>
          {/* Chuẩn v2.1 — tab dạng NÚT TO như sidebar: active nền tím gradient + chữ trắng. */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2.5">
            {tabs.map((t) => {
              const isActive = t.key === active
              return (
                <button
                  key={t.key}
                  onClick={() => select(t.key)}
                  className={cn(
                    'shrink-0 whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200',
                    isActive
                      ? 'border-transparent text-white [box-shadow:0_8px_18px_-8px_rgba(109,93,251,0.6)]'
                      : '[border-color:var(--pf-border)] [background:var(--pf-surface)] [color:var(--pf-color-muted)] hover:-translate-y-px hover:[color:var(--pf-primary)] hover:[border-color:var(--pf-primary-soft)] hover:[background:var(--pf-primary-soft)]',
                  )}
                  style={isActive ? { background: 'linear-gradient(135deg,#6D5DFB,#5B4BE8)' } : undefined}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {t.label}
                    {typeof t.badge === 'number' && t.badge > 0 && (
                      <span className={cn(
                        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold',
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
        <div className="flex-1">{current?.element}</div>
      </EmbeddedContext.Provider>
    </div>
  )
}
