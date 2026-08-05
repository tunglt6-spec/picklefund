/**
 * Pricing (v3 · SaaS 2026 conversion-first) — public. Cấu trúc tối ưu chuyển đổi:
 * ROI "3.300đ/ngày" → 3 gói (Starter free · Pro 99k/990k nổi bật · Enterprise liên hệ)
 * → bảng so sánh → FAQ → banner CTA. Giá KHỚP backend PLAN_CONFIGS (Pro 99k/tháng).
 */
import { useNavigate } from 'react-router-dom'
import { Check, X, Star, Rocket, ShieldCheck, Smartphone, Wallet, Trophy, Bot } from 'lucide-react'
import { PublicShell } from './PublicShell'

interface Tier {
  name: string
  price: string
  period?: string
  sub?: string
  desc: string
  featured?: boolean
  badge?: string
  note?: string
  intro?: string
  features: string[]
  cta: string
  ctaTo: 'register' | 'contact'
}

const TIERS: Tier[] = [
  {
    name: 'Starter',
    price: 'Miễn phí',
    sub: 'trọn đời',
    desc: 'Cho CLB mới thành lập.',
    features: [
      'Tối đa 15 thành viên',
      '01 CLB',
      'Quản lý thành viên',
      'Quỹ chung',
      'Thu / Chi',
      'Điểm danh',
      'Lịch sinh hoạt',
      'Báo cáo cơ bản',
      'Web + Mobile',
    ],
    cta: 'Bắt đầu miễn phí',
    ctaTo: 'register',
  },
  {
    name: 'Pro',
    price: '99.000đ',
    period: '/tháng',
    sub: 'hoặc 990.000đ/năm · tiết kiệm 2 tháng',
    desc: 'Cho CLB đang phát triển.',
    featured: true,
    badge: 'Phổ biến nhất',
    note: 'Khách hàng sáng lập: giữ giá 99k trọn đời khi duy trì thuê bao.',
    intro: 'Toàn bộ Starter, cộng thêm:',
    features: [
      'Không giới hạn thành viên',
      'Quỹ Mini · Công nợ',
      'Minigame · Giải đấu · Bảng xếp hạng',
      'Dashboard AI · AIDO Digital Office',
      'Lisa AI · Maika AI · Hermes Workflow',
      'Telegram Bot · Email',
      'Báo cáo PDF · Excel · nâng cao',
      'Backup Cloud',
      'Hỗ trợ ưu tiên',
    ],
    cta: '🚀 Nâng cấp ngay',
    ctaTo: 'register',
  },
  {
    name: 'Enterprise',
    price: 'Liên hệ',
    desc: 'Trung tâm · Học viện · Chuỗi CLB · Liên đoàn.',
    intro: 'Toàn bộ Pro, cộng thêm:',
    features: [
      'Multi Club',
      'White Label · Logo riêng · Domain riêng',
      'API',
      'AI Workflow nâng cao',
      'Dashboard riêng',
      'Phân quyền nhiều cấp',
      'Đào tạo · SLA',
    ],
    cta: 'Đăng ký tư vấn',
    ctaTo: 'contact',
  },
]

const ROI_ITEMS = [
  { icon: <Bot size={18} />, label: 'AI Digital Office' },
  { icon: <Wallet size={18} />, label: 'Quản lý quỹ' },
  { icon: <Trophy size={18} />, label: 'Quản lý giải đấu' },
  { icon: <Star size={18} />, label: 'Quản lý thành viên' },
  { icon: <Smartphone size={18} />, label: 'Web + Mobile' },
]

type Cmp = boolean | string
const COMPARE: { label: string; s: Cmp; p: Cmp; e: Cmp }[] = [
  { label: 'Thành viên', s: '15', p: '∞', e: '∞' },
  { label: 'Quỹ', s: true, p: true, e: true },
  { label: 'Giải đấu', s: false, p: true, e: true },
  { label: 'AI Office', s: false, p: true, e: true },
  { label: 'Telegram', s: false, p: true, e: true },
  { label: 'Báo cáo PDF', s: false, p: true, e: true },
  { label: 'White Label', s: false, p: false, e: true },
]

const FAQ: { q: string; a: React.ReactNode }[] = [
  { q: 'Nếu CLB có hơn 15 thành viên?', a: <>Chỉ cần nâng cấp lên <b>Pro</b> — không giới hạn thành viên.</> },
  { q: 'Có giới hạn số giải đấu?', a: <>Starter: không có giải đấu. <b>Pro</b>: không giới hạn.</> },
  { q: 'Có dùng trên điện thoại?', a: <>Có — Android · iPhone · Tablet · Desktop (Web + Mobile).</> },
  { q: 'Dữ liệu có an toàn?', a: <>Có — Cloud Backup · HTTPS · phân quyền · Audit Log.</> },
]

function CmpCell({ v }: { v: Cmp }) {
  if (v === true) return <Check size={16} className="mx-auto text-emerald-500" />
  if (v === false) return <X size={15} className="mx-auto [color:var(--pf-color-muted)] opacity-50" />
  return <span className="font-semibold [color:var(--pf-text)]">{v}</span>
}

export function Pricing() {
  const navigate = useNavigate()
  const go = (to: Tier['ctaTo']) =>
    to === 'contact'
      ? window.open('mailto:sales@picklefund.app?subject=Tư vấn gói Enterprise PickleFund', '_blank')
      : navigate('/login')

  return (
    <PublicShell>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-2 text-center sm:pt-20">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Bảng giá đơn giản, minh bạch</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm [color:var(--pf-color-muted)] sm:text-base">
          Chọn gói phù hợp quy mô CLB. Nâng/hạ gói bất cứ lúc nào — thanh toán tự động.
        </p>
      </section>

      {/* ROI block */}
      <section className="mx-auto max-w-3xl px-4 pt-6 pb-2">
        <div
          className="rounded-3xl border p-6 text-center sm:p-7"
          style={{
            borderColor: 'var(--pf-primary)',
            background: 'linear-gradient(135deg, var(--pf-primary-soft), var(--pf-surface))',
          }}
        >
          <p className="text-sm font-medium [color:var(--pf-color-muted)]">Chỉ bằng</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight [color:var(--pf-primary)] sm:text-5xl">3.300đ<span className="text-lg font-bold [color:var(--pf-color-muted)]">/ngày</span></p>
          <p className="mt-1 text-sm [color:var(--pf-color-muted)]">bạn đã có trọn bộ công cụ số hoá CLB:</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            {ROI_ITEMS.map((it) => (
              <span key={it.label} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium [background:var(--pf-surface)] border-[color:var(--pf-border)] [color:var(--pf-text)]">
                <span className="[color:var(--pf-primary)]">{it.icon}</span>{it.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-5 px-4 pt-8 pb-6 lg:grid-cols-3">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className="relative flex h-full flex-col rounded-3xl border p-6 [background:var(--pf-surface)]"
            style={{
              borderColor: t.featured ? 'var(--pf-primary)' : 'var(--pf-border)',
              borderWidth: t.featured ? 2 : 1,
              boxShadow: t.featured ? 'var(--pf-shadow-hover)' : 'var(--pf-shadow)',
            }}
          >
            {t.badge && (
              <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold text-white" style={{ background: 'var(--pf-primary)' }}>
                <Star size={12} /> {t.badge}
              </span>
            )}
            <h3 className="text-lg font-bold">{t.name}</h3>
            <p className="mt-1 text-sm [color:var(--pf-color-muted)]">{t.desc}</p>
            <div className="mt-4 flex items-end gap-1">
              <span className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.price}</span>
              {t.period && <span className="pb-1.5 text-sm [color:var(--pf-color-muted)]">{t.period}</span>}
              {t.sub && !t.period && <span className="pb-1.5 text-sm font-medium [color:var(--pf-color-muted)]">{t.sub}</span>}
            </div>
            {t.sub && t.period && <p className="mt-1 text-xs font-medium [color:var(--pf-primary)]">{t.sub}</p>}

            <button
              onClick={() => go(t.ctaTo)}
              className="mt-5 w-full rounded-full px-5 py-3 text-sm font-semibold transition-all active:scale-[0.98]"
              style={
                t.featured
                  ? { background: 'var(--pf-primary)', color: '#fff', boxShadow: 'var(--pf-shadow)' }
                  : { border: '1px solid var(--pf-border)', background: 'var(--pf-surface)', color: 'var(--pf-text)' }
              }
            >
              {t.cta}
            </button>

            {t.intro && <p className="mt-5 text-xs font-semibold uppercase tracking-wide [color:var(--pf-color-muted)]">{t.intro}</p>}
            <ul className={`${t.intro ? 'mt-2.5' : 'mt-5'} flex flex-1 flex-col gap-2.5`}>
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}>
                    <Check size={11} />
                  </span>
                  <span className="[color:var(--pf-text)]">{f}</span>
                </li>
              ))}
            </ul>
            {t.note && (
              <p className="mt-4 rounded-xl px-3 py-2 text-[11px] font-medium" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}>
                ⭐ {t.note}
              </p>
            )}
          </div>
        ))}
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-4xl px-4 pt-8 pb-4">
        <h2 className="mb-4 text-center text-xl font-bold">So sánh nhanh</h2>
        <div className="overflow-x-auto rounded-2xl border border-[color:var(--pf-border)] [background:var(--pf-surface)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--pf-border)] [background:var(--pf-surface-muted)]">
                <th className="px-4 py-3 text-left font-medium [color:var(--pf-color-muted)]">Tính năng</th>
                <th className="px-4 py-3 text-center font-semibold">Starter</th>
                <th className="px-4 py-3 text-center font-semibold [color:var(--pf-primary)]">Pro</th>
                <th className="px-4 py-3 text-center font-semibold">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((r) => (
                <tr key={r.label} className="border-b border-[color:var(--pf-border-soft)] last:border-0">
                  <td className="px-4 py-3 [color:var(--pf-text)]">{r.label}</td>
                  <td className="px-4 py-3 text-center"><CmpCell v={r.s} /></td>
                  <td className="px-4 py-3 text-center [background:var(--pf-primary-soft)]"><CmpCell v={r.p} /></td>
                  <td className="px-4 py-3 text-center"><CmpCell v={r.e} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pt-8 pb-4">
        <h2 className="mb-4 text-center text-xl font-bold">Câu hỏi thường gặp</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {FAQ.map((f) => (
            <div key={f.q} className="rounded-2xl border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)]">
              <p className="text-sm font-semibold [color:var(--pf-text)]">{f.q}</p>
              <p className="mt-1.5 text-sm [color:var(--pf-color-muted)]">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA banner */}
      <section className="mx-auto max-w-4xl px-4 pt-8 pb-20">
        <div className="rounded-3xl px-6 py-10 text-center text-white" style={{ background: 'linear-gradient(135deg, var(--pf-primary), var(--pf-primary-hover))' }}>
          <div className="mb-2 flex items-center justify-center gap-2">
            <Rocket size={22} />
            <h2 className="text-xl font-extrabold sm:text-2xl">Sẵn sàng số hoá CLB của bạn?</h2>
          </div>
          <p className="mx-auto mb-6 max-w-md text-sm text-white/85">Dùng miễn phí — chỉ mất 2 phút để tạo CLB đầu tiên.</p>
          <button
            onClick={() => navigate('/login')}
            className="rounded-full bg-white px-7 py-3 text-sm font-bold [color:var(--pf-primary)] shadow-md transition-transform active:scale-[0.98]"
          >
            Bắt đầu miễn phí
          </button>
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-white/80"><ShieldCheck size={13} /> Không cần thẻ · Cloud Backup · Huỷ bất cứ lúc nào</p>
        </div>
      </section>
    </PublicShell>
  )
}
