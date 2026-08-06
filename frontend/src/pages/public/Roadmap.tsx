/**
 * /roadmap — Lộ trình phát triển. Trung thực: "Đã phát hành" chỉ liệt kê tính năng THẬT đang chạy;
 * "Đang phát triển" và "Định hướng" ghi rõ CÓ THỂ THAY ĐỔI, KHÔNG cam kết mốc thời gian.
 */
import { CheckCircle2, Loader2, Compass, Info } from 'lucide-react'
import { PublicPage, PageHero, PUBLIC_CONTAINER } from './PublicPage'

interface Column {
  key: string
  label: string
  tone: string
  icon: typeof CheckCircle2
  items: string[]
}
const COLUMNS: Column[] = [
  {
    key: 'shipped', label: 'Đã phát hành', tone: 'var(--pf-green)', icon: CheckCircle2,
    items: [
      'Quản lý quỹ chung & quỹ mini, thu/chi, công nợ',
      'Quản lý thành viên, phân quyền theo vai trò',
      'Buổi tập, đăng ký, check-in & điểm danh',
      'Giải đấu, minigame, bảng xếp hạng',
      'Dashboard & xuất báo cáo PDF / Excel',
      'AIDO — 5 trợ lý AI vận hành',
      'AIDO Executive Report theo kỳ quỹ',
      'Giao diện sáng/tối, đồng bộ Web / Desktop / Mobile (PWA)',
    ],
  },
  {
    key: 'progress', label: 'Đang phát triển', tone: 'var(--pf-color-info)', icon: Loader2,
    items: [
      'Tự thanh toán & quản lý gói dịch vụ (subscription)',
      'Tự động đăng/chia sẻ nội dung ra kênh CLB',
      'Mở rộng phân tích & dự báo cho Executive Report',
      'Thư viện hướng dẫn bằng video',
    ],
  },
  {
    key: 'planned', label: 'Định hướng', tone: 'var(--pf-color-ai)', icon: Compass,
    items: [
      'Trung tâm Tin cậy (Trust Center) với cam kết công khai',
      'Thêm tích hợp thông báo & kênh liên lạc',
      'Xếp hạng/so sánh nhiều CLB',
      'Học viện PickleFund Academy đầy đủ khóa học',
    ],
  },
]

export function Roadmap() {
  return (
    <PublicPage title="Lộ trình phát triển">
      <PageHero
        eyebrow="Về chúng tôi · Lộ trình"
        title="PickleFund đang đi về đâu"
        desc="Những gì đã có, đang làm và định hướng sắp tới. Sản phẩm phát triển theo nhu cầu thực tế của cộng đồng."
      />
      <section className={`${PUBLIC_CONTAINER} py-12`}>
        <div className="grid gap-5 lg:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.key} className="rounded-2xl border p-5 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${col.tone} 16%, transparent)`, color: col.tone }}>
                  <col.icon size={16} />
                </span>
                <p className="text-[15px] font-extrabold [color:var(--pf-text)]">{col.label}</p>
              </div>
              <ul className="space-y-2.5">
                {col.items.map((it) => (
                  <li key={it} className="flex gap-2 text-[13.5px] leading-relaxed [color:var(--pf-text)]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: col.tone }} />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 flex max-w-2xl items-start gap-2 rounded-2xl border p-4 text-[13px] leading-relaxed [border-color:var(--pf-border)] [background:var(--pf-surface-muted)] [color:var(--pf-color-muted)]">
          <Info size={15} className="mt-0.5 shrink-0" />
          Mục "Đang phát triển" và "Định hướng" thể hiện dự định phát triển, <b className="[color:var(--pf-text)]">có thể thay đổi và không phải cam kết về mốc thời gian</b>. Tính năng chỉ được xem là sẵn sàng khi xuất hiện ở cột "Đã phát hành".
        </p>
      </section>
    </PublicPage>
  )
}
