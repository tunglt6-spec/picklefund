/**
 * /contact — Liên hệ. CHỈ dùng kênh THẬT (email support trong CONTACT). Form soạn thư mở
 * email client qua mailto (không có backend gửi → KHÔNG giả "đã gửi"). Không bịa hotline/địa chỉ.
 */
import { useState } from 'react'
import { Mail, MessageSquare, Send, LifeBuoy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PublicPage, PageHero, PUBLIC_CONTAINER } from './PublicPage'
import { CONTACT } from './landing-content'

export function Contact() {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const mailto = () => {
    const s = encodeURIComponent(subject || 'Liên hệ từ website PickleFund')
    const b = encodeURIComponent(`${message}\n\n— ${name || 'Khách truy cập'}`)
    window.location.href = `mailto:${CONTACT.email}?subject=${s}&body=${b}`
  }

  const inputCls =
    'w-full rounded-xl border px-4 py-2.5 text-sm outline-none [border-color:var(--pf-border)] [background:var(--pf-surface)] [color:var(--pf-text)] focus:[border-color:var(--pf-primary)]'

  return (
    <PublicPage title="Liên hệ">
      <PageHero
        eyebrow="Về chúng tôi · Liên hệ"
        title="Kết nối với đội ngũ PickleFund"
        desc="Có câu hỏi về sản phẩm, giá hoặc triển khai? Gửi email cho chúng tôi — đội ngũ hỗ trợ sẽ phản hồi sớm nhất."
      />

      <section className={`${PUBLIC_CONTAINER} py-14`}>
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1fr_1.2fr]">
          {/* Kênh liên hệ thật */}
          <div className="space-y-3">
            <a href={`mailto:${CONTACT.email}`} className="flex items-start gap-3 rounded-2xl border p-4 [border-color:var(--pf-border)] [background:var(--pf-surface)] transition-colors hover:[background:var(--pf-surface-muted)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}><Mail size={18} /></div>
              <div className="min-w-0">
                <p className="text-sm font-bold">Email hỗ trợ</p>
                <p className="truncate text-[13px] [color:var(--pf-primary)]">{CONTACT.email}</p>
                <p className="mt-0.5 text-[12px] [color:var(--pf-color-muted)]">Kênh chính thức cho mọi yêu cầu hỗ trợ.</p>
              </div>
            </a>
            <div className="flex items-start gap-3 rounded-2xl border p-4 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}><LifeBuoy size={18} /></div>
              <div>
                <p className="text-sm font-bold">Hỗ trợ trong app</p>
                <p className="mt-0.5 text-[12px] [color:var(--pf-color-muted)]">Đã là khách hàng? Dùng trợ lý Lisa AI và mục “Hướng dẫn” ngay trong ứng dụng.</p>
                <Link to="/login" className="mt-2 inline-block text-[13px] font-semibold [color:var(--pf-primary)]">Đăng nhập →</Link>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border p-4 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}><MessageSquare size={18} /></div>
              <div>
                <p className="text-sm font-bold">Dùng thử trước khi hỏi</p>
                <p className="mt-0.5 text-[12px] [color:var(--pf-color-muted)]">Trải nghiệm đầy đủ tính năng miễn phí — nhiều câu hỏi sẽ được giải đáp ngay khi dùng.</p>
                <Link to="/pricing" className="mt-2 inline-block text-[13px] font-semibold [color:var(--pf-primary)]">Xem bảng giá →</Link>
              </div>
            </div>
          </div>

          {/* Soạn thư (mailto) */}
          <div className="rounded-2xl border p-6 [border-color:var(--pf-border)] [background:var(--pf-surface)]">
            <p className="text-[15px] font-extrabold">Gửi tin nhắn cho chúng tôi</p>
            <p className="mt-1 text-[12px] [color:var(--pf-color-muted)]">Điền nội dung rồi bấm gửi — trình email của bạn sẽ mở sẵn thư tới {CONTACT.email}.</p>
            <div className="mt-4 space-y-3">
              <input className={inputCls} placeholder="Tên của bạn / CLB" value={name} onChange={(e) => setName(e.target.value)} />
              <input className={inputCls} placeholder="Tiêu đề" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <textarea className={`${inputCls} min-h-[120px] resize-y`} placeholder="Nội dung cần hỗ trợ…" value={message} onChange={(e) => setMessage(e.target.value)} />
              <button
                onClick={mailto}
                disabled={!message.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: 'var(--pf-primary)' }}
              >
                <Send size={15} /> Mở email gửi hỗ trợ
              </button>
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  )
}
