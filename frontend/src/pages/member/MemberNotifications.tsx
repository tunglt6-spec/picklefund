import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing, DollarSign, Calendar, Users, AlertTriangle, Check, Brain, Zap } from 'lucide-react'
import { PageShell, PageHeader, LoadingState, EmptyState } from '../../components/shared'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useNotifStore } from '../../store/notifStore'
import { enablePush, syncPushIfGranted, sendTestPush, pushPermission } from '../../lib/push'

type HermesNotif = {
  id: string
  eventType: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  title: string
  body: string
  status: 'PENDING' | 'SENT' | 'READ' | 'FAILED'
  createdAt: string
  metadata?: { link?: string } | null
}

function eventIcon(eventType: string) {
  if (eventType.includes('payment') || eventType.includes('fund')) return <DollarSign size={14} className="[color:var(--pf-color-success)]" />
  if (eventType.includes('session') || eventType.includes('event')) return <Calendar size={14} className="[color:var(--pf-primary)]" />
  if (eventType.includes('member') || eventType.includes('inactivity')) return <Users size={14} className="[color:var(--pf-primary)]" />
  if (eventType.includes('anomaly') || eventType.includes('health')) return <AlertTriangle size={14} className="[color:var(--pf-color-warning)]" />
  if (eventType.includes('brief') || eventType.includes('report')) return <Brain size={14} className="[color:var(--pf-primary)]" />
  return <Zap size={14} className="[color:var(--pf-color-muted)]" />
}

function eventBg(eventType: string) {
  if (eventType.includes('payment') || eventType.includes('fund')) return '[background:var(--pf-color-success-soft)]'
  if (eventType.includes('session') || eventType.includes('event')) return '[background:var(--pf-primary-soft)]'
  if (eventType.includes('member') || eventType.includes('inactivity')) return '[background:var(--pf-primary-soft)]'
  if (eventType.includes('anomaly') || eventType.includes('health')) return '[background:var(--pf-color-warning-soft)]'
  return '[background:var(--pf-color-muted-soft)]'
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

export function MemberNotifications() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [notifs, setNotifs] = useState<HermesNotif[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const { setUnreadCount: setGlobalUnread, reset: resetGlobal } = useNotifStore()
  const [pushPerm, setPushPerm] = useState<NotificationPermission | 'unsupported'>('default')
  const [pushBusy, setPushBusy] = useState(false)

  useEffect(() => {
    setPushPerm(pushPermission())
    // Đã cấp quyền → đồng bộ lại subscription để chắc chắn nhận push trên thiết bị này.
    void syncPushIfGranted()
  }, [])

  const onEnablePush = async () => {
    setPushBusy(true)
    try {
      const r = await enablePush()
      if (r === 'ok') { toast.success('Đã bật thông báo trên thiết bị này'); setPushPerm('granted') }
      else if (r === 'denied') { toast.error('Bạn đã chặn quyền thông báo — hãy bật lại trong cài đặt trình duyệt'); setPushPerm('denied') }
      else if (r === 'no-key') toast.error('Máy chủ chưa bật thông báo đẩy (thiếu VAPID)')
      else if (r === 'unsupported') toast.error('Thiết bị/trình duyệt không hỗ trợ thông báo đẩy')
      else toast.error('Không bật được thông báo — thử lại')
    } finally {
      setPushBusy(false)
    }
  }

  const onTestPush = async () => {
    setPushBusy(true)
    try {
      const r = await sendTestPush()
      if (!r) { toast.error('Không gửi được thông báo thử'); return }
      if (r.devices === 0) toast.error('Chưa có thiết bị đăng ký — hãy bấm "Bật thông báo" trước')
      else if (r.sent > 0) toast.success(`Đã gửi tới ${r.sent} thiết bị — kiểm tra thông báo trên máy`)
      else toast.error(`Gửi thất bại (${r.errors[0] ?? 'lỗi'}). Thử bấm "Bật thông báo" lại.`)
    } finally {
      setPushBusy(false)
    }
  }

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
  }, [user, setGlobalUnread])

  useEffect(() => { fetchNotifs() }, [fetchNotifs])

  const handleRead = async (id: string) => {
    // Optimistic: đánh dấu đã đọc NGAY, rollback nếu API lỗi.
    const prevNotifs = notifs
    const prevUnread = unreadCount
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, status: 'READ' } : n))
    setUnreadCount(prev => {
      const next = Math.max(0, prev - 1)
      setGlobalUnread(Math.min(next, 9))
      return next
    })
    try {
      await api.patch(`/hermes/notifications/${id}/read`)
    } catch {
      setNotifs(prevNotifs)
      setUnreadCount(prevUnread)
      setGlobalUnread(Math.min(prevUnread, 9))
      toast.error('Không thể đánh dấu đã đọc — thử lại')
    }
  }

  const handleReadAll = async () => {
    // Optimistic: đánh dấu TẤT CẢ đã đọc ngay, rollback nếu lỗi.
    const prevNotifs = notifs
    const prevUnread = unreadCount
    setNotifs(prev => prev.map(n => ({ ...n, status: 'READ' as const })))
    setUnreadCount(0)
    resetGlobal()
    try {
      await api.post('/hermes/notifications/read-all')
      toast.success('Đã đánh dấu tất cả là đã đọc')
    } catch {
      setNotifs(prevNotifs)
      setUnreadCount(prevUnread)
      setGlobalUnread(Math.min(prevUnread, 9))
      toast.error('Không thể đánh dấu — thử lại')
    }
  }

  const unread = notifs.filter(n => n.status !== 'READ')
  const read = notifs.filter(n => n.status === 'READ')

  const openNotif = (n: HermesNotif) => {
    if (n.status !== 'READ') handleRead(n.id)
    const link = n.metadata?.link
    if (link) navigate(link)
  }

  const renderCard = (n: HermesNotif) => {
    const isRead = n.status === 'READ'
    return (
      <div key={n.id} onClick={() => openNotif(n)}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNotif(n) } }}
        className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-sm active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pf-primary)]
          ${isRead ? 'opacity-60 [border-color:var(--pf-border)]' : '[border-color:var(--pf-primary-soft)] shadow-sm'} [background:var(--pf-surface)]`}>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${eventBg(n.eventType)}`}>{eventIcon(n.eventType)}</div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <p className={`text-sm font-semibold ${isRead ? '[color:var(--pf-color-muted)]' : '[color:var(--pf-text)]'}`}>{n.title}</p>
            {!isRead && <span className="h-2 w-2 shrink-0 rounded-full [background:var(--pf-primary)]" />}
          </div>
          <p className="text-xs leading-relaxed [color:var(--pf-color-muted)]">{n.body}</p>
          <p className="mt-1 text-[11px] [color:var(--pf-color-muted)]">{timeAgo(n.createdAt)}</p>
        </div>
      </div>
    )
  }

  return (
    <PageShell maxWidth={900}>
      <PageHeader
        title="Thông báo"
        subtitle={unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Tất cả đã đọc'}
        actions={
          <div className="flex items-center gap-2">
            {pushPerm !== 'unsupported' && pushPerm !== 'granted' && (
              <button onClick={onEnablePush} disabled={pushBusy}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white disabled:opacity-60 [background:var(--pf-primary)]">
                <BellRing size={14} />{pushBusy ? 'Đang bật…' : 'Bật thông báo trên điện thoại'}
              </button>
            )}
            {pushPerm === 'granted' && (
              <>
                <span className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold [color:var(--pf-color-success)]">
                  <BellRing size={14} /> Đã bật
                </span>
                <button onClick={onTestPush} disabled={pushBusy}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold disabled:opacity-60 [color:var(--pf-primary)] border-[color:var(--pf-border)] hover:[background:var(--pf-primary-soft)]">
                  {pushBusy ? 'Đang gửi…' : 'Gửi thử'}
                </button>
              </>
            )}
            {unreadCount > 0 && (
              <button onClick={handleReadAll} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold [color:var(--pf-primary)] hover:[background:var(--pf-primary-soft)]">
                <Check size={14} />Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
        }
      />

      {loading ? (
        <LoadingState />
      ) : notifs.length === 0 ? (
        <EmptyState icon={<Bell size={24} />} title="Không có thông báo nào" description="Các thông báo từ CLB sẽ hiển thị tại đây." />
      ) : (
        <div className="flex flex-col gap-6">
          {unread.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider [color:var(--pf-color-muted)]">Chưa đọc</p>
              <div className="flex flex-col gap-2">{unread.map(renderCard)}</div>
            </div>
          )}
          {read.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider [color:var(--pf-color-muted)]">Đã đọc</p>
              <div className="flex flex-col gap-2">{read.map(renderCard)}</div>
            </div>
          )}
        </div>
      )}
    </PageShell>
  )
}
