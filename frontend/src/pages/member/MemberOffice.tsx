/**
 * MemberOffice — trang XEM Office View của AIDO cho MEMBER_VIEW. Chỉ hiển thị (view-only):
 * banner Văn phòng AI + viền chạy/radar để TV thấy đội ngũ AI đang làm việc. KHÔNG có KPI
 * điều hành / hàng đợi duyệt / thao tác quản trị (đó là màn của admin). 0 gọi API quản trị.
 */
import { PageShell, PageHeader } from '../../components/shared'
import { OfficeBanner } from '../../components/aido/OfficeBanner'

const TEAM = [
  { name: 'Maika', role: 'Quản gia AI · tổng hợp sức khỏe CLB', color: '#6D5DFB' },
  { name: 'Lisa', role: 'Trợ lý hỏi đáp nhanh', color: '#2563EB' },
  { name: 'Hermes', role: 'Điều phối vận hành (COO)', color: '#059669' },
  { name: 'Mít Đặc', role: 'Thực thi tác vụ tự động', color: '#EA580C' },
  { name: 'Thông báo', role: 'Gửi tin & nhắc nhở', color: '#C026D3' },
]

export function MemberOffice() {
  return (
    <PageShell>
      <PageHeader title="Văn phòng AI" subtitle="Đội ngũ AI đang làm việc phục vụ CLB của bạn" />

      <div className="space-y-5">
        <OfficeBanner caption="Viền chạy quanh mỗi thẻ = agent đang làm việc" />

        {/* Đội ngũ AI (chỉ giới thiệu — view only) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {TEAM.map((a) => (
            <div
              key={a.name}
              className="rounded-2xl border p-4 [background:var(--pf-surface)] [border-color:var(--pf-border)]"
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                <span className="font-semibold [color:var(--pf-color)]">{a.name}</span>
              </div>
              <p className="mt-1 text-xs [color:var(--pf-color-muted)]">{a.role}</p>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
