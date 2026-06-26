import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Sparkles, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import api from '../../lib/api'

type Message = { id: string; role: 'user' | 'lisa'; text: string; time: string }
type Brief = { greeting: string; paymentStatus: string; activitySummary: string; reminder: string | null; tips: string[] }

const SUGGESTIONS = [
  'Tôi đã đóng quỹ chưa?',
  'Tôi đã tham gia bao nhiêu buổi?',
  'Chi phí của tôi kỳ này là bao nhiêu?',
  'Có thông báo gì mới không?',
]

function now() {
  return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export function MemberLisaChat() {
  const { user } = useAuthStore()
  const isMobile = useIsMobile()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [brief, setBrief] = useState<Brief | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchBrief = useCallback(async () => {
    if (!user) return
    try {
      const res = await api.get('/lisa/brief')
      const data = res.data?.data ?? res.data
      setBrief(data)
      setMessages([{ id: 'welcome', role: 'lisa', text: data.greeting, time: now() }])
    } catch {
      setMessages([{
        id: 'welcome', role: 'lisa',
        text: `Xin chào${user?.username ? ` ${user.username}` : ''}! Tôi là Lisa, trợ lý AI cá nhân của bạn. Hỏi tôi bất cứ điều gì nhé!`,
        time: now(),
      }])
    }
  }, [user])

  useEffect(() => { fetchBrief() }, [fetchBrief])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: text.trim(), time: now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await api.post('/lisa/ask', { question: text.trim() })
      const data = res.data?.data ?? res.data
      setMessages(prev => [...prev, {
        id: `l-${Date.now()}`, role: 'lisa',
        text: data.answer ?? 'Xin lỗi, tôi không thể trả lời ngay lúc này.',
        time: now(),
      }])
    } catch {
      setMessages(prev => [...prev, { id: `l-err-${Date.now()}`, role: 'lisa', text: 'Có lỗi xảy ra. Vui lòng thử lại.', time: now() }])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input) }

  const chatContent = (
    <>
      {brief && messages.length <= 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Đóng quỹ</p>
            <p className="text-xs font-medium text-slate-700">{brief.paymentStatus}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Hoạt động</p>
            <p className="text-xs font-medium text-slate-700">{brief.activitySummary}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Gợi ý</p>
            <p className="text-xs font-medium text-slate-700">{brief.tips[0] ?? '—'}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {messages.map(m => (
          <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${m.role === 'lisa' ? 'bg-indigo-100' : 'bg-slate-100'}`}>
              {m.role === 'lisa' ? <Bot size={14} className="text-indigo-600" /> : <User size={14} className="text-slate-500" />}
            </div>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${m.role === 'lisa' ? 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm' : 'bg-indigo-600 text-white rounded-tr-sm'}`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
              <p className={`text-[10px] mt-1 ${m.role === 'lisa' ? 'text-slate-400' : 'text-indigo-200'}`}>{m.time}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
              <Bot size={14} className="text-indigo-600" />
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 2 && !loading && (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => sendMessage(s)}
              className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-sm">
              {s}
            </button>
          ))}
        </div>
      )}
    </>
  )

  if (isMobile) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
        {/* Header — fixed height */}
        <div className="shrink-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-sm">
              <Sparkles size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[15px] font-[800] text-slate-900">Lisa AI</p>
              <p className="text-[11px] text-emerald-500 font-medium">● Trợ lý cá nhân</p>
            </div>
          </div>
          <button onClick={fetchBrief} className="p-2 text-slate-400 active:opacity-60"><RefreshCw size={16} /></button>
        </div>

        {/* Messages — scrollable, fills remaining space */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 pb-2">{chatContent}</div>

        {/* Input — always visible at bottom */}
        <div className="shrink-0 bg-white border-t border-slate-100 px-4 py-3" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          <form onSubmit={handleSubmit} className="flex gap-2 items-center">
            <input value={input} onChange={e => setInput(e.target.value)}
              placeholder="Nhắn tin cho Lisa..."
              className="flex-1 text-sm bg-slate-100 rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-300" />
            <button type="submit" disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center disabled:opacity-40 active:opacity-70 shadow-sm">
              <Send size={15} className="text-white" />
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
            <Sparkles size={16} className="text-indigo-600" />
          </div>
          <div>
            <p className="font-bold text-slate-900">Lisa AI</p>
            <p className="text-xs text-emerald-500">● Trợ lý cá nhân thông minh</p>
          </div>
        </div>
        <button onClick={fetchBrief} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600">
          <RefreshCw size={13} />Làm mới
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 max-w-[760px] mx-auto w-full">{chatContent}</div>
      <div className="bg-white border-t border-slate-100 p-4 max-w-[760px] mx-auto w-full">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input value={input} onChange={e => setInput(e.target.value)}
            placeholder="Hỏi Lisa về tình trạng đóng quỹ, buổi tập, chi phí..."
            className="flex-1 text-sm bg-slate-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-200 transition-all" />
          <button type="submit" disabled={!input.trim() || loading}
            className="px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40 hover:bg-indigo-700 transition-colors">
            <Send size={14} />Gửi
          </button>
        </form>
      </div>
    </div>
  )
}
