/**
 * /product/executive-report — trang giới thiệu AIDO Executive Report (tính năng THẬT đã build).
 * Nội dung bám đúng năng lực sản phẩm: 6 chiều sức khỏe, AI summary, dự báo, Club DNA,
 * xuất PDF/Excel, tự gửi email hằng tháng. Không bịa số liệu khách hàng.
 */
import { Link } from 'react-router-dom'
import {
  FileBarChart, HeartPulse, Sparkles, TrendingUp, Fingerprint, FileDown, MailCheck, ArrowRight, ShieldCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PublicPage, PageHero, PUBLIC_CONTAINER } from '../PublicPage'

const DIMENSIONS = ['Tài chính', 'Thành viên', 'Hoạt động', 'Thi đấu', 'Tăng trưởng', 'Hiệu suất AI']

const CAPABILITIES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: HeartPulse, title: 'Điểm sức khỏe CLB (6 chiều)', desc: 'Chấm điểm tổng hợp trên 6 chiều vận hành, kèm điểm thành phần để biết CLB mạnh/yếu ở đâu.' },
  { icon: Sparkles, title: 'Tóm tắt điều hành do AI viết', desc: 'Maika đọc dữ liệu kỳ quỹ và viết bản tóm tắt điều hành bằng ngôn ngữ tự nhiên cho Ban quản trị.' },
  { icon: TrendingUp, title: 'Dự báo 30–90 ngày', desc: 'Ước lượng xu hướng quỹ và hoạt động các kỳ tới dựa trên dữ liệu lịch sử của chính CLB.' },
  { icon: Fingerprint, title: 'Club DNA', desc: 'Chân dung đặc trưng của CLB — phong cách vận hành nổi bật rút ra từ số liệu thực tế.' },
  { icon: FileDown, title: 'Xuất PDF · Excel · Ảnh', desc: 'Xuất báo cáo trình bày chuẩn để lưu trữ, in hoặc gửi Ban quản trị — đầy đủ như bản trên web.' },
  { icon: MailCheck, title: 'Tự gửi email hằng tháng', desc: 'Đầu mỗi tháng hệ thống có thể tự tổng hợp và gửi báo cáo (kèm PDF) tới admin CLB.' },
]

export function ExecutiveReportShowcase() {
  return (
    <PublicPage title="AIDO Executive Report">
      <PageHero
        eyebrow="Sản phẩm · AIDO Executive Report"
        title="Báo cáo điều hành chuẩn SaaS cho Ban quản trị"
        desc="Một cú nhấp để có bức tranh toàn cảnh sức khỏe CLB theo từng kỳ quỹ: tài chính, thành viên, hoạt động, thi đấu, tăng trưởng và hiệu suất AI — kèm tóm tắt do AI viết, dự báo và xuất PDF."
      >
        <Link to="/login" className="inline-flex items-center gap-1.5 rounded-full px-6 py-3 text-sm font-semibold text-white" style={{ background: 'var(--pf-primary)' }}>
          Tạo báo cáo trong app <ArrowRight size={16} />
        </Link>
      </PageHero>

      {/* 6 chiều sức khỏe */}
      <section className={`${PUBLIC_CONTAINER} py-12`}>
        <div className="rounded-3xl border p-8 text-center [border-color:var(--pf-border)] [background:var(--pf-surface)]">
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] [color:var(--pf-primary)]"><HeartPulse size={14} /> Điểm sức khỏe CLB</div>
          <h2 className="text-2xl font-extrabold tracking-tight">Đánh giá trên 6 chiều vận hành</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            {DIMENSIONS.map((d) => (
              <span key={d} className="rounded-full border px-4 py-2 text-sm font-semibold [border-color:var(--pf-border)] [background:var(--pf-surface-muted)] [color:var(--pf-text)]">{d}</span>
            ))}
          </div>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed [color:var(--pf-color-muted)]">
            Mỗi chiều được chấm điểm từ dữ liệu thật của kỳ quỹ, tổng hợp thành một điểm sức khỏe chung giúp Ban quản trị nhìn ra ngay CLB đang khỏe hay cần chú ý ở đâu.
          </p>
        </div>
      </section>

      {/* Năng lực */}
      <section className="border-y [border-color:var(--pf-border)] [background:var(--pf-surface-muted)]">
        <div className={`${PUBLIC_CONTAINER} py-12`}>
          <div className="mb-8 text-center">
            <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] [color:var(--pf-primary)]"><FileBarChart size={14} /> Trong một báo cáo</div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Đủ để họp Ban quản trị</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((c) => (
              <div key={c.title} className="rounded-2xl border p-5 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}>
                  <c.icon size={20} />
                </div>
                <p className="text-[15px] font-bold">{c.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed [color:var(--pf-color-muted)]">{c.desc}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-2xl border p-4 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 [color:var(--pf-green)]" />
            <p className="text-[13px] leading-relaxed [color:var(--pf-color-muted)]">
              <b className="[color:var(--pf-text)]">Mọi con số đến từ dữ liệu thật của CLB bạn.</b> Báo cáo lấy theo mốc thời gian của kỳ quỹ; thời gian xuất là thời điểm thực khi bạn tạo báo cáo.
            </p>
          </div>
        </div>
      </section>

      <section className={`${PUBLIC_CONTAINER} py-14 text-center`}>
        <h2 className="text-2xl font-extrabold tracking-tight">Sẵn sàng cho kỳ họp tới?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm [color:var(--pf-color-muted)]">Đăng nhập, chọn kỳ quỹ và tạo báo cáo điều hành chỉ trong vài giây.</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/login" className="inline-flex items-center gap-1.5 rounded-full px-6 py-3 text-sm font-semibold text-white" style={{ background: 'var(--pf-primary)' }}>
            Trải nghiệm trong app <ArrowRight size={16} />
          </Link>
          <Link to="/product/aido" className="rounded-full border px-6 py-3 text-sm font-semibold [border-color:var(--pf-border)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)]">
            Tìm hiểu AIDO
          </Link>
        </div>
      </section>
    </PublicPage>
  )
}
