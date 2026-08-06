/**
 * /resources/video — "Xem sản phẩm hoạt động". Trung thực: KHÔNG nhúng video giả.
 * Hướng người dùng tới DEMO TƯƠNG TÁC THẬT (/demo) + walkthrough các luồng chính (link /resources/guide).
 * Video hướng dẫn quay sẵn đang được sản xuất — nói rõ, không giả "đã có".
 */
import { Link } from 'react-router-dom'
import { PlayCircle, MousePointerClick, ArrowRight, Wallet, CalendarCheck, Trophy, FileBarChart, Cpu } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PublicPage, PageHero, PUBLIC_CONTAINER } from '../PublicPage'

const WALKTHROUGH: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Wallet, title: 'Quỹ & tài chính', desc: 'Ghi nhận thu/chi, tách quỹ chung – quỹ mini, đối soát công nợ theo kỳ.' },
  { icon: CalendarCheck, title: 'Buổi tập & điểm danh', desc: 'Mở đăng ký buổi, self check-in, điểm danh và tự chia chi phí.' },
  { icon: Trophy, title: 'Giải đấu & minigame', desc: 'Tạo giải, bốc thăm, xếp lịch, ghi kết quả và bảng xếp hạng.' },
  { icon: FileBarChart, title: 'Báo cáo & xuất PDF', desc: 'Dashboard số liệu thật, xuất PDF/Excel, AIDO Executive Report theo kỳ.' },
  { icon: Cpu, title: 'Đội ngũ AI (AIDO)', desc: 'Maika phân tích, Lisa hỗ trợ, Hermes điều phối, Mít Đặc thực thi.' },
]

export function VideoDemo() {
  return (
    <PublicPage title="Xem sản phẩm hoạt động">
      <PageHero
        eyebrow="Tài nguyên · Demo"
        title="Xem PickleFund hoạt động"
        desc="Cách nhanh nhất để hiểu sản phẩm là tự trải nghiệm. Mở bản demo tương tác với dữ liệu mẫu — không cần đăng ký, không cần cài đặt."
      />

      {/* Demo tương tác — kênh THẬT */}
      <section className={`${PUBLIC_CONTAINER} py-12`}>
        <div className="overflow-hidden rounded-3xl border [border-color:var(--pf-border)]" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--pf-primary) 12%, var(--pf-surface)), var(--pf-surface))' }}>
          <div className="grid items-center gap-6 p-8 md:grid-cols-[1.2fr_1fr] md:p-10">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] [color:var(--pf-primary)]"><MousePointerClick size={14} /> Demo tương tác</div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Trải nghiệm trực tiếp, không chỉ xem</h2>
              <p className="mt-3 text-sm leading-relaxed [color:var(--pf-color-muted)]">
                Vào thẳng sản phẩm với dữ liệu mẫu để tự bấm thử: quản lý quỹ, điểm danh, giải đấu, báo cáo và đội ngũ AI. Đây là sản phẩm thật, không phải video dựng sẵn.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/demo" className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: 'var(--pf-primary)' }}>
                  Mở demo tương tác <ArrowRight size={15} />
                </Link>
                <Link to="/resources/guide" className="inline-flex items-center gap-1.5 rounded-full border px-5 py-2.5 text-sm font-semibold [border-color:var(--pf-border)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)]">
                  Đọc hướng dẫn từng bước
                </Link>
              </div>
            </div>
            <div className="flex aspect-video items-center justify-center rounded-2xl border [border-color:var(--pf-border)] [background:var(--pf-surface)]">
              <div className="text-center">
                <PlayCircle size={44} className="mx-auto [color:var(--pf-primary)]" />
                <p className="mt-3 px-6 text-[13px] leading-relaxed [color:var(--pf-color-muted)]">
                  Video hướng dẫn quay sẵn đang được sản xuất. Trong lúc chờ, bản demo tương tác cho bạn trải nghiệm đầy đủ hơn cả video.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Walkthrough các luồng chính */}
      <section className={`${PUBLIC_CONTAINER} pb-16`}>
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight">Trong demo bạn sẽ thấy gì</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm [color:var(--pf-color-muted)]">Năm luồng nghiệp vụ cốt lõi của một CLB, tất cả trong một nền tảng.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WALKTHROUGH.map((w) => (
            <div key={w.title} className="flex gap-3 rounded-2xl border p-5 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}>
                <w.icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-bold">{w.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed [color:var(--pf-color-muted)]">{w.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PublicPage>
  )
}
