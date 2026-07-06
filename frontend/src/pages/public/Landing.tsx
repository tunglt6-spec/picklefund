/**
 * Landing (01) — trang giới thiệu PickleFund. Public. V2.2 Clean Modern SaaS.
 * Hero + KPI minh hoạ + tính năng + đội ngũ AI + CTA. Mobile-first.
 */
import { useNavigate } from 'react-router-dom'
import {
  Wallet,
  CalendarCheck,
  Trophy,
  FileText,
  Bot,
  Smartphone,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { PublicShell } from './PublicShell'

const FEATURES = [
  { icon: Wallet, title: 'Quỹ minh bạch', desc: 'Quỹ Chung & Quỹ Mini tách bạch, thu/chi rõ ràng, phiếu cá nhân từng thành viên.' },
  { icon: CalendarCheck, title: 'Điểm danh & chuyên cần', desc: 'Lịch sinh hoạt, check-in nhanh, thống kê chuyên cần theo mùa.' },
  { icon: Trophy, title: 'Minigame & giải đấu', desc: 'Bốc thăm đôi, nhập kết quả, bảng xếp hạng, lịch sử thi đấu.' },
  { icon: FileText, title: 'Báo cáo & xuất PDF', desc: 'Báo cáo thu/chi theo quỹ và mùa, xuất PDF/Excel đẹp, đúng số liệu.' },
  { icon: Bot, title: 'Trợ lý AI', desc: 'Maika cảnh báo, Lisa hỗ trợ thành viên, Hermes duyệt việc, Mít Đặc thực thi.' },
  { icon: Smartphone, title: 'Đa thiết bị', desc: 'Web, Desktop và Mobile (PWA cài đặt được) — dùng chung một nền tảng.' },
]

const AI_TEAM = [
  { name: 'Maika', role: 'Phân tích & cảnh báo', tone: 'var(--pf-color-ai)' },
  { name: 'Lisa', role: 'Trợ lý thành viên', tone: 'var(--pf-color-info)' },
  { name: 'Hermes', role: 'Duyệt & kiểm soát', tone: 'var(--pf-color-warning)' },
  { name: 'Mít Đặc', role: 'Thực thi tác vụ', tone: 'var(--pf-primary)' },
]

const KPIS = [
  { value: '30+', label: 'CLB có thể vận hành' },
  { value: '1.000+', label: 'Thành viên quản lý' },
  { value: '4', label: 'Trợ lý AI đồng hành' },
]

export function Landing() {
  const navigate = useNavigate()
  return (
    <PublicShell>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}
          >
            <ShieldCheck size={13} /> Nền tảng vận hành CLB Pickleball có AI
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Quản lý CLB Pickleball<br />
            <span style={{ color: 'var(--pf-primary)' }}>thông minh – đơn giản – hiệu quả</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm [color:var(--pf-color-muted)] sm:text-base">
            Từ quỹ, điểm danh, minigame đến báo cáo — tất cả trong một nền tảng gọn nhẹ,
            có trợ lý AI hỗ trợ ra quyết định.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98] sm:w-auto"
              style={{ background: 'var(--pf-primary)' }}
            >
              Dùng thử ngay <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="inline-flex w-full items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold transition-colors sm:w-auto [border-color:var(--pf-border)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)]"
            >
              Xem bảng giá
            </button>
          </div>
        </div>

        {/* KPI minh hoạ */}
        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-3 gap-3">
          {KPIS.map((k) => (
            <div
              key={k.label}
              className="rounded-2xl border p-4 text-center [background:var(--pf-surface)] [border-color:var(--pf-border)] [box-shadow:var(--pf-shadow)]"
            >
              <p className="text-2xl font-extrabold tabular-nums" style={{ color: 'var(--pf-primary)' }}>{k.value}</p>
              <p className="mt-1 text-[11px] font-medium [color:var(--pf-color-muted)]">{k.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-center text-[10px] [color:var(--pf-color-muted)]">*Số liệu minh hoạ năng lực nền tảng.</p>
      </section>

      {/* Tính năng */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-center text-xl font-bold sm:text-2xl">Tất cả những gì CLB cần</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border p-5 transition-shadow [background:var(--pf-surface)] [border-color:var(--pf-border)] [box-shadow:var(--pf-shadow)] hover:[box-shadow:var(--pf-shadow-hover)]"
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}
              >
                <f.icon size={20} />
              </div>
              <h3 className="mt-3 text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm [color:var(--pf-color-muted)]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Đội ngũ AI */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border p-6 sm:p-8 [background:var(--pf-surface)] [border-color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
          <h2 className="text-center text-xl font-bold sm:text-2xl">Đội ngũ AI đồng hành</h2>
          <p className="mx-auto mt-1 max-w-lg text-center text-sm [color:var(--pf-color-muted)]">
            AI hỗ trợ vận hành — luôn cần con người duyệt việc quan trọng, không tự ý thực thi tác vụ nhạy cảm.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {AI_TEAM.map((m) => (
              <div key={m.name} className="rounded-2xl border p-4 text-center [border-color:var(--pf-border)]">
                <div
                  className="mx-auto flex h-10 w-10 items-center justify-center rounded-full text-white"
                  style={{ background: m.tone }}
                >
                  <Bot size={18} />
                </div>
                <p className="mt-2 text-sm font-bold">{m.name}</p>
                <p className="text-[11px] [color:var(--pf-color-muted)]">{m.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div
          className="rounded-3xl px-6 py-10 text-center text-white sm:px-10"
          style={{ background: 'var(--pf-primary)' }}
        >
          <h2 className="text-2xl font-extrabold sm:text-3xl">Sẵn sàng vận hành CLB chuyên nghiệp?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm opacity-90">
            Bắt đầu ngay hôm nay — thiết lập trong vài phút.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold shadow-sm transition-transform active:scale-[0.98]"
            style={{ color: 'var(--pf-primary)' }}
          >
            Dùng thử ngay <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </PublicShell>
  )
}
