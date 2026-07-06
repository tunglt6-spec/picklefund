/**
 * Landing (01) — trang giới thiệu PickleFund. Public. V2.2 Clean Modern SaaS.
 * Hero 2 cột (text+KPI | dashboard preview) · features compact 3x2 · AI team · trust/CTA.
 * Nền sáng, cân đối, container 1200px, headline ≤60px, hero gọn 1 màn. Mobile 1 cột.
 */
import { useNavigate } from 'react-router-dom'
import {
  Wallet, CalendarCheck, Trophy, FileText, Bot, Smartphone,
  ArrowRight, ShieldCheck, TrendingUp, Users, Check,
} from 'lucide-react'
import { PublicShell } from './PublicShell'

const CONTAINER = 'pf-center-x max-w-[1200px] px-4 sm:px-8'

const KPIS = [
  { value: '30+', label: 'CLB' },
  { value: '1.000+', label: 'thành viên' },
  { value: '98%', label: 'hài lòng' },
  { value: '4', label: 'trợ lý AI' },
]

const FEATURES = [
  { icon: Wallet, title: 'Quỹ minh bạch', desc: 'Quỹ Chung & Quỹ Mini tách bạch, thu/chi rõ ràng.' },
  { icon: CalendarCheck, title: 'Điểm danh & chuyên cần', desc: 'Lịch sinh hoạt, check-in nhanh, thống kê chuyên cần.' },
  { icon: Trophy, title: 'Minigame & giải đấu', desc: 'Bốc thăm đôi, nhập kết quả, bảng xếp hạng.' },
  { icon: FileText, title: 'Báo cáo & xuất PDF', desc: 'Báo cáo thu/chi theo quỹ và mùa, xuất PDF đẹp.' },
  { icon: Bot, title: 'Trợ lý AI', desc: 'Maika cảnh báo, Lisa hỗ trợ, Hermes duyệt, Mít Đặc thực thi.' },
  { icon: Smartphone, title: 'Đa thiết bị', desc: 'Web, Desktop và Mobile (PWA) dùng chung một nền tảng.' },
]

const AI_TEAM = [
  { name: 'Maika', role: 'Phân tích & cảnh báo', tone: 'var(--pf-color-ai)' },
  { name: 'Lisa', role: 'Trợ lý thành viên', tone: 'var(--pf-color-info)' },
  { name: 'Hermes', role: 'Duyệt & kiểm soát', tone: 'var(--pf-color-warning)' },
  { name: 'Mít Đặc', role: 'Thực thi tác vụ', tone: 'var(--pf-primary)' },
]

const CLUB_BADGES = ['The Ping', 'B32', 'Sunrise', 'PICK-NET']

/** Dashboard preview mockup — self-contained (SVG/div, không ảnh ngoài). Minh hoạ. */
function DashboardPreview() {
  const bars = [42, 66, 50, 78, 60, 88, 72]
  return (
    <div
      className="w-full rounded-[20px] border p-4 sm:p-5 [background:var(--pf-surface)] [border-color:var(--pf-border)]"
      style={{ boxShadow: 'var(--pf-shadow-hover)' }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: 'var(--pf-primary)' }}>
            <TrendingUp size={16} />
          </span>
          <div>
            <p className="text-sm font-bold leading-tight">Bảng điều khiển CLB</p>
            <p className="text-[10px] [color:var(--pf-color-muted)]">Minh hoạ giao diện</p>
          </div>
        </div>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}>Kỳ 3</span>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {[
          { label: 'Tồn quỹ', value: '12.5M', tone: 'var(--pf-green)', soft: 'var(--pf-green-soft)' },
          { label: 'Chuyên cần', value: '87%', tone: 'var(--pf-color-info)', soft: 'var(--pf-color-info-soft)' },
          { label: 'Thành viên', value: '24', tone: 'var(--pf-primary)', soft: 'var(--pf-primary-soft)' },
        ].map((t) => (
          <div key={t.label} className="rounded-xl p-2.5" style={{ background: t.soft }}>
            <p className="text-base font-extrabold tabular-nums leading-none" style={{ color: t.tone }}>{t.value}</p>
            <p className="mt-1 text-[10px] [color:var(--pf-color-muted)]">{t.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-3 [border-color:var(--pf-border)]">
        <p className="mb-2 text-[11px] font-semibold [color:var(--pf-color-muted)]">Hoạt động 7 tuần</p>
        <div className="flex h-20 items-end gap-1.5">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: 'var(--pf-primary)', opacity: 0.35 + (i / bars.length) * 0.6 }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function Landing() {
  const navigate = useNavigate()
  return (
    <PublicShell>
      {/* Hero — 2 cột desktop, gọn 1 màn */}
      <section className={`${CONTAINER} grid items-center gap-10 py-12 lg:grid-cols-2 lg:gap-12 lg:py-16 lg:min-h-[520px]`}>
        <div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}
          >
            <ShieldCheck size={13} /> Nền tảng vận hành CLB Pickleball có AI
          </span>
          <h1 className="mt-4 text-[30px] font-extrabold leading-[1.1] tracking-tight sm:text-[40px] lg:text-[52px]">
            Quản lý CLB Pickleball{' '}
            <span style={{ color: 'var(--pf-primary)' }}>thông minh – đơn giản – hiệu quả</span>
          </h1>
          <p className="mt-4 max-w-[620px] text-base [color:var(--pf-color-muted)] sm:text-lg">
            Từ quỹ, điểm danh, minigame đến báo cáo — tất cả trong một nền tảng gọn nhẹ,
            có trợ lý AI hỗ trợ ra quyết định.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
              style={{ background: 'var(--pf-primary)' }}
            >
              Dùng thử miễn phí <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold transition-colors [border-color:var(--pf-border)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)]"
            >
              Xem bảng giá
            </button>
          </div>

          {/* KPI compact — 2x2 mobile, 4 cột desktop */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {KPIS.map((k) => (
              <div key={k.label}>
                <p className="text-xl font-extrabold tabular-nums" style={{ color: 'var(--pf-primary)' }}>{k.value}</p>
                <p className="text-[11px] [color:var(--pf-color-muted)]">{k.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="order-first lg:order-last">
          <DashboardPreview />
        </div>
      </section>

      {/* Features — compact 3x2 */}
      <section id="features" className={`${CONTAINER} py-12`}>
        <h2 className="text-center text-2xl font-bold tracking-tight">Tất cả những gì CLB cần</h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm [color:var(--pf-color-muted)]">
          Bộ công cụ đầy đủ để vận hành CLB Pickleball chuyên nghiệp.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex h-full flex-col rounded-2xl border p-5 transition-shadow [background:var(--pf-surface)] [border-color:var(--pf-border)]"
              style={{ boxShadow: 'var(--pf-shadow)' }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}
              >
                <f.icon size={18} />
              </div>
              <h3 className="mt-3 text-[15px] font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm [color:var(--pf-color-muted)]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Team — 4 card */}
      <section className={`${CONTAINER} py-12`}>
        <h2 className="text-center text-2xl font-bold tracking-tight">Đội ngũ AI đồng hành</h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm [color:var(--pf-color-muted)]">
          AI hỗ trợ vận hành — luôn cần con người duyệt việc quan trọng.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {AI_TEAM.map((m) => (
            <div
              key={m.name}
              className="flex flex-col items-center rounded-2xl border p-5 text-center [background:var(--pf-surface)] [border-color:var(--pf-border)]"
              style={{ boxShadow: 'var(--pf-shadow)' }}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full text-white" style={{ background: m.tone }}>
                <Bot size={20} />
              </div>
              <p className="mt-3 text-sm font-bold">{m.name}</p>
              <p className="mt-0.5 text-[11px] [color:var(--pf-color-muted)]">{m.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust + CTA strip */}
      <section className={`${CONTAINER} py-12`}>
        <div className="rounded-3xl border p-6 sm:p-10 [background:var(--pf-surface)] [border-color:var(--pf-border)]" style={{ boxShadow: 'var(--pf-shadow)' }}>
          <p className="text-center text-xs font-semibold uppercase tracking-widest [color:var(--pf-color-muted)]">
            <Users size={13} className="mr-1 inline" /> Được tin tưởng bởi các CLB Pickleball
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            {CLUB_BADGES.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold [border-color:var(--pf-border)] [color:var(--pf-text)]"
              >
                <Check size={12} style={{ color: 'var(--pf-secondary)' }} /> {c}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <h3 className="text-xl font-extrabold sm:text-2xl">CLB của bạn? Bắt đầu ngay</h3>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-white shadow-sm transition-transform active:scale-[0.98]"
              style={{ background: 'var(--pf-primary)' }}
            >
              Dùng thử miễn phí <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
