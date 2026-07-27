/**
 * Landing (PickleFund SaaS v1) — trang thương mại công khai. Định vị: AI Sports Community Platform.
 * Nền trắng sáng, màu nhấn tím (#6D5DFB), card bo góc, shadow nhẹ. Dựng bằng HTML/CSS + token --pf-*,
 * icon lucide-react. Nội dung tập trung ở landing-content.ts. Mockup dashboard/mobile self-contained.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, ArrowRight, Check, ChevronDown, Star,
  Search, Bell, Maximize2, AlertCircle,
} from 'lucide-react'
import { LandingHeader } from './LandingHeader'
import { LandingFooter } from './LandingFooter'
import {
  STATS, SPORTS, FEATURES, AGENTS, BENEFITS, TESTIMONIALS, PRICING_TIERS, FAQS,
  type Agent,
} from './landing-content'

const CONTAINER = 'pf-center-x max-w-[1200px] px-4 sm:px-6'

/* ── Avatar trợ lý AI (ảnh public/agents/*.png) — fallback initial nếu thiếu file ── */
function AgentAvatar({ agent, className, imgClass }: { agent: Agent; className: string; imgClass?: string }) {
  const [err, setErr] = useState(false)
  if (err) {
    return (
      <div className={`flex items-center justify-center font-extrabold text-white ${className}`} style={{ background: agent.color }} role="img" aria-label={`Trợ lý AI ${agent.name}`}>
        {agent.name.charAt(0)}
      </div>
    )
  }
  return (
    <img
      src={agent.avatar}
      alt={`Trợ lý AI ${agent.name}`}
      loading="lazy"
      onError={() => setErr(true)}
      className={`${className} ${imgClass ?? 'object-cover object-top'}`}
    />
  )
}

/* ── Mockup dashboard trong Hero (self-contained, minh hoạ) ── */
function DashboardMock() {
  const bars = [45, 62, 40, 72, 55, 84, 60]
  const days = ['18/07', '19/07', '20/07', '21/07', '22/07', '23/07', '24/07']
  return (
    <div className="w-full overflow-hidden rounded-2xl border [background:var(--pf-surface)] [border-color:var(--pf-border)]" style={{ boxShadow: 'var(--pf-shadow-hover)' }}>
      {/* Topbar mock */}
      <div className="flex items-center justify-between border-b px-3 py-2 [border-color:var(--pf-border)]">
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white" style={{ background: 'var(--pf-primary)' }}>P</span>
          <span className="text-[11px] font-bold">PickleFund</span>
          <span className="ml-1 rounded px-1.5 py-0.5 text-[9px] font-semibold [background:var(--pf-surface-muted)] [color:var(--pf-color-muted)]">CLB B32</span>
        </div>
        <div className="flex items-center gap-1.5 [color:var(--pf-color-muted)]">
          <Search size={12} /><Bell size={12} /><Maximize2 size={12} />
        </div>
      </div>
      <div className="flex">
        {/* Sidebar mini */}
        <div className="hidden w-24 shrink-0 flex-col gap-0.5 border-r p-2 sm:flex [border-color:var(--pf-border)]">
          {['Tổng quan', 'Quỹ & TC', 'Thành viên', 'Điểm danh', 'Hoạt động', 'Giải đấu', 'AI Center'].map((s, i) => (
            <span key={s} className={`rounded px-1.5 py-1 text-[9px] font-medium ${i === 0 ? '[background:var(--pf-primary-soft)] [color:var(--pf-primary)]' : '[color:var(--pf-color-muted)]'}`}>{s}</span>
          ))}
        </div>
        {/* Main */}
        <div className="min-w-0 flex-1 p-3">
          <p className="text-[13px] font-bold">AIDO – AI Digital Office</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 lg:grid-cols-4">
            {[
              { l: 'Tổng quỹ', v: '125.750.000đ', d: '+12.5%', tone: 'var(--pf-primary)' },
              { l: 'Thu trong ngày', v: '+3.250.000đ', d: '', tone: 'var(--pf-green)' },
              { l: 'Chi trong ngày', v: '-1.980.000đ', d: '', tone: 'var(--pf-color-danger)' },
              { l: 'Thành viên', v: '128', d: '', tone: 'var(--pf-color-info)' },
            ].map((k) => (
              <div key={k.l} className="rounded-lg border p-2 [border-color:var(--pf-border)]">
                <p className="text-[8px] [color:var(--pf-color-muted)]">{k.l}</p>
                <p className="text-[12px] font-extrabold leading-tight tabular-nums" style={{ color: k.tone }}>{k.v}</p>
                {k.d && <p className="text-[8px] font-semibold [color:var(--pf-green)]">{k.d} vs tuần trước</p>}
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-1 gap-1.5 lg:grid-cols-3">
            <div className="rounded-lg border p-2 lg:col-span-2 [border-color:var(--pf-border)]">
              <p className="mb-1 text-[9px] font-semibold [color:var(--pf-color-muted)]">Hoạt động 7 ngày qua</p>
              <div className="flex h-14 items-end gap-1">
                {bars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: 'var(--pf-primary)', opacity: 0.3 + (i / bars.length) * 0.6 }} />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[7px] [color:var(--pf-color-muted)]">
                {days.map((d) => <span key={d}>{d}</span>)}
              </div>
            </div>
            <div className="rounded-lg border p-2 [border-color:var(--pf-border)]">
              <p className="mb-1 text-[9px] font-semibold [color:var(--pf-color-muted)]">Cảnh báo hôm nay</p>
              {['Quỹ chính đang âm 2.350.000đ', '3 thành viên chưa đóng quỹ', 'Chuyên cần thấp: 1 buổi'].map((a) => (
                <p key={a} className="mb-1 flex items-start gap-1 text-[8px] [color:var(--pf-text)]"><span className="mt-0.5 h-1 w-1 shrink-0 rounded-full" style={{ background: 'var(--pf-color-warning)' }} />{a}</p>
              ))}
            </div>
          </div>
          {/* AI agents row */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg border p-2 [border-color:var(--pf-border)]">
            <span className="text-[8px] font-semibold [color:var(--pf-color-muted)]">AI Agents đang hoạt động:</span>
            {AGENTS.map((a) => (
              <span key={a.name} className="inline-flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-1.5 text-[8px] font-semibold" style={{ background: a.soft, color: a.color }}>
                <AgentAvatar agent={a} className="h-3.5 w-3.5 shrink-0 rounded-full text-[7px]" imgClass="h-3.5 w-3.5 rounded-full object-cover object-center" />{a.name === 'Notification AI' ? 'Noti AI' : a.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Mockup điện thoại (overlay) ── */
function PhoneMock() {
  return (
    <div className="w-[150px] overflow-hidden rounded-[22px] border-4 [background:var(--pf-surface)] [border-color:var(--pf-text)]" style={{ boxShadow: 'var(--pf-shadow-hover)' }}>
      <div className="relative [background:var(--pf-primary)] px-3 pb-4 pt-3 text-white">
        <div className="absolute left-1/2 top-1 h-1 w-8 -translate-x-1/2 rounded-full bg-white/40" />
        <p className="mt-1 text-[8px] opacity-80">Tổng quan hôm nay</p>
        <p className="text-[15px] font-extrabold">125.750.000đ</p>
        <p className="text-[7px] opacity-80">+12.5% so với tuần trước</p>
      </div>
      <div className="space-y-2 p-2.5">
        <div className="rounded-lg border p-2 [border-color:var(--pf-border)]">
          <p className="text-[8px] font-semibold">Lịch hôm nay</p>
          <p className="mt-0.5 text-[7px] [color:var(--pf-color-muted)]">18:00–20:00 · Sân 3, 4</p>
          <p className="text-[7px] [color:var(--pf-color-muted)]">Minigame: Đánh đôi ngẫu nhiên</p>
        </div>
        <div className="rounded-lg border p-2 [border-color:var(--pf-color-warning)]">
          <p className="flex items-center gap-1 text-[8px] font-semibold" style={{ color: 'var(--pf-color-warning)' }}><AlertCircle size={9} /> Cảnh báo</p>
          <p className="mt-0.5 text-[7px] [color:var(--pf-color-muted)]">Quỹ chính đang âm 2.350.000đ</p>
        </div>
      </div>
    </div>
  )
}

/* ── FAQ accordion item ── */
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)
  const id = `faq-panel-${index}`
  return (
    <div className="rounded-2xl border [background:var(--pf-surface)] [border-color:var(--pf-border)]">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="text-[15px] font-semibold [color:var(--pf-text)]">{q}</span>
        <ChevronDown size={18} className="shrink-0 transition-transform [color:var(--pf-color-muted)]" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && <div id={id} className="px-5 pb-4 text-sm leading-relaxed [color:var(--pf-color-muted)]">{a}</div>}
    </div>
  )
}

function SectionHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h2>
      {subtitle && <p className="mx-auto mt-2 text-sm [color:var(--pf-color-muted)] sm:text-base">{subtitle}</p>}
    </div>
  )
}

export function Landing() {
  const navigate = useNavigate()

  useEffect(() => {
    const prev = document.title
    document.title = 'PickleFund – Nền tảng quản lý CLB thể thao tích hợp AI'
    return () => { document.title = prev }
  }, [])

  return (
    <div className="pf-landing min-h-screen [background:var(--pf-bg)] [color:var(--pf-text)]">
      <style>{`@media (prefers-reduced-motion: no-preference){.pf-fade{animation:pfFade .5s ease both}@keyframes pfFade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}}`}</style>
      <LandingHeader />

      <main>
        {/* ── Hero ── */}
        <section className={`${CONTAINER} grid items-center gap-10 py-12 lg:grid-cols-2 lg:gap-10 lg:py-16`}>
          <div className="pf-fade">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}>
              <ShieldCheck size={13} /> Nền tảng vận hành CLB thể thao có AI
            </span>
            <h1 className="mt-4 text-[32px] font-extrabold leading-[1.1] tracking-tight sm:text-[42px] lg:text-[52px]">
              Quản lý CLB thể thao<br />
              <span style={{ color: 'var(--pf-primary)' }}>toàn diện – thông minh – hiệu quả</span>
            </h1>
            <p className="mt-4 max-w-[560px] text-base [color:var(--pf-color-muted)] sm:text-lg">
              PickleFund giúp CLB quản lý quỹ, thành viên, hoạt động và giải đấu cho nhiều bộ môn thể thao.
              Tất cả trong một nền tảng, có trợ lý AI hỗ trợ ra quyết định.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => navigate('/login')} className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]" style={{ background: 'var(--pf-primary)' }}>
                Dùng thử miễn phí <ArrowRight size={16} />
              </button>
              <button onClick={() => navigate('/pricing')} className="inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold transition-colors [border-color:var(--pf-border)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)]">
                Xem bảng giá
              </button>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs [color:var(--pf-color-muted)]">
              {['Không cần cài đặt', 'Thiết lập trong 2 phút', 'Hỗ trợ 24/7'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5"><Check size={13} style={{ color: 'var(--pf-secondary)' }} /> {t}</span>
              ))}
            </div>
          </div>

          <div className="relative pf-fade">
            <DashboardMock />
            <div className="absolute -bottom-6 right-2 hidden sm:block">
              <PhoneMock />
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section aria-label="Thống kê" className={`${CONTAINER} py-8`}>
          <div className="grid grid-cols-2 gap-4 rounded-3xl border p-6 sm:grid-cols-3 lg:grid-cols-5 [background:var(--pf-surface)] [border-color:var(--pf-border)]" style={{ boxShadow: 'var(--pf-shadow)' }}>
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}><s.icon size={18} /></span>
                <p className="mt-2 text-2xl font-extrabold tabular-nums" style={{ color: 'var(--pf-primary)' }}>{s.value}</p>
                <p className="text-xs [color:var(--pf-color-muted)]">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Sports ── */}
        <section id="sports" className={`${CONTAINER} py-12`}>
          <SectionHead title="Hỗ trợ nhiều bộ môn thể thao" subtitle="Một nền tảng – quản lý toàn bộ hoạt động của CLB." />
          <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-10">
            {SPORTS.map((sp, i) => (
              <div
                key={sp.name}
                className="flex flex-col items-center gap-2 rounded-2xl border p-4 transition-shadow hover:shadow-md"
                style={i === 0
                  ? { background: 'var(--pf-primary-soft)', borderColor: 'var(--pf-primary)' }
                  : { background: 'var(--pf-surface)', borderColor: 'var(--pf-border)' }}
              >
                <span className="text-2xl" role="img" aria-label={sp.name}>{sp.emoji}</span>
                <span className="text-center text-xs font-medium" style={{ color: i === 0 ? 'var(--pf-primary)' : 'var(--pf-text)', fontWeight: i === 0 ? 700 : 500 }}>{sp.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className={`${CONTAINER} py-12`}>
          <SectionHead title="Tất cả những gì CLB cần" subtitle="Bộ công cụ đầy đủ để vận hành CLB chuyên nghiệp." />
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex h-full flex-col rounded-2xl border p-5 transition-shadow hover:shadow-md [background:var(--pf-surface)] [border-color:var(--pf-border)]" style={{ boxShadow: 'var(--pf-shadow)' }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}><f.icon size={18} /></div>
                <h3 className="mt-3 text-[15px] font-semibold">{f.title}</h3>
                <p className="mt-1 flex-1 text-sm [color:var(--pf-color-muted)]">{f.desc}</p>
                {f.stats && (
                  <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${f.stats.length}, minmax(0,1fr))` }}>
                    {f.stats.map((st) => (
                      <div key={st.label} className="rounded-lg [background:var(--pf-surface-muted)] p-2">
                        <p className="text-[13px] font-extrabold tabular-nums leading-tight" style={{ color: st.tone ?? 'var(--pf-text)' }}>{st.value}</p>
                        <p className="text-[10px] [color:var(--pf-color-muted)]">{st.label}</p>
                      </div>
                    ))}
                  </div>
                )}
                {f.progress && (
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-[11px] [color:var(--pf-color-muted)]"><span>{f.progress.label}</span><span className="font-semibold" style={{ color: 'var(--pf-green)' }}>{f.progress.percent}%</span></div>
                    <div className="h-1.5 w-full rounded-full [background:var(--pf-surface-muted)]"><div className="h-1.5 rounded-full" style={{ width: `${f.progress.percent}%`, background: 'var(--pf-primary)' }} /></div>
                  </div>
                )}
                {f.agents && (
                  <div className="mt-4 flex items-center justify-between gap-1.5 sm:justify-start sm:gap-2">
                    {AGENTS.map((a) => (
                      <div key={a.name} className="flex min-w-0 flex-col items-center gap-1" title={`${a.name} · ${a.shortLabel}`}>
                        <AgentAvatar agent={a} className="h-10 w-10 rounded-full border-2 border-white text-sm sm:h-11 sm:w-11" imgClass="h-10 w-10 rounded-full object-cover object-center sm:h-11 sm:w-11" />
                        <span className="max-w-full truncate text-[9px] font-semibold [color:var(--pf-color-muted)]">{a.name === 'Notification AI' ? 'Noti AI' : a.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── AIDO agents — nền tím trái / card avatar phải (bám hình tham chiếu) ── */}
        <section id="aido" className={`${CONTAINER} py-12`}>
          <div className="overflow-hidden rounded-3xl border [border-color:var(--pf-border)]" style={{ boxShadow: 'var(--pf-shadow-hover)' }}>
            <div className="grid lg:grid-cols-[300px_1fr]">
              {/* Panel tím trái */}
              <div className="flex flex-col justify-center gap-4 p-8 text-white" style={{ background: 'linear-gradient(160deg, var(--pf-primary), var(--pf-secondary))' }}>
                <h2 className="text-2xl font-extrabold leading-tight sm:text-[28px]">Đội ngũ AI đồng hành</h2>
                <p className="text-sm leading-relaxed text-white/85">AI hỗ trợ vận hành – luôn bên bạn để mỗi việc đi đúng hướng.</p>
                <button onClick={() => navigate('/login')} className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold shadow-sm transition-transform active:scale-[0.98]" style={{ color: 'var(--pf-primary)' }}>
                  Tìm hiểu AIDO <ArrowRight size={15} />
                </button>
              </div>
              {/* 5 card agent với avatar nhân vật */}
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5 [background:var(--pf-surface)]">
                {AGENTS.map((a) => (
                  <div key={a.name} className="flex flex-col overflow-hidden rounded-2xl border [border-color:var(--pf-border)] [background:var(--pf-surface)]" style={{ boxShadow: 'var(--pf-shadow)' }}>
                    <AgentAvatar agent={a} className="aspect-[4/5] w-full text-2xl" imgClass="aspect-[4/5] w-full object-cover object-top" />
                    <div className="flex flex-1 flex-col p-3 text-center">
                      <p className="text-[13px] font-bold leading-tight">{a.name}</p>
                      <p className="text-[10px] font-semibold" style={{ color: a.color }}>{a.shortLabel}</p>
                      <p className="mt-1 text-[10px] leading-snug [color:var(--pf-color-muted)]">{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Why choose ── */}
        <section id="why" className={`${CONTAINER} py-12`}>
          <SectionHead title="Vì sao chọn PickleFund?" />
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex items-start gap-3 rounded-2xl border p-5 [background:var(--pf-surface)] [border-color:var(--pf-border)]" style={{ boxShadow: 'var(--pf-shadow)' }}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}><b.icon size={18} /></span>
                <div>
                  <h3 className="text-[15px] font-semibold">{b.title}</h3>
                  <p className="mt-1 text-sm [color:var(--pf-color-muted)]">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section id="testimonials" className={`${CONTAINER} py-12`}>
          <SectionHead title="Các CLB tin dùng PickleFund" />
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="flex h-full flex-col rounded-2xl border p-5 [background:var(--pf-surface)] [border-color:var(--pf-border)]" style={{ boxShadow: 'var(--pf-shadow)' }}>
                <div className="flex items-center gap-1 text-amber-400" aria-label="5 sao">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                </div>
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed [color:var(--pf-text)]">“{t.quote}”</blockquote>
                <figcaption className="mt-4 flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: t.color }}>{t.initials}</span>
                  <span>
                    <span className="block text-sm font-semibold [color:var(--pf-text)]">{t.name}</span>
                    <span className="block text-[11px] [color:var(--pf-color-muted)]">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
            {/* Ô thứ 4: hơn 30+ CLB khác (icon khiên) */}
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border p-5 text-center [background:var(--pf-surface)] [border-color:var(--pf-border)]" style={{ boxShadow: 'var(--pf-shadow)' }}>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}><ShieldCheck size={16} /></span>
                ))}
              </div>
              <p className="text-sm font-bold [color:var(--pf-text)]">Và hơn 30+ CLB khác</p>
              <p className="text-[11px] [color:var(--pf-color-muted)]">đang tin dùng PickleFund mỗi ngày</p>
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className={`${CONTAINER} py-12`}>
          <SectionHead title="Bảng giá đơn giản, minh bạch" subtitle="Chọn gói phù hợp quy mô CLB. Nâng/hạ gói bất cứ lúc nào." />
          <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
            {PRICING_TIERS.map((t) => (
              <div key={t.name} className="relative flex flex-col rounded-3xl border p-6 [background:var(--pf-surface)]" style={{ borderColor: t.featured ? 'var(--pf-primary)' : 'var(--pf-border)', boxShadow: t.featured ? 'var(--pf-shadow-hover)' : 'var(--pf-shadow)' }}>
                {t.featured && <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold text-white" style={{ background: 'var(--pf-primary)' }}><Star size={12} /> Phổ biến</span>}
                <h3 className="text-lg font-bold">{t.name}</h3>
                <p className="mt-1 text-sm [color:var(--pf-color-muted)]">{t.desc}</p>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-3xl font-extrabold tracking-tight">{t.price}</span>
                  {t.period && <span className="pb-1 text-sm [color:var(--pf-color-muted)]">{t.period}</span>}
                </div>
                <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}><Check size={11} /></span>
                      <span className="[color:var(--pf-text)]">{f}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/login')} className="mt-6 w-full rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]" style={t.featured ? { background: 'var(--pf-primary)', color: '#fff' } : { border: '1px solid var(--pf-border)', color: 'var(--pf-text)' }}>{t.cta}</button>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-5 max-w-lg text-center text-xs [color:var(--pf-color-muted)]">
            Thanh toán trực tuyến sẽ được kích hoạt sau. Hiện tại vui lòng dùng thử hoặc liên hệ đội ngũ để thiết lập gói.{' '}
            <button onClick={() => navigate('/pricing')} className="font-semibold [color:var(--pf-primary)]">Xem chi tiết bảng giá</button>
          </p>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className={`${CONTAINER} py-12`}>
          <SectionHead title="Câu hỏi thường gặp" />
          <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-3">
            {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} index={i} />)}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className={`${CONTAINER} pb-16 pt-4`}>
          <div className="overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-10" style={{ background: 'var(--pf-primary)' }}>
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Sẵn sàng nâng tầm CLB của bạn?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/85">Dùng thử miễn phí 14 ngày. Không cần thẻ tín dụng.</p>
            <button onClick={() => navigate('/login')} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold shadow-sm transition-transform active:scale-[0.98]" style={{ color: 'var(--pf-primary)' }}>
              Dùng thử miễn phí ngay <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
