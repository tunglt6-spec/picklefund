/**
 * Trang Pháp lý dùng chung (Terms / Privacy / Cookie). Nội dung từ legal-content.ts.
 * LUÔN hiển thị banner "Bản nháp — chưa có hiệu lực pháp lý" để không trình bày nội dung
 * chưa duyệt như văn bản ràng buộc.
 */
import { AlertTriangle } from 'lucide-react'
import { PublicPage, PageHero, PUBLIC_CONTAINER } from '../PublicPage'
import { LEGAL_DOCS, type LegalDoc } from './legal-content'

function LegalBody({ doc }: { doc: LegalDoc }) {
  return (
    <PublicPage title={doc.title}>
      <PageHero eyebrow="Pháp lý" title={doc.title} desc={doc.intro} />
      <section className={`${PUBLIC_CONTAINER} py-10`}>
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-start gap-3 rounded-2xl border p-4 [border-color:var(--pf-color-warning)]" style={{ background: 'var(--pf-color-warning-soft)' }}>
            <AlertTriangle size={18} className="mt-0.5 shrink-0 [color:var(--pf-color-warning)]" />
            <p className="text-[13px] leading-relaxed [color:var(--pf-text)]">
              <b>Bản nháp tham khảo — chưa có hiệu lực pháp lý.</b> Nội dung đang trong quá trình hoàn thiện và sẽ được rà soát trước khi công bố chính thức. Vui lòng liên hệ đội ngũ hỗ trợ nếu cần thông tin ràng buộc.
            </p>
          </div>

          <div className="space-y-6">
            {doc.sections.map((s) => (
              <section key={s.h}>
                <h2 className="mb-2 text-[17px] font-extrabold tracking-tight [color:var(--pf-text)]">{s.h}</h2>
                {s.p?.map((para, j) => (
                  <p key={j} className="mb-2 text-[14px] leading-relaxed [color:var(--pf-color-muted)]">{para}</p>
                ))}
                {s.ul && (
                  <ul className="mt-1 space-y-1.5">
                    {s.ul.map((li) => (
                      <li key={li} className="flex gap-2 text-[14px] leading-relaxed [color:var(--pf-color-muted)]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full [background:var(--pf-primary)]" />
                        {li}
                      </li>
                    ))}
                  </ul>
                )}
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
