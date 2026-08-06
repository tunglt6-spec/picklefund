/**
 * /resources/release-notes — Nhật ký cập nhật. Trung thực: chỉ liệt kê TÍNH NĂNG ĐÃ CÓ THẬT,
 * nhóm theo chủ đề. KHÔNG bịa ngày phát hành/số hiệu phiên bản cụ thể. Đồng bộ với cột "Đã phát
 * hành" của /roadmap.
 */
import { Link } from 'react-router-dom'
import { Sparkles, Info, ArrowRight } from 'lucide-react'
import { PublicPage, PageHero, PUBLIC_CONTAINER } from '../PublicPage'

interface Release {
  tag: string
  title: string
  items: string[]
}
const RELEASES: Release[] = [
  {
    tag: 'Báo cáo', title: 'AIDO Executive Report v1.0',
    items: [
      'Báo cáo điều hành theo kỳ quỹ với điểm sức khỏe CLB 6 chiều',
      'Tóm tắt điều hành do AI viết, dự báo và Club DNA',
      'Xuất PDF/Excel/Ảnh trình bày chuẩn; có thể tự gửi email hằng tháng',
    ],
  },
  {
    tag: 'AI', title: 'AIDO — Đội ngũ trợ lý AI',
    items: [
      'Maika phân tích & khuyến nghị, Lisa hỗ trợ thành viên',
      'Hermes điều phối workflow, Mít Đặc thực thi sau phê duyệt',
      'Notification AI gửi thông báo In-app/Email/Telegram',
      'Nguyên tắc human-in-the-loop cho mọi việc quan trọng',
    ],
  },
  {
    tag: 'Trải nghiệm', title: 'Giao diện Elite & đa nền tảng',
    items: [
      'Chế độ sáng/tối trên toàn ứng dụng',
      'Chuyển động mượt (page transition, skeleton, tối ưu thao tác)',
      'Đồng bộ Web / Desktop / Mobile (PWA) theo thời gian thực',
    ],
  },
  {
    tag: 'Vận hành', title: 'Nền tảng quản trị CLB',
    items: [
      'Quỹ chung & quỹ mini, thu/chi, đối soát công nợ theo kỳ',
      'Quản lý thành viên, phân quyền theo vai trò (kèm vai trò tùy chỉnh)',
      'Buổi tập, đăng ký, check-in, điểm danh & tự chia chi phí',
      'Giải đấu, minigame, bốc thăm, bảng điểm & xếp hạng',
      'Dashboard số liệu thật, xuất báo cáo PDF/Excel',
    ],
  },
]

export function ReleaseNotes() {
  return (
    <PublicPage title="Nhật ký cập nhật">
      <PageHero
        eyebrow="Tài nguyên · Release Notes"
        title="Nhật ký cập nhật"
        desc="Những tính năng đã có trên PickleFund, nhóm theo chủ đề. Sản phẩm được cải thiện liên tục theo nhu cầu thực tế của cộng đồng."
      />
      <section className={`${PUBLIC_CONTAINER} py-12`}>
        <div className="mx-auto max-w-3xl space-y-5">
          {RELEASES.map((r) => (
            <div key={r.title} className="rounded-2xl border p-6 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
              <div className="flex items-center gap-2">
                <span className="rounded-full px-2.5 py-1 text-[11px] font-bold [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">{r.tag}</span>
                <h2 className="text-[16px] font-extrabold [color:var(--pf-text)]">{r.title}</h2>
              </div>
              <ul className="mt-3 space-y-2">
                {r.items.map((it) => (
                  <li key={it} className="flex gap-2 text-[13.5px] leading-relaxed [color:var(--pf-color-muted)]">
                    <Sparkles size={14} className="mt-0.5 shrink-0 [color:var(--pf-primary)]" />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="flex items-start gap-2 rounded-2xl border p-4 text-[13px] leading-relaxed [border-color:var(--pf-border)] [background:var(--pf-surface-muted)] [color:var(--pf-color-muted)]">
            <Info size={15} className="mt-0.5 shrink-0" />
            Danh sách sắp xếp theo nhóm tính năng, không theo mốc ngày cụ thể. Xem thêm định hướng sắp tới tại <Link to="/roadmap" className="font-semibold [color:var(--pf-primary)]">Lộ trình phát triển</Link>.
          </p>
          <div className="text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 rounded-full px-6 py-3 text-sm font-semibold text-white" style={{ background: 'var(--pf-primary)' }}>
              Dùng thử ngay <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </PublicPage>
  )
}
