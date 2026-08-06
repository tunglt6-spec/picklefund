/**
 * Trang Pháp lý dùng chung (Terms / Privacy / Cookie) — nội dung CHÍNH THỨC từ legal-content.ts.
 * Render theo "blocks" (đoạn/gạch đầu dòng/tiêu đề phụ/khối liên hệ) + ngày cập nhật.
 */
import { CalendarClock, Mail, Globe } from 'lucide-react'
import { PublicPage, PageHero, PUBLIC_CONTAINER } from '../PublicPage'
import { LEGAL_DOCS, type LegalDoc } from './legal-content'

function ContactCard({ org, website, email }: { org: string; website: string; email: string }) {
  return (
    <div className="my-3 rounded-2xl border p-5 [border-color:var(--pf-border)] [background:var(--pf-surface-muted)]">
      <p className="text-[15px] font-extrabold [color:var(--pf-text)]">{org}</p>
      <div className="mt-2 space-y-1.5">
        <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] font-medium [color:var(--pf-primary)]">
          <Globe size={14} /> {website.replace(/^https?:\/\//, '')}
        </a>
        <a href={`mailto:${email}`} className="flex items-center gap-2 text-[13px] font-medium [color:var(--pf-primary)]">
          <Mail size={14} /> {email}
        </a>
      </div>
    </div>
  )
}

function LegalBody({ doc }: { doc: LegalDoc }) {
  return (
    <PublicPage title={doc.title}>
      <PageHero eyebrow="Pháp lý" title={doc.title} desc={doc.intro} />
      <section className={`${PUBLIC_CONTAINER} py-10`}>
        <div className="mx-auto max-w-3xl">
          <p className="mb-8 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold [border-color:var(--pf-border)] [color:var(--pf-color-muted)]">
            <CalendarClock size={13} /> Cập nhật lần cuối: {doc.updatedAt}
          </p>

          <div className="space-y-7">
            {doc.sections.map((s) => (
              <section key={s.h}>
                <h2 className="mb-2.5 text-[17px] font-extrabold tracking-tight [color:var(--pf-text)]">{s.h}</h2>
                {s.blocks.map((b, i) => {
                  if (b.sub) return <p key={i} className="mb-1.5 mt-3 text-[14px] font-bold [color:var(--pf-text)]">{b.sub}</p>
                  if (b.p) return <p key={i} className="mb-2 text-[14px] leading-relaxed [color:var(--pf-color-muted)]">{b.p}</p>
                  if (b.ul) return (
                    <ul key={i} className="mb-2 mt-1 space-y-1.5">
                      {b.ul.map((li) => (
                        <li key={li} className="flex gap-2 text-[14px] leading-relaxed [color:var(--pf-color-muted)]">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full [background:var(--pf-primary)]" />
                          {li}
                        </li>
                      ))}
                    </ul>
                  )
                  if (b.contact) return <ContactCard key={i} {...b.contact} />
                  return null
                })}
              </section>
            ))}
          </div>
        </div>
      </section>
    </PublicPage>
  )
}

export function Terms() {
  return <LegalBody doc={LEGAL_DOCS.terms} />
}
export function Privacy() {
  return <LegalBody doc={LEGAL_DOCS.privacy} />
}
export function Cookie() {
  return <LegalBody doc={LEGAL_DOCS.cookie} />
}
