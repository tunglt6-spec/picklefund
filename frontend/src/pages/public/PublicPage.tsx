/**
 * PublicPage — khung dùng chung cho MỌI trang công khai (dùng mega LandingHeader + LandingFooter
 * đã có → nav/footer v2 nhất quán toàn site). Trang nội dung chỉ cần bọc children vào đây.
 * Tự cuộn lên đầu khi đổi route + đặt tiêu đề tab.
 */
import { useEffect, type ReactNode } from 'react'
import { LandingHeader } from './LandingHeader'
import { LandingFooter } from './LandingFooter'

export const PUBLIC_CONTAINER = 'pf-center-x w-full max-w-[1200px] px-4 sm:px-8'

export function PublicPage({
  children,
  title,
}: {
  children: ReactNode
  title?: string
}) {
  useEffect(() => {
    if (title) document.title = `${title} · PickleFund`
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [title])

  return (
    <div className="min-h-screen [background:var(--pf-bg)] [color:var(--pf-text)]">
      <LandingHeader />
      <main>{children}</main>
      <LandingFooter />
    </div>
  )
}

/** Hero rút gọn dùng chung cho các trang nội dung (eyebrow + tiêu đề + mô tả + CTA tuỳ chọn). */
export function PageHero({
  eyebrow,
  title,
  desc,
  children,
}: {
  eyebrow?: string
  title: string
  desc?: string
  children?: ReactNode
}) {
  return (
    <section
      className="border-b [border-color:var(--pf-border)]"
      style={{
        background:
          'radial-gradient(120% 120% at 85% -10%, color-mix(in srgb, var(--pf-primary) 10%, transparent), transparent 55%), var(--pf-surface)',
      }}
    >
      <div className={`${PUBLIC_CONTAINER} py-14 sm:py-16 text-center`}>
        {eyebrow && (
          <div className="mb-3 inline-block rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] [border-color:var(--pf-border)] [color:var(--pf-primary)]">
            {eyebrow}
          </div>
        )}
        <h1 className="mx-auto max-w-3xl text-3xl font-extrabold tracking-tight sm:text-[42px] sm:leading-[1.1]">
          {title}
        </h1>
        {desc && (
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed [color:var(--pf-color-muted)]">
            {desc}
          </p>
        )}
        {children && <div className="mt-7 flex flex-wrap items-center justify-center gap-3">{children}</div>}
      </div>
    </section>
  )
}

export function CtaButtons() {
  return (
    <>
      <a
        href="/login"
        className="rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
        style={{ background: 'var(--pf-primary)' }}
      >
        Dùng thử miễn phí
      </a>
      <a
        href="/pricing"
        className="rounded-full border px-6 py-3 text-sm font-semibold transition-colors [border-color:var(--pf-border)] hover:[background:var(--pf-surface-muted)]"
      >
        Xem bảng giá
      </a>
    </>
  )
}
