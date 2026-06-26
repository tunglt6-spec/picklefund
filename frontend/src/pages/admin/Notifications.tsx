import { useState, useEffect, useCallback } from 'react'
import { Bell, DollarSign, Calendar, Users, AlertTriangle, Check, Receipt, Brain, Zap } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { useIsMobile } from '../../hooks/useIsMobile'
import api from '../../lib/api'
import { useNotifStore } from '../../store/notifStore'

type HermesNotif = {
  id: string
  eventType: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  channel: string
  title: string
  body: string
  status: 'PENDING' | 'SENT' | 'READ' | 'FAILED'
  createdAt: string
}

function eventIcon(eventType: string) {
  if (eventType.includes('payment') || eventType.includes('fund')) return <DollarSign size={15} className="text-emerald-500" />
  if (eventType.includes('session') || eventType.includes('event')) return <Calendar size={15} className="text-indigo-500" />
  if (eventType.includes('member') || eventType.includes('inactivity')) return <Users size={15} className="text-purple-500" />
  if (eventType.includes('anomaly') || eventType.includes('health')) return <AlertTriangle size={15} className="text-amber-500" />
  if (eventType.includes('brief') || eventType.includes('report')) return <Brain size={15} className="text-indigo-500" />
  if (eventType.includes('reminder')) return <Receipt size={15} className="text-orange-500" />
  return <Zap size={15} className="text-slate-400" />
}

function eventBg(eventType: string) {
  if (eventType.includes('payment') || eventType.includes('fund')) return 'bg-emerald-50'
  if (eventType.includes('session') || eventType.includes('event')) return 'bg-indigo-50'
  if (eventType.includes('member') || eventType.includes('inactivity')) return 'bg-purple-50'
  if (eventType.includes('anomaly') || eventType.includes('health')) return 'bg-amber-50'
  if (eventType.includes('brief') || eventType.includes('report')) return 'bg-indigo-50'
  return 'bg-slate-50'
}

function priorityBadge(priority: string) {
  if (priority === 'HIGH') return <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">Khẩn</span>
  if (priority === 'MEDIUM') return <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Quan trọng</span>
  return null
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Vừa xong'
  if (m < 60) return `${m} phút trước`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} giờ trước`
  return new Date(dateStr).toLocaleDateString('vi-VN')
}

function NotifCard({ n, onRead, mobile }: { n: HermesNotif; onRead: (id: string) => void; mobile?: boolean }) {
  const isRead = n.status === 'READ'
  const bg = eventBg(n.eventType)
  const icon = eventIcon(n.eventType)

  if (mobile) {
    return (
      <div onClick={() => !isRead && onRead(n.id)}
        className={`flex items-start gap-3 p-4 rounded-[16px] border shadow-sm cursor-pointer active:opacity-80
          ${isRead ? 'bg-white border-slate-100 opacity-60' : 'bg-white border-indigo-100'}`}>
        <div className={`h-9 w-9 rounded-[12px] ${bg} flex items-center justify-center shrink-0`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className={`text-[14px] font-[700] ${isRead ? 'text-slate-400' : 'text-slate-900'}`}>{n.title}</p>
            {!isRead && <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />}
            {priorityBadge(n.priority)}
          </div>
          <p className="text-[12px] text-slate-500 leading-relaxed">{n.body}</p>
          <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
        </div>
      </div>
    )
  }

  return (
    <div onClick={() => !isRead && onRead(n.id)}
      className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:shadow-sm
        ${isRead ? 'bg-white border-slate-100 opacity-60' : 'bg-white border-indigo-100 shadow-sm'}`}>
      <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className={`text-sm font-semibold ${isRead ? 'text-slate-400' : 'text-slate-900'}`}>{n.title}</p>
          {!isRead && <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />}
          {priorityBadge(n.priority)}
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{n.body}</p>
      </div>
      <p className="text-[11px] text-slate-400 shrink-0">{timeAgo(n.createdAt)}</p>
    </div>
  )
}

export function Notifications() {
  const isMobile = useIsMobile()
  const { user } = useAuthStore()
  const [notifs, setNotifs] = useState<HermesNotif[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const { setUnreadCount: setGlobalUnread, reset: resetGlobal } = useNotifStore()

  const fetchNotifs = useCallback(async () => {
    if (!user) return
    try {
      const res = await api.get('/hermes/notifications?limit=50')
      const data = res.data?.data ?? res.data
      setNotifs(data?.items ?? data?.notifications ?? [])
      const cnt = data?.unreadCount ?? 0
      setUnreadCount(cnt)
      setGlobalUnread(Math.min(cnt, 9))
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchNotifs() }, [fetchNotifs])

  const handleRead = async (id: string) => {
    try {
      await api.patch(`/hermes/notifications/${id}/read`)
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, status: 'READ' } : n))
      setUnreadCount(prev => {
        const next = Math.max(0, prev - 1)
        setGlobalUnread(Math.min(next, 9))
        return next
      })
    } catch { /* silent */ }
  }

  const handleReadAll = async () => {
    try {
      await api.post('/hermes/notifications/read-all')
      setNotifs(prev => prev.map(n => ({ ...n, status: 'READ' as const })))
      setUnreadCount(0)
      resetGlobal()
      toast.success('Đã đánh dấu tất cả là đã đọc')
    } catch { /* silent */ }
  }

  const unread = notifs.filter(n => n.status !== 'READ')
  const read = notifs.filter(n => n.status === 'READ')

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[17px] font-[800] text-slate-900">Thông báo</div>
            <div className="text-[12px] text-slate-400">{unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Tất cả đã đọc'}</div>
          </div>
          {unreadCount > 0 && (
            <button onClick={handleReadAll} className="flex items-center gap-1 text-[12px] font-[600] text-indigo-600 active:opacity-70">
              <Check size={13} />Đánh dấu đã đọc
            </button>
          )}
        </div>

        <div className="px-4 pt-4 pb-24 space-y-4">
          {loading && <p className="text-center text-sm text-slate-400 py-8">Đang tải...</p>}

          {!loading && unread.length > 0 && (
            <div>
              <p className="text-[11px] font-[700] text-slate-400 uppercase tracking-wider mb-2">Chưa đọc</p>
              <div className="space-y-2">
                {unread.map(n => <NotifCard key={n.id} n={n} onRead={handleRead} mobile />)}
              </div>
            </div>
          )}

          {!loading && read.length > 0 && (
            <div>
              <p className="text-[11px] font-[700] text-slate-400 uppercase tracking-wider mb-2">Đã đọc</p>
              <div className="space-y-2">
                {read.map(n => <NotifCard key={n.id} n={n} onRead={handleRead} mobile />)}
              </div>
            </div>
          )}

          {!loading && notifs.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-[14px]">
              <Bell size={32} className="mx-auto mb-3 text-slate-200" />
              Không có thông báo nào
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Thông báo"
        subtitle={unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Tất cả đã đọc'}
        actions={
          unreadCount > 0
            ? <button onClick={handleReadAll} className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800">
                <Check size={14} />Đánh dấu tất cả đã đọc
              </button>
            : undefined
        }
      />

      <div className="p-6 max-w-[800px] mx-auto space-y-6">
        {loading && <p className="text-center text-sm text-slate-400 py-8">Đang tải...</p>}

        {!loading && unread.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Chưa đọc</p>
            <div className="space-y-2">
              {unread.map(n => <NotifCard key={n.id} n={n} onRead={handleRead} />)}
            </div>
          </div>
        )}

        {!loading && read.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Đã đọc</p>
            <div className="space-y-2">
              {read.map(n => <NotifCard key={n.id} n={n} onRead={handleRead} />)}
            </div>
          </div>
        )}

        {!loading && notifs.length === 0 && (
          <div className="py-16 text-center">
            <Bell size={36} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">Không có thông báo nào</p>
          </div>
        )}
      </div>
    </div>
  )
}
