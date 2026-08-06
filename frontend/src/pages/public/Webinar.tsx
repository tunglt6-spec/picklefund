/**
 * /webinar — Webinar & sự kiện. Trung thực: KHÔNG bịa lịch/sự kiện. Mời để lại email nhận
 * thông báo (mở email client qua mailto tới CONTACT.email) + hướng tới demo tương tác on-demand.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, Video, BellRing, ArrowRight } from 'lucide-react'
import { PublicPage, PageHero, PUBLIC_CONTAINER } from './PublicPage'
import { CONTACT } from './landing-content'

const TOPICS = [
  'Thiết lập CLB & quản lý quỹ minh bạch',
  'Điểm danh và chia chi phí tự động',
  'Tổ chức giải đấu từ A đến Z',
  'Ứng dụng đội ngũ AI (AIDO) vào vận hành',
]

export function Webinar() {
  const [email, setEmail] = useState('')
  const notify = () => {
    const s = encodeURIComponent('Đăng ký nhận thông báo Webinar PickleFund')
    const b = encodeURIComponent(`Tôi muốn nhận thông báo khi có lịch webinar/sự kiện.\nEmail: ${email}`)
    window.location.href = `mailto:${CONTACT.email}?subject=${s}&body=${b}`
  }

  return (
    <PublicPage title="Webinar & sự kiện">
      <PageHero
        eyebrow="Tài nguyên · Webinar"
        title="Webinar & sự kiện PickleFund"
        desc="Chúng tôi đang lên lịch các buổi webinar hướng dẫn vận hành CLB và ứng dụng AI. Để lại email để nhận thông báo ngay khi có lịch."
      />

      <section className={`${PUBLIC_CONTAINER} py-12`}>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          {/* Đăng ký nhận thông báo — trung thực, chưa có lịch */}
          <div className="rounded-3xl border p-6 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
            <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] [color:var(--pf-primary)]"><CalendarClock size={14} /> Lịch sắp tới</div>
            <p className="text-[16px] font-extrabold [color:var(--pf-text)]">Chưa có buổi nào được lên lịch công khai</p>
            <p className="mt-1.5 text-[13px] leading-relaxed [color:var(--pf-color-muted)]">
              Chúng tôi sẽ thông báo ngay khi có lịch. Nhập email để được nhắc — email của bạn chỉ dùng cho mục đích này.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@cua-ban.com"
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none [border-color:var(--pf-border)] [background:var(--pf-surface)] [color:var(--pf-text)] focus:[border-color:var(--pf-primary)]"
              />
              <button
                onClick={notify}
                disabled={!email.includes('@')}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: 'var(--pf-primary)' }}
              >
                <BellRing size={15} /> Nhận thông báo
              </button>
            </div>
          </div>

          {/* Chủ đề dự kiến */}
          <div className="rounded-3xl border p-6 [border-color:var(--pf-border)] [background:var(--pf-surface-muted)]">
            <p className="text-[15px] font-extrabold [color:var(--pf-text)]">Chủ đề dự kiến</p>
            <ul className="mt-3 space-y-2">
              {TOPICS.map((t) => (
                <li key={t} className="flex gap-2 text-[13.5px] leading-relaxed [color:var(--pf-text)]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full [background:var(--pf-primary)]" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* On-demand: demo tương tác thật */}
        <div className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-4 rounded-2xl border p-6 text-center [border-color:var(--pf-border)] sm:flex-row sm:text-left" style={{ background: 'var(--pf-primary-soft)' }}>
          <Video size={28} className="shrink-0 [color:var(--pf-primary)]" />
          <div className="flex-1">
            <p className="text-[15px] font-bold [color:var(--pf-text)]">Không muốn chờ?</p>
            <p className="mt-0.5 text-[13px] [color:var(--pf-color-muted)]">Trải nghiệm sản phẩm ngay với bản demo tương tác — sẵn sàng bất cứ lúc nào.</p>
          </div>
          <Link to="/resources/video" className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: 'var(--pf-primary)' }}>
            Xem demo ngay <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </PublicPage>
  )
}
