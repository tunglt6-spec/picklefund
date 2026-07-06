/**
 * PublicShell (V2.2 commercial) — khung trang công khai (Landing/Pricing).
 * Topbar sáng 72px + menu + CTA; mobile: hamburger menu + bottom nav. Container 1200px.
 * Nền sáng, border nhẹ, không dark. Đồng bộ Web/Desktop/Mobile.
 */
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, Home, Sparkles, PlayCircle, Tag, LogIn } from 'lucide-react'

const NAV_LINKS: { label: string; href: string }[] = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Tính năng', href: '/#features' },
  { label: 'Bảng giá', href: '/pricing' },
  { label: 'Demo', href: '/login' },
  { label: 'Hỗ trợ', href: '/#support' },
]

const BOTTOM_NAV: { label: string; href: string; icon: ReactNode }[] = [
  { label: 'Trang chủ', href: '/', icon: <Home size={18} /> },
  { label: 'Tính năng', href: '/#features', icon: <Sparkles size={18} /> },
  { label: 'Demo', href: '/login', icon: <PlayCircle size={18} /> },
  { label: 'Bảng giá', href: '/pricing', icon: <Tag size={18} /> },
  { label: 'Đăng nhập', href: '/login', icon: <LogIn size={18} /> },
]

function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight">
      <span
        className="flex h-8 w-8 items-center justify-center rounded-lg text-sm text-white"
        style={{ background: 'var(--pf-primary)' }}
      >
        P
      </span>
      <span className="text-[17px]">
        Pickle<span style={{ color: 'var(--pf-primary)' }}>Fund</span>
      </span>
    </Link>
  )
}

export function PublicShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen [background:var(--pf-bg)] [color:var(--pf-text)]">
      {/* Topbar 72px */}
      <header className="sticky top-0 z-40 border-b [border-color:var(--pf-border)] [background:rgba(255,255,255,0.9)] backdrop-blur">
        <div className="pf-center-x flex h-[72px] max-w-[1200px] items-center justify-between px-4 sm:px-8">
          <Wordmark />

          {/* Desktop menu */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="rounded-full px-3 py-2 text-sm font-medium [color:var(--pf-color-muted)] transition-colors hover:[color:var(--pf-text)]"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
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
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-11 w-11 items-center justify-center rounded-lg md:hidden [color:var(--pf-text)]"
            aria-label="Menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="border-t [border-color:var(--pf-border)] [background:var(--pf-surface)] md:hidden">
            <nav className="pf-center-x flex max-w-[1200px] flex-col px-4 py-2">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium [color:var(--pf-text)] hover:[background:var(--pf-surface-muted)]"
                >
                  {l.label}
                </a>
              ))}
              <button
                onClick={() => { setMenuOpen(false); navigate('/login') }}
                className="mt-2 rounded-full px-4 py-3 text-sm font-semibold text-white"
                style={{ background: 'var(--pf-primary)' }}
              >
                Dùng thử miễn phí
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* pb cho bottom nav mobile */}
      <main className="pb-20 md:pb-0">{children}</main>

      <footer id="support" className="border-t [border-color:var(--pf-border)] py-8">
        <div className="pf-center-x flex max-w-[1200px] flex-col items-center gap-2 px-4 text-center text-xs [color:var(--pf-color-muted)] sm:px-8">
          <Wordmark />
          <p>Nền tảng vận hành CLB Pickleball có AI — quỹ, điểm danh, minigame, báo cáo.</p>
          <p>Hỗ trợ: support@picklefund.uk · © 2026 PickleFund.</p>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t [border-color:var(--pf-border)] [background:var(--pf-surface)] md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {BOTTOM_NAV.map((n) => (
          <a
            key={n.label}
            href={n.href}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium [color:var(--pf-color-muted)]"
          >
            <span className="[color:var(--pf-primary)]">{n.icon}</span>
            {n.label}
          </a>
        ))}
      </nav>
    </div>
  )
}
