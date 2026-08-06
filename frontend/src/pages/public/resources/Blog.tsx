/**
 * /resources/blog  — danh sách bài cẩm nang (lọc theo chủ đề).
 * /resources/blog/:slug — trang bài viết. Nội dung từ blog-posts.ts (do đội ngũ biên soạn).
 */
import { useMemo, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { Clock, ArrowLeft, ArrowRight, Rss } from 'lucide-react'
import { PublicPage, PageHero, PUBLIC_CONTAINER } from '../PublicPage'
import { BLOG_POSTS, BLOG_CATEGORIES, getPost, type BlogPost } from './blog-posts'

const CAT_TONE: Record<string, string> = {
  'Tài chính': 'var(--pf-green)',
  'Vận hành': 'var(--pf-color-info)',
  'AI & Chuyển đổi số': 'var(--pf-color-ai)',
}

function Card({ post }: { post: BlogPost }) {
  const tone = CAT_TONE[post.category] ?? 'var(--pf-primary)'
  return (
    <Link
      to={`/resources/blog/${post.slug}`}
      className="group flex flex-col rounded-2xl border p-5 [border-color:var(--pf-border)] [background:var(--pf-surface)] transition-shadow hover:shadow-lg"
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone }}>
          {post.category}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] [color:var(--pf-color-muted)]"><Clock size={12} /> {post.readMins} phút đọc</span>
      </div>
      <h3 className="mt-3 text-[16px] font-extrabold leading-snug [color:var(--pf-text)]">{post.title}</h3>
      <p className="mt-2 flex-1 text-[13px] leading-relaxed [color:var(--pf-color-muted)]">{post.excerpt}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold [color:var(--pf-primary)]">
        Đọc bài <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

export function Blog() {
  const [cat, setCat] = useState<string>('Tất cả')
  const posts = useMemo(() => (cat === 'Tất cả' ? BLOG_POSTS : BLOG_POSTS.filter((p) => p.category === cat)), [cat])
  const chips = ['Tất cả', ...BLOG_CATEGORIES]

  return (
    <PublicPage title="Blog — Cẩm nang vận hành CLB">
      <PageHero
        eyebrow="Tài nguyên · Blog"
        title="Cẩm nang vận hành CLB"
        desc="Kiến thức thực tế về tài chính, vận hành và ứng dụng AI cho câu lạc bộ thể thao — do đội ngũ PickleFund biên soạn."
      />
      <section className={`${PUBLIC_CONTAINER} py-12`}>
        <div className="mb-6 flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className="rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors"
              style={
                cat === c
                  ? { background: 'var(--pf-primary)', color: '#fff', borderColor: 'var(--pf-primary)' }
                  : { borderColor: 'var(--pf-border)', color: 'var(--pf-color-muted)' }
              }
            >
              {c}
            </button>
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => <Card key={p.slug} post={p} />)}
        </div>
      </section>
    </PublicPage>
  )
}

export function BlogArticle() {
  const { slug } = useParams<{ slug: string }>()
  const post = slug ? getPost(slug) : undefined
  if (!post) return <Navigate to="/resources/blog" replace />
  const tone = CAT_TONE[post.category] ?? 'var(--pf-primary)'

  return (
    <PublicPage title={post.title}>
      <article className={`${PUBLIC_CONTAINER} py-12`}>
        <div className="mx-auto max-w-3xl">
          <Link to="/resources/blog" className="inline-flex items-center gap-1.5 text-[13px] font-semibold [color:var(--pf-color-muted)] hover:[color:var(--pf-primary)]">
            <ArrowLeft size={15} /> Tất cả bài viết
          </Link>
          <div className="mt-5 flex items-center gap-2">
            <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone }}>{post.category}</span>
            <span className="inline-flex items-center gap-1 text-[11px] [color:var(--pf-color-muted)]"><Clock size={12} /> {post.readMins} phút đọc</span>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl [color:var(--pf-text)]">{post.title}</h1>
          <p className="mt-3 text-[15px] leading-relaxed [color:var(--pf-color-muted)]">{post.excerpt}</p>
          <p className="mt-2 text-[12px] font-medium [color:var(--pf-color-muted)]">Biên soạn bởi Đội ngũ PickleFund</p>

          <div className="mt-8 space-y-6">
            {post.body.map((s, i) => (
              <section key={i}>
                {s.h && <h2 className="mb-2 text-lg font-extrabold tracking-tight [color:var(--pf-text)]">{s.h}</h2>}
                {s.p?.map((para, j) => (
                  <p key={j} className="mb-3 text-[15px] leading-relaxed [color:var(--pf-color-muted)]">{para}</p>
                ))}
                {s.ul && (
                  <ul className="mt-1 space-y-1.5">
                    {s.ul.map((li, k) => (
                      <li key={k} className="flex gap-2 text-[15px] leading-relaxed [color:var(--pf-color-muted)]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tone }} />
                        {li}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border p-6 text-center [border-color:var(--pf-border)]" style={{ background: 'var(--pf-primary-soft)' }}>
            <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] [color:var(--pf-primary)]"><Rss size={14} /> Sẵn sàng áp dụng?</div>
            <p className="text-[15px] font-bold [color:var(--pf-text)]">Đưa những nguyên tắc này vào CLB của bạn</p>
            <p className="mt-1 text-sm [color:var(--pf-color-muted)]">Bắt đầu miễn phí — không cần cài đặt, chạy ngay trên trình duyệt.</p>
            <Link to="/login" className="mt-4 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: 'var(--pf-primary)' }}>
              Dùng thử ngay <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </article>
    </PublicPage>
  )
}
