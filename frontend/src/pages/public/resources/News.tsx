/**
 * /resources/news — Tin tức & cập nhật. Trung thực: KHÔNG bịa bản tin/thông cáo. Trang tổng hợp
 * nội dung CÓ THẬT — bài viết mới nhất (BLOG_POSTS), điểm cập nhật sản phẩm (link Release Notes),
 * và đăng ký nhận thông báo qua email (mailto tới CONTACT.email).
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Newspaper, Rss, Megaphone, BellRing, ArrowRight, Clock } from 'lucide-react'
import { PublicPage, PageHero, PUBLIC_CONTAINER } from '../PublicPage'
import { CONTACT } from '../landing-content'
import { BLOG_POSTS } from './blog-posts'

export function News() {
  const [email, setEmail] = useState('')
  const latest = BLOG_POSTS.slice(0, 3)

  const subscribe = () => {
    const s = encodeURIComponent('Đăng ký nhận tin tức & cập nhật PickleFund')
    const b = encodeURIComponent(`Tôi muốn nhận thông báo về cập nhật sản phẩm và tin tức.\nEmail: ${email}`)
    window.location.href = `mailto:${CONTACT.email}?subject=${s}&body=${b}`
  }

  return (
    <PublicPage title="Tin tức & cập nhật">
      <PageHero
        eyebrow="Tài nguyên · Tin tức"
        title="Tin tức & cập nhật"
        desc="Theo dõi những gì mới ở PickleFund — bài viết mới nhất, cập nhật sản phẩm và các thông báo quan trọng."
      />

      <section className={`${PUBLIC_CONTAINER} py-12`}>
        {/* Điểm cập nhật sản phẩm */}
        <div className="mb-10 flex flex-col items-center gap-4 rounded-3xl border p-6 text-center [border-color:var(--pf-border)] sm:flex-row sm:text-left" style={{ background: 'var(--pf-primary-soft)' }}>
          <Megaphone size={28} className="shrink-0 [color:var(--pf-primary)]" />
          <div className="flex-1">
            <p className="text-[15px] font-bold [color:var(--pf-text)]">Có gì mới trong sản phẩm?</p>
            <p className="mt-0.5 text-[13px] [color:var(--pf-color-muted)]">Xem nhật ký các tính năng đã phát hành, nhóm theo chủ đề.</p>
          </div>
          <Link to="/resources/release-notes" className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: 'var(--pf-primary)' }}>
            Nhật ký cập nhật <ArrowRight size={15} />
          </Link>
        </div>

        {/* Bài viết mới nhất (thật) */}
        <div className="mb-4 flex items-center gap-2">
          <Rss size={18} className="[color:var(--pf-primary)]" />
          <h2 className="text-lg font-extrabold tracking-tight [color:var(--pf-text)]">Bài viết mới nhất</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((p) => (
            <Link key={p.slug} to={`/resources/blog/${p.slug}`} className="group flex flex-col rounded-2xl border p-5 [border-color:var(--pf-border)] [background:var(--pf-surface)] transition-shadow hover:shadow-lg">
              <span className="inline-flex items-center gap-1 text-[11px] [color:var(--pf-color-muted)]"><Clock size={12} /> {p.readMins} phút đọc</span>
              <h3 className="mt-2 text-[15px] font-extrabold leading-snug [color:var(--pf-text)]">{p.title}</h3>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed [color:var(--pf-color-muted)]">{p.excerpt}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold [color:var(--pf-primary)]">Đọc bài <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Link to="/resources/blog" className="inline-flex items-center gap-1.5 text-[13px] font-semibold [color:var(--pf-primary)]">Xem tất cả bài viết <ArrowRight size={14} /></Link>
        </div>

        {/* Đăng ký nhận thông báo */}
        <div className="mx-auto mt-12 max-w-2xl rounded-3xl border p-6 text-center [border-color:var(--pf-border)] [background:var(--pf-surface)]">
          <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] [color:var(--pf-primary)]"><Newspaper size={14} /> Nhận thông báo</div>
          <p className="text-[15px] font-bold [color:var(--pf-text)]">Không bỏ lỡ cập nhật quan trọng</p>
          <p className="mt-1 text-[13px] [color:var(--pf-color-muted)]">Để lại email — chúng tôi sẽ báo khi có tính năng mới hoặc thông báo đáng chú ý.</p>
          <div className="mx-auto mt-4 flex max-w-md flex-col gap-2 sm:flex-row">
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="email@cua-ban.com"
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none [border-color:var(--pf-border)] [background:var(--pf-surface)] [color:var(--pf-text)] focus:[border-color:var(--pf-primary)]"
            />
            <button
              onClick={subscribe} disabled={!email.includes('@')}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--pf-primary)' }}
            >
              <BellRing size={15} /> Đăng ký
            </button>
          </div>
        </div>
      </section>
    </PublicPage>
  )
}
