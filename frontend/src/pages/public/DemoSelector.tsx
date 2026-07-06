/**
 * DemoSelector (04) — trang chọn hồ sơ demo để trải nghiệm. Public.
 * Không có demo-sandbox backend riêng → mỗi hồ sơ là kịch bản minh hoạ, CTA "Vào dùng thử"
 * → /login (flow hợp lý theo spec). V2.2 Clean Modern SaaS, container 1200px, button ≥44px.
 */
import { useNavigate } from 'react-router-dom'
import { Users, Building2, Trophy, ArrowRight, PlayCircle } from 'lucide-react'
import { PublicShell } from './PublicShell'

const CONTAINER = 'pf-center-x max-w-[1200px] px-4 sm:px-8'

interface DemoProfile {
  icon: typeof Users
  title: string
  size: string
  desc: string
  tone: string
  soft: string
}

const PROFILES: DemoProfile[] = [
  {
    icon: Users,
    title: 'CLB nhỏ',
    size: '10–30 thành viên',
    desc: 'Quản lý quỹ hằng tháng, điểm danh, phiếu cá nhân — gọn nhẹ cho CLB mới.',
    tone: 'var(--pf-primary)',
    soft: 'var(--pf-primary-soft)',
  },
  {
    icon: Building2,
    title: 'CLB vừa',
    size: '30–100 thành viên',
    desc: 'Nhiều admin, quỹ Chung + Mini, báo cáo & thông báo email, trợ lý AI.',
    tone: 'var(--pf-color-info)',
    soft: 'var(--pf-color-info-soft)',
  },
  {
    icon: Trophy,
    title: 'Ban tổ chức giải',
    size: 'Giải đấu / minigame',
    desc: 'Bốc thăm đôi, nhập kết quả, bảng xếp hạng, xuất kết quả đẹp.',
    tone: 'var(--pf-color-warning)',
    soft: 'var(--pf-color-warning-soft)',
  },
]

export function DemoSelector() {
  const navigate = useNavigate()
  return (
    <PublicShell>
      <section className={`${CONTAINER} pt-14 pb-6 text-center sm:pt-20`}>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}
        >
          <PlayCircle size={13} /> Trải nghiệm demo
        </span>
        <h1 className="mx-auto mt-4 max-w-2xl text-[28px] font-extrabold leading-[1.15] tracking-tight sm:text-[40px]">
          Chọn hồ sơ CLB để khám phá PickleFund
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm [color:var(--pf-color-muted)] sm:text-base">
          Mỗi hồ sơ minh hoạ một loại CLB điển hình. Bắt đầu dùng thử để trải nghiệm với dữ liệu thật của bạn.
        </p>
      </section>

      <section className={`${CONTAINER} grid grid-cols-1 gap-5 pb-12 md:grid-cols-3`}>
        {PROFILES.map((p) => (
          <div
            key={p.title}
            className="flex flex-col rounded-3xl border p-6 [background:var(--pf-surface)] [border-color:var(--pf-border)]"
            style={{ boxShadow: 'var(--pf-shadow)' }}
          >
            <div className="flex items-center justify-between">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: p.soft, color: p.tone }}
              >
                <p.icon size={22} />
              </div>
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: 'var(--pf-surface-muted)', color: 'var(--pf-color-muted)' }}
              >
                Demo
              </span>
            </div>
            <h3 className="mt-4 text-lg font-bold">{p.title}</h3>
            <p className="text-xs font-semibold" style={{ color: p.tone }}>{p.size}</p>
            <p className="mt-2 flex-1 text-sm [color:var(--pf-color-muted)]">{p.desc}</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98]"
              style={{ background: 'var(--pf-primary)' }}
            >
              Vào dùng thử <ArrowRight size={16} />
            </button>
          </div>
        ))}
      </section>

      <section className={`${CONTAINER} pb-16`}>
        <div className="rounded-2xl border p-5 text-center [background:var(--pf-primary-soft)] [border-color:var(--pf-border)]">
          <p className="text-sm [color:var(--pf-text)]">
            Demo dùng dữ liệu minh hoạ. Đăng nhập/đăng ký để tạo CLB và trải nghiệm với dữ liệu thật của bạn.
          </p>
          <button
            onClick={() => navigate('/pricing')}
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors [border-color:var(--pf-border)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)]"
          >
            Xem bảng giá
          </button>
        </div>
      </section>
    </PublicShell>
  )
}
