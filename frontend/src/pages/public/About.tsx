/**
 * /about — Câu chuyện + Tầm nhìn & Sứ mệnh. Trung thực: narrative dựa trên MỤC ĐÍCH SẢN PHẨM,
 * KHÔNG bịa ngày thành lập, số nhân sự, vốn đầu tư hay giải thưởng.
 */
import { Link } from 'react-router-dom'
import { Target, Compass, HeartHandshake, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PublicPage, PageHero, PUBLIC_CONTAINER } from './PublicPage'

const VALUES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: ShieldCheck, title: 'Minh bạch', desc: 'Mọi con số phải rõ ràng, có lịch sử và ai cũng xem được phần liên quan tới mình.' },
  { icon: HeartHandshake, title: 'Đơn giản cho người dùng thật', desc: 'Ban quản trị CLB thường là người bận rộn, không phải dân kỹ thuật — công cụ phải dễ dùng.' },
  { icon: Sparkles, title: 'AI có trách nhiệm', desc: 'AI gánh việc lặp lại, nhưng con người luôn giữ quyền quyết định những việc quan trọng.' },
]

export function About() {
  return (
    <PublicPage title="Về PickleFund">
      <PageHero
        eyebrow="Về chúng tôi"
        title="Chúng tôi xây PickleFund để CLB vận hành nhẹ nhàng hơn"
        desc="Từ một nhu cầu rất thật: quản lý quỹ, thành viên và hoạt động của câu lạc bộ thể thao sao cho minh bạch và bớt thủ công."
      />

      {/* Câu chuyện */}
      <section className={`${PUBLIC_CONTAINER} py-10`}>
        <div className="mx-auto max-w-3xl space-y-4">
          <h2 className="text-xl font-extrabold tracking-tight [color:var(--pf-text)]">Câu chuyện</h2>
          <p className="text-[15px] leading-relaxed [color:var(--pf-color-muted)]">
            Hầu hết câu lạc bộ thể thao phong trào bắt đầu từ một nhóm bạn cùng đam mê. Nhưng khi số thành viên tăng lên, việc quản lý quỹ, điểm danh, chia chi phí và tổ chức giải đấu nhanh chóng trở thành gánh nặng — rải rác trên nhóm chat, bảng tính và trí nhớ của một vài người.
          </p>
          <p className="text-[15px] leading-relaxed [color:var(--pf-color-muted)]">
            PickleFund ra đời để gom tất cả những việc đó về một nơi: minh bạch, dễ dùng và có đội ngũ AI hỗ trợ phần lặp lại. Mục tiêu không phải là thay thế con người, mà là để Ban quản trị dành thời gian cho điều quan trọng nhất — cộng đồng và sân chơi.
          </p>
        </div>
      </section>

      {/* Tầm nhìn & Sứ mệnh */}
      <section className="border-y [border-color:var(--pf-border)] [background:var(--pf-surface-muted)]">
        <div className={`${PUBLIC_CONTAINER} py-12`}>
          <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
            <div className="rounded-2xl border p-6 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}><Target size={20} /></div>
              <p className="text-[15px] font-extrabold [color:var(--pf-text)]">Sứ mệnh</p>
              <p className="mt-1.5 text-[14px] leading-relaxed [color:var(--pf-color-muted)]">Giúp các câu lạc bộ thể thao vận hành minh bạch, chuyên nghiệp và bền vững — với công cụ mà ai cũng dùng được.</p>
            </div>
            <div className="rounded-2xl border p-6 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}><Compass size={20} /></div>
              <p className="text-[15px] font-extrabold [color:var(--pf-text)]">Tầm nhìn</p>
              <p className="mt-1.5 text-[14px] leading-relaxed [color:var(--pf-color-muted)]">Trở thành nền tảng quản trị cộng đồng thể thao được tin dùng, nơi AI đồng hành cùng con người một cách có trách nhiệm.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Giá trị cốt lõi */}
      <section className={`${PUBLIC_CONTAINER} py-12`}>
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight [color:var(--pf-text)]">Giá trị cốt lõi</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl border p-5 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}><v.icon size={20} /></div>
              <p className="text-[15px] font-bold [color:var(--pf-text)]">{v.title}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed [color:var(--pf-color-muted)]">{v.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-center">
          <Link to="/product/aido" className="inline-flex items-center gap-1.5 rounded-full px-6 py-3 text-sm font-semibold text-white" style={{ background: 'var(--pf-primary)' }}>Gặp đội ngũ AI <ArrowRight size={16} /></Link>
          <Link to="/contact" className="rounded-full border px-6 py-3 text-sm font-semibold [border-color:var(--pf-border)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)]">Liên hệ</Link>
        </div>
      </section>
    </PublicPage>
  )
}
