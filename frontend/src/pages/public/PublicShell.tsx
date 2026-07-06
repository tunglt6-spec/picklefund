/**
 * PublicShell (V2.2) — khung trang công khai (Landing/Pricing): topbar sáng + footer.
 * Nền sáng, border nhẹ, không sidebar tối. Mobile-first.
 */
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export function PublicShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen [background:var(--pf-bg)] [color:var(--pf-text)]">
      <header className="sticky top-0 z-30 border-b [border-color:var(--pf-border)] [background:rgba(255,255,255,0.85)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-sm text-white"
              style={{ background: 'var(--pf-primary)' }}
            >
              P
            </span>
            <span className="text-base">
              Pickle<span style={{ color: 'var(--pf-primary)' }}>Fund</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/pricing"
              className="rounded-full px-3 py-1.5 font-medium [color:var(--pf-color-muted)] hover:[color:var(--pf-text)]"
            >
              Bảng giá
            </Link>
            <button
              onClick={() => navigate('/login')}
              className="rounded-full px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
              style={{ background: 'var(--pf-primary)' }}
            >
              Đăng nhập
            </button>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t [border-color:var(--pf-border)] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center text-xs [color:var(--pf-color-muted)]">
          <p className="font-semibold [color:var(--pf-text)]">PickleFund</p>
          <p>Nền tảng vận hành CLB Pickleball có AI — quỹ, điểm danh, minigame, báo cáo.</p>
          <p>© 2026 PickleFund. Bản quyền thuộc đội ngũ phát triển.</p>
        </div>
      </footer>
    </div>
  )
}
