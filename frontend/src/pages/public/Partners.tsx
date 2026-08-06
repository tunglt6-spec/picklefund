/**
 * /partners — Đối tác. Trung thực: CHƯA công bố đối tác cụ thể → KHÔNG bịa logo/tên. Trình bày
 * chương trình hợp tác đang mở + các nhóm đối tác mong muốn + CTA liên hệ.
 */
import { Link } from 'react-router-dom'
import { Handshake, Building2, GraduationCap, Store, Users, ArrowRight, Info } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PublicPage, PageHero, PUBLIC_CONTAINER } from './PublicPage'

const TYPES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Building2, title: 'Trung tâm & học viện thể thao', desc: 'Đơn vị vận hành nhiều CLB/lớp muốn số hóa quản trị tập trung.' },
  { icon: Store, title: 'Nhà cung cấp sân & thiết bị', desc: 'Đối tác dịch vụ cùng phục vụ cộng đồng người chơi thể thao.' },
  { icon: Users, title: 'Cộng đồng & liên đoàn phong trào', desc: 'Tổ chức kết nối nhiều CLB, giải đấu và sự kiện.' },
  { icon: GraduationCap, title: 'Đối tác đào tạo & nội dung', desc: 'Cùng xây dựng hướng dẫn, khóa học và tài nguyên cho CLB.' },
]

export function Partners() {
  return (
    <PublicPage title="Đối tác">
      <PageHero
        eyebrow="Về chúng tôi · Đối tác"
        title="Cùng phát triển cộng đồng thể thao"
        desc="Chương trình đối tác của PickleFund đang mở. Chúng tôi tìm kiếm những đơn vị cùng chung mục tiêu: giúp các CLB vận hành minh bạch và chuyên nghiệp hơn."
      />

      <section className={`${PUBLIC_CONTAINER} py-12`}>
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight [color:var(--pf-text)]">Chúng tôi mong muốn hợp tác với</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {TYPES.map((t) => (
            <div key={t.title} className="flex gap-3 rounded-2xl border p-5 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}>
                <t.icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-bold [color:var(--pf-text)]">{t.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed [color:var(--pf-color-muted)]">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 flex max-w-2xl items-start gap-2 rounded-2xl border p-4 text-[13px] leading-relaxed [border-color:var(--pf-border)] [background:var(--pf-surface-muted)] [color:var(--pf-color-muted)]">
          <Info size={15} className="mt-0.5 shrink-0" />
          Chúng tôi chưa công bố danh sách đối tác cụ thể. Khi có, thông tin sẽ được cập nhật tại đây một cách minh bạch.
        </p>

        <div className="mx-auto mt-8 max-w-2xl rounded-3xl border p-8 text-center [border-color:var(--pf-border)]" style={{ background: 'var(--pf-primary-soft)' }}>
          <Handshake size={30} className="mx-auto [color:var(--pf-primary)]" />
          <p className="mt-3 text-[16px] font-extrabold [color:var(--pf-text)]">Bạn muốn trở thành đối tác?</p>
          <p className="mt-1.5 text-sm [color:var(--pf-color-muted)]">Gửi cho chúng tôi vài dòng về tổ chức của bạn và mong muốn hợp tác — chúng tôi sẽ phản hồi sớm.</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link to="/contact" className="inline-flex items-center gap-1.5 rounded-full px-6 py-3 text-sm font-semibold text-white" style={{ background: 'var(--pf-primary)' }}>
              Liên hệ hợp tác <ArrowRight size={16} />
            </Link>
            <Link to="/about" className="rounded-full border px-6 py-3 text-sm font-semibold [border-color:var(--pf-border)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)]">
              Về PickleFund
            </Link>
          </div>
        </div>
      </section>
    </PublicPage>
  )
}
