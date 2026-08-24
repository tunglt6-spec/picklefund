import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing, DollarSign, Calendar, Users, AlertTriangle, Check, Brain, Zap, Settings, Inbox, Megaphone } from 'lucide-react'
import { PageShell, PageHeader, LoadingState, EmptyState } from '../../components/shared'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useNotifStore } from '../../store/notifStore'
import { enablePush, syncPushIfGranted, sendTestPush, pushPermission } from '../../lib/push'
import { NotificationSettingsModal } from '../../components/member/NotificationSettingsModal'

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

type TabKey = 'all' | 'unread' | 'community' | 'finance' | 'activity'
const TABS: [TabKey, string][] = [
  ['all', 'Tất cả'],
  ['unread', 'Chưa đọc'],
  ['community', 'Cộng đồng'],
  ['finance', 'Tài chính'],
  ['activity', 'Hoạt động'],
]
/**
 * Phân loại thông báo của MEMBER theo eventType. Member CHỈ nhận các nhóm dưới đây —
 * KHÔNG nhận nhóm "Hệ thống" (anomaly/health) hay "AI đề xuất" (daily_brief/weekly_report)
 * vì theo EVENT_RECIPIENTS các nhóm đó chỉ gửi cho CLUB_ADMIN/CLUB_TREASURER.
 *  - Cộng đồng: community_* (bài đăng/bình luận/@mention/phản hồi), matchmaking (tìm kèo)
 *  - Tài chính: payment_* (báo nộp/xác nhận/kiểm tra lại), fund
 *  - Hoạt động: nhắc buổi tập, đăng ký, không hoạt động, ...
 */
function catOf(eventType: string): 'community' | 'finance' | 'activity' {
  const s = (eventType || '').toLowerCase()
  if (s.includes('community') || s.includes('matchmaking')) return 'community'
  if (s.includes('payment') || s.includes('fund')) return 'finance'
  return 'activity'
}
function filterIcon(key: TabKey) {
  switch (key) {
    case 'all': return <Inbox size={18} />
    case 'unread': return <Bell size={18} />
    case 'community': return <Megaphone size={18} />
    case 'finance': return <DollarSign size={18} />
    case 'activity': return <Calendar size={18} />
  }
}

/** 1 thẻ KPI-lọc (dọc): icon + nhãn + số đếm; bấm để lọc. Dùng CHUNG desktop + mobile. */
function FilterKpi({ active, label, icon, count, onClick }: {
  active: boolean; label: string; icon: ReactNode; count: number; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-all active:scale-[0.99]"
      style={active
        ? { background: 'var(--pf-primary-soft)', borderColor: 'var(--pf-primary)' }
        : { background: 'var(--pf-surface)', borderColor: 'var(--pf-border)' }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={active
          ? { background: 'var(--pf-primary)', color: 'var(--pf-primary-on)' }
          : { background: 'var(--pf-color-muted-soft)', color: 'var(--pf-color-muted)' }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-sm font-semibold" style={{ color: active ? 'var(--pf-primary)' : 'var(--pf-text)' }}>
        {label}
      </span>
      <span
        className="rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums"
        style={active
          ? { background: 'var(--pf-primary)', color: 'var(--pf-primary-on)' }
          : { background: 'var(--pf-color-muted-soft)', color: 'var(--pf-color-muted)' }}
      >
        {count}
      </span>
    </button>
  )
}

/** 5 KPI-lọc xếp DỌC (1 cột). */
function FilterKpiList({ tab, counts, onChange }: {
  tab: TabKey; counts: Record<TabKey, number>; onChange: (t: TabKey) => void
}) {
  return (
    <div className="space-y-2.5">
      {TABS.map(([k, l]) => (
        <FilterKpi key={k} active={tab === k} label={l} icon={filterIcon(k)} count={counts[k]} onClick={() => onChange(k)} />
      ))}
    </div>
  )
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
  const [settingsOpen, setSettingsOpen] = useState(false)

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

  const [tab, setTab] = useState<TabKey>('all')
  const filtered = notifs.filter(n =>
    tab === 'all' ? true
    : tab === 'unread' ? n.status !== 'READ'
    : catOf(n.eventType) === tab,
  )
  const unread = filtered.filter(n => n.status !== 'READ')
  const read = filtered.filter(n => n.status === 'READ')
  const counts: Record<TabKey, number> = {
    all: notifs.length,
    unread: notifs.filter(n => n.status !== 'READ').length,
    community: notifs.filter(n => catOf(n.eventType) === 'community').length,
    finance: notifs.filter(n => catOf(n.eventType) === 'finance').length,
    activity: notifs.filter(n => catOf(n.eventType) === 'activity').length,
  }

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
    <PageShell>
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
            <button onClick={() => setSettingsOpen(true)} aria-label="Cài đặt thông báo"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg [color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)] hover:[color:var(--pf-text)]">
              <Settings size={16} />
            </button>
          </div>
        }
      />

      <NotificationSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {loading ? (
        <LoadingState />
      ) : notifs.length === 0 ? (
        <EmptyState icon={<Bell size={24} />} title="Không có thông báo nào" description="Các thông báo từ CLB sẽ hiển thị tại đây." />
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* CỘT TRÁI — 5 KPI-lọc xếp DỌC, bề ngang cố định, sát lề trái */}
          <div className="lg:w-[260px] lg:shrink-0">
            <FilterKpiList tab={tab} counts={counts} onChange={setTab} />
          </div>

          {/* CỘT PHẢI — danh sách thông báo 1 CỘT, mở rộng hết phần còn lại */}
          <div className="flex min-w-0 flex-1 flex-col gap-6">
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
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <Bell size={32} className="mx-auto mb-3 [color:var(--pf-color-muted)]" />
                <p className="text-sm [color:var(--pf-color-muted)]">Không có thông báo trong mục này</p>
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  )
}
