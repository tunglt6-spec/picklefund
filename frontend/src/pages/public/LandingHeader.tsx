/**
 * LandingHeader — header thương mại PickleFund: mega-menu desktop + drawer/accordion mobile.
 * Sticky, nền trắng mờ, shadow nhẹ khi cuộn. A11y: aria-expanded/haspopup, đóng bằng Escape,
 * click ra ngoài, khóa scroll nền khi drawer mở. Nội dung lấy từ landing-content.ts.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, ChevronDown, Clock, ArrowRight } from 'lucide-react'
import { MEGA_MENUS, type MegaMenu, type MenuItem } from './landing-content'
import { useLandingNav } from './useLandingNav'

function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight shrink-0" aria-label="PickleFund — trang chủ">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm text-white" style={{ background: 'var(--pf-primary)' }}>P</span>
      <span className="text-[17px]">Pickle<span style={{ color: 'var(--pf-primary)' }}>Fund</span></span>
    </Link>
  )
}

/* ── Desktop mega panel ── */
function MegaPanel({ menu, onNavigate }: { menu: MegaMenu; onNavigate: (href?: string) => void }) {
  const gridCols = menu.columns === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'
  return (
    <div className="absolute left-1/2 top-full z-50 w-[min(920px,calc(100vw-2rem))] -translate-x-1/2 pt-3">
      <div
        className="rounded-2xl border p-5 [background:var(--pf-surface)] [border-color:var(--pf-border)]"
        style={{ boxShadow: 'var(--pf-shadow-hover)' }}
      >
        {menu.heading && (
          <div className="mb-4 border-b pb-3 [border-color:var(--pf-border)]">
            <p className="text-sm font-bold [color:var(--pf-primary)]">{menu.heading}</p>
            {menu.description && <p className="mt-1 text-xs [color:var(--pf-color-muted)]">{menu.description}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 gap-x-5 gap-y-1 ${gridCols}`}>
          {menu.groups.map((group, gi) => (
            <div key={gi}>
              {group.title && (
                <p className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide [color:var(--pf-color-muted)]">{group.title}</p>
              )}
              {group.items.map((item) => (
                <MegaItem key={item.title} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          ))}
        </div>
        {menu.ctas && menu.ctas.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t pt-3 [border-color:var(--pf-border)]">
            {menu.ctas.map((cta) => (
              <button
                key={cta.label}
                onClick={() => onNavigate(cta.href)}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors [background:var(--pf-primary-soft)] [color:var(--pf-primary)] hover:brightness-95"
              >
                {cta.label} <ArrowRight size={13} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MegaItem({ item, onNavigate }: { item: MenuItem; onNavigate: (href?: string) => void }) {
  const Icon = item.icon
  const inner = (
    <>
      {Icon && (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">
          <Icon size={16} />
        </span>
      )}
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-semibold [color:var(--pf-text)]">
          {item.title}
          {item.soon && (
            <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold [background:var(--pf-surface-muted)] [color:var(--pf-color-muted)]">
              <Clock size={9} /> Đang cập nhật
            </span>
          )}
        </span>
        {item.desc && <span className="mt-0.5 block text-xs leading-snug [color:var(--pf-color-muted)]">{item.desc}</span>}
      </span>
    </>
  )
  if (item.soon) {
    return <div className="flex cursor-default items-start gap-3 rounded-xl px-2 py-2 opacity-70">{inner}</div>
  }
  return (
    <button
      onClick={() => onNavigate(item.href)}
      className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:[background:var(--pf-surface-muted)]"
    >
      {inner}
    </button>
  )
}

/* ── Mobile accordion ── */
function MobileAccordion({ menu, onNavigate }: { menu: MegaMenu; onNavigate: (href?: string) => void }) {
  const [open, setOpen] = useState(false)
  const panelId = `m-acc-${menu.key}`
  return (
    <div className="border-b [border-color:var(--pf-border)]">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between px-1 py-3.5 text-left text-[15px] font-semibold [color:var(--pf-text)]"
      >
        {menu.label}
        <ChevronDown size={18} className="transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div id={panelId} className="pb-2">
          {menu.groups.map((group, gi) => (
            <div key={gi} className="mb-1">
              {group.title && <p className="px-1 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wide [color:var(--pf-color-muted)]">{group.title}</p>}
              {group.items.map((item) =>
                item.soon ? (
                  <div key={item.title} className="flex items-center gap-1.5 px-3 py-2 text-sm opacity-60 [color:var(--pf-color-muted)]">
                    {item.title}
                    <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold [background:var(--pf-surface-muted)]"><Clock size={9} /> Đang cập nhật</span>
                  </div>
                ) : (
                  <button
                    key={item.title}
                    onClick={() => onNavigate(item.href)}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm [color:var(--pf-text)] hover:[background:var(--pf-surface-muted)]"
                  >
                    {item.title}
                  </button>
                ),
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function LandingHeader() {
  const navigate = useNavigate()
  const go = useLandingNav()
  const [scrolled, setScrolled] = useState(false)
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [drawer, setDrawer] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)

  // Shadow nhẹ khi cuộn.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Đóng dropdown: Escape + click ra ngoài.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpenKey(null); setDrawer(false) }
    }
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenKey(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [])

  // Khóa scroll nền khi drawer mở.
  useEffect(() => {
    if (drawer) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [drawer])

  const onNavigate = (href?: string) => { setOpenKey(null); setDrawer(false); go(href) }

  return (
    <header
      className="sticky top-0 z-40 border-b transition-shadow [background:rgba(255,255,255,0.9)] backdrop-blur"
      style={{ borderColor: scrolled ? 'var(--pf-border)' : 'transparent', boxShadow: scrolled ? 'var(--pf-shadow)' : 'none' }}
    >
      <div className="pf-center-x flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark />

        {/* Desktop nav */}
        <div ref={navRef} className="hidden items-center gap-0.5 lg:flex">
          {MEGA_MENUS.map((menu) => (
            <div
              key={menu.key}
              className="relative"
              onMouseEnter={() => setOpenKey(menu.key)}
              onMouseLeave={() => setOpenKey(null)}
            >
              <button
                onClick={() => setOpenKey((k) => (k === menu.key ? null : menu.key))}
                onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpenKey(menu.key) } }}
                aria-haspopup="true"
                aria-expanded={openKey === menu.key}
                className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition-colors [color:var(--pf-text-muted)] hover:[color:var(--pf-text)]"
              >
                {menu.label}
                <ChevronDown size={14} className="transition-transform" style={{ transform: openKey === menu.key ? 'rotate(180deg)' : 'none' }} />
              </button>
              {openKey === menu.key && <MegaPanel menu={menu} onNavigate={onNavigate} />}
            </div>
          ))}
          {/* Bảng giá — mục độc lập */}
          <button
            onClick={() => navigate('/pricing')}
            className="rounded-full px-3 py-2 text-sm font-medium transition-colors [color:var(--pf-text-muted)] hover:[color:var(--pf-text)]"
          >
            Bảng giá
          </button>
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-2 lg:flex">
          <button
            onClick={() => navigate('/login')}
            className="rounded-full border px-4 py-2 text-sm font-semibold transition-colors [border-color:var(--pf-border)] [color:var(--pf-text)] hover:[background:var(--pf-surface-muted)]"
          >
            Đăng nhập
          </button>
          <button
            onClick={() => navigate('/login')}
            className="rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
            style={{ background: 'var(--pf-primary)' }}
          >
            Dùng thử miễn phí
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setDrawer(true)}
          className="flex h-11 w-11 items-center justify-center rounded-lg lg:hidden [color:var(--pf-text)]"
          aria-label="Mở menu"
          aria-expanded={drawer}
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <MobileDrawer onClose={() => setDrawer(false)} onNavigate={onNavigate} navigate={navigate} />
      )}
    </header>
  )
}

function MobileDrawer({
  onClose, onNavigate, navigate,
}: { onClose: () => void; onNavigate: (href?: string) => void; navigate: (to: string) => void }): ReactNode {
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu điều hướng">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-[min(88vw,360px)] flex-col [background:var(--pf-surface)]">
        <div className="flex items-center justify-between border-b px-4 py-3 [border-color:var(--pf-border)]">
          <Wordmark />
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg [color:var(--pf-text)]" aria-label="Đóng menu">
            <X size={22} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          {MEGA_MENUS.map((menu) => <MobileAccordion key={menu.key} menu={menu} onNavigate={onNavigate} />)}
          <button
            onClick={() => { onClose(); navigate('/pricing') }}
            className="block w-full border-b px-1 py-3.5 text-left text-[15px] font-semibold [border-color:var(--pf-border)] [color:var(--pf-text)]"
          >
            Bảng giá
          </button>
        </div>
        <div className="flex flex-col gap-2 border-t p-4 [border-color:var(--pf-border)]">
          <button
            onClick={() => { onClose(); navigate('/login') }}
            className="w-full rounded-full border px-4 py-2.5 text-sm font-semibold [border-color:var(--pf-border)] [color:var(--pf-text)]"
          >
            Đăng nhập
          </button>
          <button
            onClick={() => { onClose(); navigate('/login') }}
            className="w-full rounded-full px-4 py-2.5 text-sm font-semibold text-white"
            style={{ background: 'var(--pf-primary)' }}
          >
            Dùng thử miễn phí
          </button>
        </div>
      </div>
    </div>
  )
}
