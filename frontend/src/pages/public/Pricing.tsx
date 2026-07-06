/**
 * Pricing (02) — bảng giá 3 gói Starter / Pro / Club+. Public. V2.2.
 * Chưa tích hợp thanh toán thật — CTA đưa về đăng nhập/liên hệ kích hoạt.
 */
import { useNavigate } from 'react-router-dom'
import { Check, Star } from 'lucide-react'
import { PublicShell } from './PublicShell'

interface Tier {
  name: string
  price: string
  period: string
  desc: string
  featured?: boolean
  features: string[]
  cta: string
}

const TIERS: Tier[] = [
  {
    name: 'Starter',
    price: 'Miễn phí',
    period: '',
    desc: 'Cho CLB nhỏ mới bắt đầu.',
    features: [
      'Tối đa 20 thành viên',
      'Quỹ Chung & điểm danh',
      'Báo cáo cơ bản',
      '1 tài khoản quản trị',
    ],
    cta: 'Bắt đầu miễn phí',
  },
  {
    name: 'Pro',
    price: '199k',
    period: '/tháng',
    desc: 'Cho CLB đang phát triển.',
    featured: true,
    features: [
      'Không giới hạn thành viên',
      'Quỹ Chung + Quỹ Mini',
      'Minigame & giải đấu',
      'Báo cáo PDF/Excel',
      'Trợ lý AI (Maika/Lisa)',
      'Thông báo email',
    ],
    cta: 'Chọn gói Pro',
  },
  {
    name: 'Club+',
    price: 'Liên hệ',
    period: '',
    desc: 'Cho CLB lớn / nhiều chi nhánh.',
    features: [
      'Tất cả tính năng Pro',
      'Nhiều CLB / thương hiệu riêng',
      'AI Ops nâng cao (Hermes/Mít Đặc)',
      'Ưu tiên hỗ trợ',
    ],
    cta: 'Liên hệ tư vấn',
  },
]

export function Pricing() {
  const navigate = useNavigate()
  return (
    <PublicShell>
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-6 text-center sm:pt-20">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Bảng giá đơn giản, minh bạch</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm [color:var(--pf-color-muted)] sm:text-base">
          Chọn gói phù hợp quy mô CLB. Nâng/hạ gói bất cứ lúc nào.
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-5 px-4 pb-16 md:grid-cols-3">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className="relative flex flex-col rounded-3xl border p-6 [background:var(--pf-surface)]"
            style={{
              borderColor: t.featured ? 'var(--pf-primary)' : 'var(--pf-border)',
              boxShadow: t.featured ? 'var(--pf-shadow-hover)' : 'var(--pf-shadow)',
            }}
          >
            {t.featured && (
              <span
                className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold text-white"
                style={{ background: 'var(--pf-primary)' }}
              >
                <Star size={12} /> Phổ biến
              </span>
            )}
            <h3 className="text-lg font-bold">{t.name}</h3>
            <p className="mt-1 text-sm [color:var(--pf-color-muted)]">{t.desc}</p>
            <div className="mt-4 flex items-end gap-1">
              <span className="text-3xl font-extrabold tracking-tight">{t.price}</span>
              {t.period && <span className="pb-1 text-sm [color:var(--pf-color-muted)]">{t.period}</span>}
            </div>
            <ul className="mt-5 flex flex-1 flex-col gap-2.5">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <span
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                    style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}
                  >
                    <Check size={11} />
                  </span>
                  <span className="[color:var(--pf-text)]">{f}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 w-full rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]"
              style={
                t.featured
                  ? { background: 'var(--pf-primary)', color: '#fff', boxShadow: 'var(--pf-shadow)' }
                  : { border: '1px solid var(--pf-border)', background: 'var(--pf-surface)', color: 'var(--pf-text)' }
              }
            >
              {t.cta}
            </button>
          </div>
        ))}
      </section>

      <p className="mx-auto max-w-lg px-4 pb-16 text-center text-xs [color:var(--pf-color-muted)]">
        Thanh toán trực tuyến sẽ được kích hoạt sau. Hiện tại vui lòng đăng nhập hoặc liên hệ đội ngũ để thiết lập gói.
      </p>
    </PublicShell>
  )
}
