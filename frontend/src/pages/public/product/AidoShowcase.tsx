/**
 * /product/aido — AIDO AI Digital Office: giới thiệu 5 trợ lý AI (dữ liệu THẬT từ AGENTS),
 * cách vận hành (human-in-the-loop) và liên kết Executive Report. Nội dung dựa trên tính năng
 * sản phẩm thật, không bịa số liệu khách hàng.
 */
import { ShieldCheck, Workflow, Sparkles, ArrowRight, FileBarChart } from 'lucide-react'
import { PublicPage, PageHero, PUBLIC_CONTAINER, CtaButtons } from '../PublicPage'
import { AGENTS } from '../landing-content'

const FLOW = [
  { step: '1', title: 'Cảm nhận & Phân tích', desc: 'Maika đọc dữ liệu CLB thật (quỹ, thành viên, hoạt động) và nhận diện điểm cần chú ý.' },
  { step: '2', title: 'Điều phối', desc: 'Hermes sắp xếp workflow, lịch và các bước phê duyệt phù hợp.' },
  { step: '3', title: 'Con người phê duyệt', desc: 'Mọi hành động quan trọng đều CHỜ Ban quản trị xác nhận — AI không tự quyết việc tiền bạc.' },
  { step: '4', title: 'Thực thi & Thông báo', desc: 'Mít Đặc thực thi sau khi được duyệt; Notification AI gửi in-app/email/Telegram.' },
]

export function AidoShowcase() {
  return (
    <PublicPage title="AIDO — AI Digital Office">
      <PageHero
        eyebrow="AIDO · AI Digital Office"
        title="Đội ngũ AI vận hành CLB cùng bạn"
        desc="Không gian làm việc AI với 5 trợ lý chuyên trách — phân tích, hỗ trợ, điều phối, thực thi và thông báo. Bạn luôn giữ quyền quyết định; AI lo phần lặp lại."
      >
        <CtaButtons />
      </PageHero>

      {/* 5 agents */}
      <section className={`${PUBLIC_CONTAINER} py-14`}>
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Năm trợ lý, một văn phòng</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm [color:var(--pf-color-muted)]">Mỗi trợ lý đảm nhận một vai trò rõ ràng trong quy trình vận hành CLB.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((a) => (
            <div
              key={a.name}
              className="rounded-2xl border p-5 [border-color:var(--pf-border)] [background:var(--pf-surface)]"
              style={{ borderTop: `3px solid ${a.color}` }}
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full" style={{ background: a.soft }}>
                  <img src={a.avatar} alt={a.name} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-extrabold" style={{ color: a.color }}>{a.name}</p>
                  <p className="truncate text-[11px] font-medium [color:var(--pf-color-muted)]">{a.role}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed [color:var(--pf-color-muted)]">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cách vận hành */}
      <section className="border-y [border-color:var(--pf-border)] [background:var(--pf-surface-muted)]">
        <div className={`${PUBLIC_CONTAINER} py-14`}>
          <div className="mb-8 text-center">
            <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] [color:var(--pf-primary)]"><Workflow size={14} /> Cách vận hành</div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Tự động hoá có kiểm soát</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {FLOW.map((f) => (
              <div key={f.step} className="relative rounded-2xl border p-5 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold text-white" style={{ background: 'var(--pf-primary)' }}>{f.step}</div>
                <p className="text-sm font-bold">{f.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed [color:var(--pf-color-muted)]">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-2xl border p-4 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 [color:var(--pf-green)]" />
            <p className="text-[13px] leading-relaxed [color:var(--pf-color-muted)]">
              <b className="[color:var(--pf-text)]">Con người luôn ở vị trí quyết định.</b> AI đề xuất và thực thi các tác vụ lặp lại, nhưng mọi việc liên quan tiền bạc/quan trọng đều cần Ban quản trị phê duyệt. Mọi con số đến từ dữ liệu thật của CLB.
            </p>
          </div>
        </div>
      </section>

      {/* Executive Report teaser */}
      <section className={`${PUBLIC_CONTAINER} py-14`}>
        <div className="overflow-hidden rounded-3xl border [border-color:var(--pf-border)]" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--pf-primary) 10%, var(--pf-surface)), var(--pf-surface))' }}>
          <div className="grid items-center gap-6 p-8 md:grid-cols-[1.3fr_1fr] md:p-10">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] [color:var(--pf-primary)]"><FileBarChart size={14} /> AIDO Executive Report</div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Báo cáo điều hành cho Ban quản trị</h2>
              <p className="mt-3 text-sm leading-relaxed [color:var(--pf-color-muted)]">
                Một cú nhấp: tổng hợp sức khỏe CLB, tài chính, thành viên, hoạt động, thi đấu và hiệu suất AI theo từng kỳ quỹ — kèm tóm tắt do AI viết, dự báo và xuất PDF/Excel. Có thể tự gửi email đầu mỗi tháng.
              </p>
              <a href="/login" className="mt-5 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: 'var(--pf-primary)' }}>
                Trải nghiệm trong app <ArrowRight size={15} />
              </a>
            </div>
            <ul className="space-y-2 text-sm">
              {['Điểm sức khỏe CLB (6 chiều)', 'Tóm tắt điều hành do AI viết', 'Dự báo 30–90 ngày', 'Xuất PDF · Excel · Ảnh', 'Tự gửi email hằng tháng'].map((x) => (
                <li key={x} className="flex items-center gap-2 rounded-xl border px-3 py-2 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
                  <Sparkles size={14} className="[color:var(--pf-primary)]" /> {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={`${PUBLIC_CONTAINER} pb-16 text-center`}>
        <h2 className="text-2xl font-extrabold tracking-tight">Sẵn sàng để AI đồng hành cùng CLB?</h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3"><CtaButtons /></div>
      </section>
    </PublicPage>
  )
}
