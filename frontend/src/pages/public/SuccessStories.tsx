/**
 * /success-stories — "Cách các CLB ứng dụng PickleFund". Trung thực: trình bày KỊCH BẢN theo
 * loại hình tổ chức (dựa trên năng lực sản phẩm thật), KHÔNG bịa tên khách hàng/trích dẫn/chỉ số
 * riêng lẻ. Dải số liệu tổng chỉ dùng STATS marketing đã được duyệt trong dự án.
 */
import { Link } from 'react-router-dom'
import { Users, GraduationCap, Building2, CheckCircle2, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PublicPage, PageHero, PUBLIC_CONTAINER } from './PublicPage'
import { STATS } from './landing-content'

interface Scenario {
  icon: LucideIcon
  tag: string
  title: string
  desc: string
  wins: string[]
}
const SCENARIOS: Scenario[] = [
  {
    icon: Users, tag: 'CLB phong trào',
    title: 'CLB nhỏ, quản lý bằng nhóm chat và bảng tính',
    desc: 'Nhóm bạn chơi thể thao muốn minh bạch quỹ và bớt việc thủ công mà không cần công cụ phức tạp.',
    wins: [
      'Quỹ chung – quỹ mini tách bạch, ai cũng xem được phần của mình',
      'Điểm danh và chia tiền sân tự động theo buổi',
      'Báo cáo thu/chi xuất PDF thay cho bảng tính rời rạc',
    ],
  },
  {
    icon: GraduationCap, tag: 'Trung tâm & Học viện',
    title: 'Nhiều lớp/nhóm, cần theo dõi chuyên cần và tài chính tập trung',
    desc: 'Trung tâm thể thao vận hành nhiều nhóm học viên, cần dữ liệu tập trung và phân quyền rõ ràng.',
    wins: [
      'Quản lý học viên, phân quyền theo vai trò',
      'Theo dõi chuyên cần theo tháng trên dashboard',
      'Giải đấu/minigame nội bộ với bảng xếp hạng tự động',
    ],
  },
  {
    icon: Building2, tag: 'Chuỗi & Doanh nghiệp',
    title: 'Cộng đồng thể thao nội bộ quy mô lớn',
    desc: 'Tổ chức muốn vận hành cộng đồng thể thao minh bạch, có báo cáo điều hành cho ban lãnh đạo.',
    wins: [
      'AIDO Executive Report theo kỳ — tổng hợp sức khỏe CLB',
      'Đội ngũ AI hỗ trợ phân tích, nhắc việc, thông báo',
      'Đồng bộ Web / Desktop / Mobile theo thời gian thực',
    ],
  },
]

export function SuccessStories() {
  return (
    <PublicPage title="Cách các CLB ứng dụng PickleFund">
      <PageHero
        eyebrow="Về chúng tôi · Ứng dụng thực tế"
        title="PickleFund phù hợp với CLB của bạn thế nào"
        desc="Dưới đây là các kịch bản ứng dụng theo từng loại hình tổ chức, dựa trên năng lực thật của sản phẩm — để bạn hình dung PickleFund giải quyết vấn đề gì cho mình."
      />

      {/* Dải số liệu tổng (STATS marketing đã duyệt) */}
      <section className={`${PUBLIC_CONTAINER} pt-4`}>
        <div className="grid grid-cols-2 gap-3 rounded-3xl border p-6 sm:grid-cols-3 lg:grid-cols-5 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-extrabold tracking-tight [color:var(--pf-primary)]">{s.value}</p>
              <p className="mt-0.5 text-[12px] [color:var(--pf-color-muted)]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Kịch bản theo loại hình */}
      <section className={`${PUBLIC_CONTAINER} py-12`}>
        <div className="grid gap-5 lg:grid-cols-3">
          {SCENARIOS.map((s) => (
            <div key={s.tag} className="flex flex-col rounded-2xl border p-6 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}>
                  <s.icon size={20} />
                </div>
                <span className="rounded-full px-2.5 py-1 text-[11px] font-bold [background:var(--pf-surface-muted)] [color:var(--pf-color-muted)]">{s.tag}</span>
              </div>
              <h3 className="mt-4 text-[16px] font-extrabold leading-snug [color:var(--pf-text)]">{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed [color:var(--pf-color-muted)]">{s.desc}</p>
              <ul className="mt-4 space-y-2">
                {s.wins.map((w) => (
                  <li key={w} className="flex gap-2 text-[13px] leading-relaxed [color:var(--pf-text)]">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 [color:var(--pf-green)]" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border p-8 text-center [border-color:var(--pf-border)]" style={{ background: 'var(--pf-primary-soft)' }}>
          <h2 className="text-2xl font-extrabold tracking-tight [color:var(--pf-text)]">CLB của bạn thuộc nhóm nào?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm [color:var(--pf-color-muted)]">Dùng thử miễn phí để xem PickleFund hợp với quy trình của bạn ra sao — hoặc liên hệ để được tư vấn.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/login" className="inline-flex items-center gap-1.5 rounded-full px-6 py-3 text-sm font-semibold text-white" style={{ background: 'var(--pf-primary)' }}>
              Dùng thử ngay <ArrowRight size={16} />
            </Link>
            <Link to="/contact" className="rounded-full border px-6 py-3 text-sm font-semibold [border-color:var(--pf-border)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)]">
              Liên hệ tư vấn
            </Link>
          </div>
        </div>
      </section>
    </PublicPage>
  )
}
