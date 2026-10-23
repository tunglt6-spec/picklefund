/**
 * ModuleTabs — shell mỏng gom nhiều màn ĐÃ CÓ thành tab con của một "module".
 *
 * Nguyên tắc (UI Consolidation v2.1): shell CHỈ là thanh tab + render thẳng page đã có
 * bên dưới. KHÔNG bọc PageShell/PageHeader (mỗi page tự giữ khung + header của nó → không
 * đúp), KHÔNG thêm scroll container (AppLayout đã có `overflow-y-auto`). Tab active lưu ở
 * query `?tab=` nên deep-link + nút Back hoạt động; RBAC do từng page tự đọc `useAuthStore`
 * nên giữ nguyên. Không đổi bất kỳ nghiệp vụ nào — chỉ tinh gọn điều hướng.
 */
import { createContext, useContext, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CalendarDays, UserPlus, LogIn, ClipboardCheck, BarChart3, LayoutList, Trophy, FileCheck2, Medal, Wallet,
  ArrowDownCircle, ArrowUpCircle, HandCoins, FileText, BadgeCheck, Users, Award, UserCog, ShieldCheck, History,
  Bell, CreditCard, Settings, Receipt, ListOrdered, LayoutGrid, ChevronLeft, type LucideIcon,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useIsMobile } from '../../hooks/useIsMobile'
import { TileGrid, HubSearch, fold } from '../mobile/HubParts'
import type { AppItem } from '../mobile/hubApps'

/** Icon cho ô menu (mobile) theo key tab; thiếu key → LayoutGrid. */
const TAB_ICONS: Record<string, LucideIcon> = {
  schedule: CalendarDays, registration: UserPlus, checkin: LogIn, attendance: ClipboardCheck, attend: ClipboardCheck,
  weekly: BarChart3, overview: LayoutList, tournaments: Trophy, results: FileCheck2, standings: Medal,
  periods: Wallet, income: ArrowDownCircle, expense: ArrowUpCircle, debts: HandCoins, reports: FileText,
  payments: BadgeCheck, list: Users, scoring: Award, accounts: UserCog, roles: ShieldCheck, activity: History,
  notifications: Bell, billing: CreditCard, settings: Settings, receipt: Receipt, contrib: History, ledger: ListOrdered,
}

export interface ModuleTab {
  key: string
  label: string
  badge?: number
  element: ReactNode
  /** Icon ô menu trên mobile (mặc định tra theo key). */
  icon?: LucideIcon
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
  /** Thẻ tóm tắt hiện ở đầu MENU mobile (dưới ô tìm kiếm). */
  summary?: ReactNode
}

export function ModuleTabs({ tabs, title, defaultKey, summary }: ModuleTabsProps) {
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

  // Mobile (<1024px) — module có tiêu đề: mở module (chưa chọn tab) → MENU ô icon thay cho thanh tab ngang;
  // chọn 1 ô → vào chức năng, có nút quay lại menu. Deep-link ?tab=… vẫn vào thẳng chức năng.
  const [menuQuery, setMenuQuery] = useState('')
  const mobile = useIsMobile(1024)
  const mobileMenu = mobile && !!title && tabs.length > 1
  const hasChosen = tabs.some((t) => t.key === requested)
  if (mobileMenu && !hasChosen) {
    const q = fold(menuQuery.trim())
    const items: AppItem[] = tabs
      .filter((t) => !q || fold(t.label).includes(q))
      .map((t) => ({ key: t.key, label: t.label, to: '', icon: TAB_ICONS[t.key] ?? t.icon ?? LayoutGrid, badgeCount: t.badge }))
    return (
      <div className="mx-auto w-full max-w-2xl px-4 pb-4 pt-4">
        <h1 className="text-[22px] font-[800] [color:var(--pf-text)]" style={{ letterSpacing: '-0.02em' }}>{title}</h1>
        <HubSearch value={menuQuery} onChange={setMenuQuery} placeholder={`Tìm trong ${title}…`} />
        {!q && summary}
        <div className="mt-5">
          <TileGrid items={items} onSelect={(it) => select(it.key)} empty={`Không tìm thấy chức năng “${menuQuery}”.`} />
        </div>
      </div>
    )
  }
  const backToMenu = () => {
    const next = new URLSearchParams(params)
    next.delete('tab')
    setParams(next)
  }

  return (
    <div className="flex min-h-full w-full flex-col" style={{ background: 'transparent' }}>
      {/* Tiêu đề module (như mockup) — cuộn theo trang, tab bar dính bên dưới */}
      {mobileMenu && (
        <div className="px-4 pt-4">
          <button
            onClick={backToMenu}
            className="flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold [background:var(--pf-surface)] [border-color:var(--pf-border)] [color:var(--pf-primary)] active:scale-[0.98]"
            style={{ boxShadow: 'var(--pf-shadow-float)' }}
          >
            <ChevronLeft size={18} />
            {title}{current ? ` · ${current.label}` : ''}
          </button>
        </div>
      )}
      {title && !mobileMenu && (
        <div className="pf-center-x w-full px-4 pt-4 sm:px-6 sm:pt-6" style={{ maxWidth: 1600 }}>
          <h1 className="text-xl font-bold sm:text-2xl [color:var(--pf-text)] max-lg:text-[22px] max-lg:font-[800]" style={{ letterSpacing: '-0.02em' }}>
            {title}
          </h1>
        </div>
      )}
      {/* Thanh tab module — sticky trắng, full-bleed; nội dung tab căn cùng max-width page */}
      <div
        className={cn('pf-glass-bar sticky top-0 z-20 shrink-0 border-b', mobileMenu && 'hidden')}
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
                    'shrink-0 whitespace-nowrap rounded-xl max-lg:rounded-full max-lg:min-h-[44px] border px-4 py-2.5 [@media(pointer:coarse)]:py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.97]',
                    isActive
                      ? 'border-transparent text-white [box-shadow:0_8px_18px_-8px_rgba(109,93,251,0.6)]'
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
