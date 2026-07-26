/**
 * LandingFooter — footer thương mại đồng bộ Header. 4 nhóm điều hướng + pháp lý + brand.
 * Nội dung từ landing-content.ts. Item "soon" render "Đang cập nhật" (không dead link).
 */
import { Link } from 'react-router-dom'
import { FOOTER_GROUPS, FOOTER_LEGAL, CONTACT, type MenuItem } from './landing-content'
import { useLandingNav } from './useLandingNav'

function FooterLink({ item, onNavigate }: { item: MenuItem; onNavigate: (href?: string) => void }) {
  if (item.soon) {
    return <span className="cursor-default text-sm [color:var(--pf-color-muted)] opacity-70">{item.title} · <span className="text-[11px]">đang cập nhật</span></span>
  }
  return (
    <button onClick={() => onNavigate(item.href)} className="text-left text-sm [color:var(--pf-color-muted)] transition-colors hover:[color:var(--pf-primary)]">
      {item.title}
    </button>
  )
}

export function LandingFooter() {
  const go = useLandingNav()
  const year = new Date().getFullYear()
  return (
    <footer id="contact" className="border-t [border-color:var(--pf-border)] [background:var(--pf-surface)]">
      <div className="pf-center-x max-w-[1200px] px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight" aria-label="PickleFund">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm text-white" style={{ background: 'var(--pf-primary)' }}>P</span>
              <span className="text-[17px]">Pickle<span style={{ color: 'var(--pf-primary)' }}>Fund</span></span>
            </Link>
            <p className="mt-3 max-w-xs text-xs leading-relaxed [color:var(--pf-color-muted)]">{CONTACT.brandDesc}</p>
            <a href={`mailto:${CONTACT.email}`} className="mt-3 inline-block text-xs font-semibold [color:var(--pf-primary)]">{CONTACT.email}</a>
          </div>

          {FOOTER_GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <p className="text-sm font-bold [color:var(--pf-text)]">{group.title}</p>
              <div className="mt-3 flex flex-col gap-2">
                {group.items.map((item) => <FooterLink key={item.title} item={item} onNavigate={go} />)}
              </div>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs [border-color:var(--pf-border)] [color:var(--pf-color-muted)] sm:flex-row">
          <p>© {year} PickleFund. Nền tảng quản trị CLB thể thao tích hợp AI.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {FOOTER_LEGAL.map((item) => <FooterLink key={item.title} item={item} onNavigate={go} />)}
          </div>
        </div>
      </div>
    </footer>
  )
}
