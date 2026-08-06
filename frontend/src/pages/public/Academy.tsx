/**
 * /academy — Học viện PickleFund: hub học tập tổng hợp các TÀI NGUYÊN CÓ THẬT (Hướng dẫn,
 * Blog, Demo, FAQ). Khóa học chuyên sâu ghi rõ "đang xây dựng" — không giả có sẵn.
 */
import { Link } from 'react-router-dom'
import { BookOpen, Rss, PlayCircle, HelpCircle, GraduationCap, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PublicPage, PageHero, PUBLIC_CONTAINER } from './PublicPage'

const RESOURCES: { icon: LucideIcon; title: string; desc: string; to: string; cta: string }[] = [
  { icon: BookOpen, title: 'Hướng dẫn sử dụng', desc: '7 bước từ tạo CLB đến vận hành cùng AI.', to: '/resources/guide', cta: 'Xem hướng dẫn' },
  { icon: Rss, title: 'Cẩm nang vận hành CLB', desc: 'Bài viết thực tế về tài chính, chuyên cần và ứng dụng AI.', to: '/resources/blog', cta: 'Đọc blog' },
  { icon: PlayCircle, title: 'Demo tương tác', desc: 'Tự trải nghiệm sản phẩm với dữ liệu mẫu, không cần đăng ký.', to: '/resources/video', cta: 'Mở demo' },
  { icon: HelpCircle, title: 'Câu hỏi thường gặp', desc: 'Giải đáp nhanh về sản phẩm, giá và bảo mật.', to: '/resources/faq', cta: 'Xem FAQ' },
]

export function Academy() {
  return (
    <PublicPage title="PickleFund Academy">
      <PageHero
        eyebrow="Tài nguyên · Academy"
        title="Học cách vận hành CLB hiệu quả"
        desc="Tổng hợp tài nguyên học tập của PickleFund — hướng dẫn, cẩm nang, demo và giải đáp — để bạn thành thạo nền tảng và vận hành CLB chuyên nghiệp hơn."
      />

      <section className={`${PUBLIC_CONTAINER} py-12`}>
        <div className="grid gap-5 sm:grid-cols-2">
          {RESOURCES.map((r) => (
            <div key={r.title} className="flex flex-col rounded-2xl border p-6 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}>
                <r.icon size={20} />
              </div>
              <p className="mt-4 text-[16px] font-extrabold [color:var(--pf-text)]">{r.title}</p>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed [color:var(--pf-color-muted)]">{r.desc}</p>
              <Link to={r.to} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold [color:var(--pf-primary)]">
                {r.cta} <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border p-6 text-center [border-color:var(--pf-border)]" style={{ background: 'var(--pf-primary-soft)' }}>
          <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] [color:var(--pf-primary)]"><GraduationCap size={14} /> Sắp có</div>
          <p className="text-[15px] font-bold [color:var(--pf-text)]">Khóa học chuyên sâu theo lộ trình</p>
          <p className="mt-1 text-sm [color:var(--pf-color-muted)]">Các khóa học có cấu trúc (video + bài tập) đang được xây dựng. Trong lúc chờ, các tài nguyên trên đã đủ để bắt đầu vận hành ngay.</p>
        </div>
      </section>
    </PublicPage>
  )
}
