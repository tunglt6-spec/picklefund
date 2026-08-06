import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Send, Bot, User, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '../../components/layout/PageHeader'
import { useAuthStore } from '../../store/authStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import api from '../../lib/api'

type Message = { id: string; role: 'user' | 'lisa'; text: string; time: string }
type Brief = { greeting: string; paymentStatus: string; activitySummary: string; reminder: string | null; tips: string[] }

const SUGGESTIONS = [
  'Tôi đã đóng quỹ chưa?',
  'Tôi đã tham gia bao nhiêu buổi?',
  'CLB của tôi đang hoạt động thế nào?',
  'Có thông báo gì mới không?',
]

export function LisaChat() {
  const { user } = useAuthStore()
  const isMobile = useIsMobile()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [brief, setBrief] = useState<Brief | null>(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const msgRef = useRef<HTMLDivElement>(null)
  const inputBarRef = useRef<HTMLDivElement>(null)

  // iOS keyboard: translate input bar up, add padding to messages — no container resize
  useEffect(() => {
    if (!isMobile) return
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const kbHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      const active = kbHeight > 60
      if (inputBarRef.current) {
        inputBarRef.current.style.transform = active ? `translateY(-${kbHeight}px)` : ''
      }
      if (msgRef.current) {
        msgRef.current.style.paddingBottom = active ? `${kbHeight + 8}px` : ''
        if (active) bottomRef.current?.scrollIntoView({ behavior: 'instant' })
      }
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update) }
  }, [isMobile])

  const fetchBrief = useCallback(async () => {
    if (!user) return
    setBriefLoading(true)
    try {
      const res = await api.get('/lisa/brief')
      const data = res.data?.data ?? res.data
      setBrief(data)
      setMessages([{
        id: 'welcome',
        role: 'lisa',
        text: data.greeting,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      }])
    } catch {
      // Phân biệt lỗi kết nối với "chưa có brief thật" — người dùng cần biết Lisa
      // đang hiển thị lời chào mặc định vì API lỗi, không phải vì không có dữ liệu.
      toast.error('Không tải được tóm tắt từ Lisa — đang hiển thị lời chào mặc định.')
      setMessages([{
        id: 'welcome',
        role: 'lisa',
        text: `Xin chào${user?.username ? ` ${user.username}` : ''}! Tôi là Lisa, trợ lý AI của bạn. Hỏi tôi bất cứ điều gì về CLB nhé!`,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      }])
    } finally {
      setBriefLoading(false)
    }
  }, [user])

  useEffect(() => { fetchBrief() }, [fetchBrief])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await api.post('/lisa/ask', { question: text.trim() })
      const data = res.data?.data ?? res.data
      const lisaMsg: Message = {
        id: `l-${Date.now()}`,
        role: 'lisa',
        text: data.answer ?? 'Xin lỗi, tôi không thể trả lời ngay lúc này.',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, lisaMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: `l-err-${Date.now()}`,
        role: 'lisa',
        text: 'Có lỗi xảy ra. Vui lòng thử lại.',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input) }

  const chatContent = (
    <>
      {/* Brief cards */}
      {brief && messages.length <= 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] p-3 shadow-sm">
            <p className="text-[10px] font-semibold [color:var(--pf-color-muted)] uppercase tracking-wider mb-1">Đóng quỹ</p>
            <p className="text-xs font-medium [color:var(--pf-text)]">{brief.paymentStatus}</p>
          </div>
          <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] p-3 shadow-sm">
            <p className="text-[10px] font-semibold [color:var(--pf-color-muted)] uppercase tracking-wider mb-1">Hoạt động</p>
            <p className="text-xs font-medium [color:var(--pf-text)]">{brief.activitySummary}</p>
          </div>
          <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] p-3 shadow-sm">
            <p className="text-[10px] font-semibold [color:var(--pf-color-muted)] uppercase tracking-wider mb-1">Gợi ý</p>
            <p className="text-xs font-medium [color:var(--pf-text)]">{brief.tips[0] ?? '—'}</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex flex-col gap-3">
        {messages.map(m => (
          <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5
              ${m.role === 'lisa' ? '[background:var(--pf-primary-soft)]' : '[background:var(--pf-color-muted-soft)]'}`}>
              {m.role === 'lisa' ? <Bot size={14} className="[color:var(--pf-primary)]" /> : <User size={14} className="[color:var(--pf-color-muted)]" />}
            </div>
            {/* Bubble */}
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm
              ${m.role === 'lisa'
                ? '[background:var(--pf-surface)] border border-[color:var(--pf-border)] [color:var(--pf-text)] rounded-tl-sm'
                : '[background:var(--pf-primary)] text-white rounded-tr-sm'}`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
              <p className={`text-[10px] mt-1 ${m.role === 'lisa' ? '[color:var(--pf-color-muted)]' : 'text-white/70'}`}>{m.time}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full [background:var(--pf-primary-soft)] flex items-center justify-center">
              <Bot size={14} className="[color:var(--pf-primary)]" />
            </div>
            <div className="[background:var(--pf-surface)] border border-[color:var(--pf-border)] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 [background:var(--pf-primary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 [background:var(--pf-primary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 [background:var(--pf-primary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && !loading && (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => sendMessage(s)}
              className="text-xs [background:var(--pf-surface)] border border-[color:var(--pf-border)] [color:var(--pf-color-muted)] px-3 py-1.5 rounded-full hover:[border-color:var(--pf-primary)] hover:[color:var(--pf-primary)] transition-colors shadow-sm">
              {s}
            </button>
          ))}
        </div>
      )}
    </>
  )

  if (isMobile) {
    // Portal ra document.body: tránh ancestor .pf-page (page-transition có transform +
    // fill-mode both → thành containing block cho position:fixed) làm chat bị giam/cắt → trắng màn.
    return createPortal(
      <div
        className="flex flex-col overflow-hidden [background:var(--pf-bg)]"
        style={{
          position: 'fixed',
          top: 64, // dưới mobile header (64px)
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 40,
        }}
      >
        {/* Header */}
        <div className="shrink-0 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full overflow-hidden shadow-sm border-2 border-white">
              <img src="/lisa-avatar.jpg?v=2" alt="Lisa" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-[15px] font-[800] [color:var(--pf-text)]">Lisa AI</p>
              <p className="text-[11px] text-emerald-500 font-medium">● Trực tuyến</p>
            </div>
          </div>
          <button onClick={fetchBrief} disabled={briefLoading} aria-label="Làm mới" className="p-2 [color:var(--pf-color-muted)] active:opacity-60 disabled:opacity-60 disabled:pointer-events-none">
            <RefreshCw size={16} className={briefLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Messages — scrollable, fills remaining space */}
        <div ref={msgRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 pb-2">{chatContent}</div>

        {/* Input — stays at bottom, translates up with keyboard */}
        <div ref={inputBarRef} className="shrink-0 [background:var(--pf-surface)] border-t border-[color:var(--pf-border)] px-4 py-3">
          <form onSubmit={handleSubmit} className="flex gap-2 items-center">
            <input
              value={input} onChange={e => setInput(e.target.value)}
              placeholder="Nhắn tin cho Lisa..."
              className="flex-1 text-sm [background:var(--pf-color-muted-soft)] rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]"
            />
            <button type="submit" disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-full [background:var(--pf-primary)] flex items-center justify-center disabled:opacity-40 active:opacity-70 shadow-sm">
              <Send size={15} className="text-white" />
            </button>
          </form>
        </div>
      </div>,
      document.body,
    )
  }

  return (
    <div className="flex flex-col h-full [background:var(--pf-surface-muted)]">
      <PageHeader
        title="Lisa AI"
        subtitle="Trợ lý cá nhân thông minh"
        actions={
          <button onClick={fetchBrief} disabled={briefLoading} className="flex items-center gap-1.5 text-xs font-medium [color:var(--pf-color-muted)] hover:[color:var(--pf-primary)] disabled:opacity-60 disabled:pointer-events-none">
            <RefreshCw size={13} className={briefLoading ? 'animate-spin' : ''} />{briefLoading ? 'Đang tải…' : 'Làm mới'}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 max-w-[760px] mx-auto w-full">{chatContent}</div>

      <div className="[background:var(--pf-surface)] border-t border-[color:var(--pf-border)] p-4 max-w-[760px] mx-auto w-full">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            value={input} onChange={e => setInput(e.target.value)}
            placeholder="Hỏi Lisa bất cứ điều gì về CLB của bạn..."
            className="flex-1 text-sm [background:var(--pf-color-muted-soft)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)] transition-all"
          />
          <button type="submit" disabled={!input.trim() || loading}
            className="px-5 py-3 rounded-xl [background:var(--pf-primary)] text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40 hover:[background:var(--pf-primary-hover)] transition-colors">
            <Send size={14} />Gửi
          </button>
        </form>
      </div>
    </div>
  )
}
