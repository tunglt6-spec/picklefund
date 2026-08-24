import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, DollarSign, Calendar, Users, AlertTriangle, Check, Receipt, Brain, Zap, Inbox, Settings, Megaphone } from 'lucide-react'
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
  metadata?: { link?: string } | null
}

function eventIcon(eventType: string) {
  if (eventType.includes('payment') || eventType.includes('fund')) return <DollarSign size={15} className="text-emerald-500" />
  if (eventType.includes('session') || eventType.includes('event')) return <Calendar size={15} className="[color:var(--pf-primary)]" />
  if (eventType.includes('member') || eventType.includes('inactivity')) return <Users size={15} className="[color:var(--pf-primary)]" />
  if (eventType.includes('anomaly') || eventType.includes('health')) return <AlertTriangle size={15} className="text-amber-500" />
  if (eventType.includes('brief') || eventType.includes('report')) return <Brain size={15} className="[color:var(--pf-primary)]" />
  if (eventType.includes('reminder')) return <Receipt size={15} className="text-orange-500" />
  return <Zap size={15} className="[color:var(--pf-color-muted)]" />
}

function eventBg(eventType: string) {
  if (eventType.includes('payment') || eventType.includes('fund')) return 'bg-emerald-50'
  if (eventType.includes('session') || eventType.includes('event')) return '[background:var(--pf-primary-soft)]'
  if (eventType.includes('member') || eventType.includes('inactivity')) return '[background:var(--pf-primary-soft)]'
  if (eventType.includes('anomaly') || eventType.includes('health')) return 'bg-amber-50'
  if (eventType.includes('brief') || eventType.includes('report')) return '[background:var(--pf-primary-soft)]'
  return '[background:var(--pf-surface-muted)]'
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

function NotifCard({ n, onOpen, mobile }: { n: HermesNotif; onOpen: (n: HermesNotif) => void; mobile?: boolean }) {
  const isRead = n.status === 'READ'
  const bg = eventBg(n.eventType)
  const icon = eventIcon(n.eventType)

  if (mobile) {
    return (
      <div onClick={() => onOpen(n)}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(n) } }}
        className={`flex items-start gap-3 p-4 rounded-[16px] border shadow-sm cursor-pointer active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pf-primary)]
          ${isRead ? '[background:var(--pf-surface)] border-[color:var(--pf-border)] opacity-60' : '[background:var(--pf-surface)] [border-color:var(--pf-primary-soft)]'}`}>
        <div className={`h-9 w-9 rounded-[12px] ${bg} flex items-center justify-center shrink-0`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className={`text-[14px] font-[700] ${isRead ? '[color:var(--pf-color-muted)]' : '[color:var(--pf-text)]'}`}>{n.title}</p>
            {!isRead && <span className="h-2 w-2 rounded-full [background:var(--pf-primary)] shrink-0" />}
            {priorityBadge(n.priority)}
          </div>
          <p className="text-[12px] [color:var(--pf-color-muted)] leading-relaxed">{n.body}</p>
          <p className="text-[11px] [color:var(--pf-color-muted)] mt-1">{timeAgo(n.createdAt)}</p>
        </div>
      </div>
    )
  }

  return (
    <div onClick={() => onOpen(n)}
      role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(n) } }}
      className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pf-primary)]
        ${isRead ? '[background:var(--pf-surface)] border-[color:var(--pf-border)] opacity-60' : '[background:var(--pf-surface)] [border-color:var(--pf-primary-soft)] shadow-sm'}`}>
      <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className={`text-sm font-semibold ${isRead ? '[color:var(--pf-color-muted)]' : '[color:var(--pf-text)]'}`}>{n.title}</p>
          {!isRead && <span className="h-2 w-2 rounded-full [background:var(--pf-primary)] shrink-0" />}
          {priorityBadge(n.priority)}
        </div>
        <p className="text-xs [color:var(--pf-color-muted)] leading-relaxed">{n.body}</p>
      </div>
      <p className="text-[11px] [color:var(--pf-color-muted)] shrink-0">{timeAgo(n.createdAt)}</p>
    </div>
  )
}

type TabKey = 'all' | 'unread' | 'notice' | 'system' | 'ai'
const TABS: [TabKey, string][] = [
  ['all', 'Tất cả'],
  ['unread', 'Chưa đọc'],
  ['notice', 'Thông báo'],
  ['system', 'Hệ thống'],
  ['ai', 'AI đề xuất'],
]
/** Phân loại notification theo eventType → tab. */
function catOf(eventType: string): 'notice' | 'system' | 'ai' {
  const s = (eventType || '').toLowerCase()
  if (/brief|report|maika|insight|suggest|recommend|\bai\b/.test(s)) return 'ai'
  if (/anomaly|health|system|config|error/.test(s)) return 'system'
  return 'notice'
}

/** Icon cho từng bộ lọc (dùng ở KPI dọc desktop). */
function filterIcon(key: TabKey) {
  switch (key) {
    case 'all': return <Inbox size={18} />
    case 'unread': return <Bell size={18} />
    case 'notice': return <Megaphone size={18} />
    case 'system': return <Settings size={18} />
    case 'ai': return <Brain size={18} />
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

export function Notifications() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
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

  const handleOpen = (n: HermesNotif) => {
    if (n.status !== 'READ') handleRead(n.id)
    const link = n.metadata?.link
    if (link) navigate(link)
  }

  const handleRead = async (id: string) => {
    // Optimistic: đánh dấu đã đọc NGAY (UI tức thì), rollback nếu API lỗi.
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

  // Số đếm cho 5 KPI-lọc (dùng chung desktop + mobile).
  const counts: Record<TabKey, number> = {
    all: notifs.length,
    unread: notifs.filter(n => n.status !== 'READ').length,
    notice: notifs.filter(n => catOf(n.eventType) === 'notice').length,
    system: notifs.filter(n => catOf(n.eventType) === 'system').length,
    ai: notifs.filter(n => catOf(n.eventType) === 'ai').length,
  }

  if (isMobile) {
    return (
      <div className="min-h-full [background:var(--pf-bg)]">
        <div className="sticky top-0 z-20 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[17px] font-[800] [color:var(--pf-text)]">Thông báo</div>
            <div className="text-[12px] [color:var(--pf-color-muted)]">{unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Tất cả đã đọc'}</div>
          </div>
          {unreadCount > 0 && (
            <button onClick={handleReadAll} className="flex items-center gap-1 text-[12px] font-[600] [color:var(--pf-primary)] active:opacity-70">
              <Check size={13} />Đánh dấu đã đọc
            </button>
          )}
        </div>

        <div className="px-4 pt-3 pb-24 space-y-4">
          <FilterKpiList tab={tab} counts={counts} onChange={setTab} />
          {loading && <p className="text-center text-sm [color:var(--pf-color-muted)] py-8">Đang tải...</p>}

          {!loading && unread.length > 0 && (
            <div>
              <p className="text-[11px] font-[700] [color:var(--pf-color-muted)] uppercase tracking-wider mb-2">Chưa đọc</p>
              <div className="space-y-2">
                {unread.map(n => <NotifCard key={n.id} n={n} onOpen={handleOpen} mobile />)}
              </div>
            </div>
          )}

          {!loading && read.length > 0 && (
            <div>
              <p className="text-[11px] font-[700] [color:var(--pf-color-muted)] uppercase tracking-wider mb-2">Đã đọc</p>
              <div className="space-y-2">
                {read.map(n => <NotifCard key={n.id} n={n} onOpen={handleOpen} mobile />)}
              </div>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 [color:var(--pf-color-muted)] text-[14px]">
              <Bell size={32} className="mx-auto mb-3 [color:var(--pf-color-muted)]" />
              Không có thông báo trong mục này
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto [background:var(--pf-surface-muted)]">
      <PageHeader
        title="Thông báo"
        subtitle={unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Tất cả đã đọc'}
        actions={
          unreadCount > 0
            ? <button onClick={handleReadAll} className="flex items-center gap-1.5 text-xs font-medium [color:var(--pf-primary)] hover:[color:var(--pf-primary)]">
                <Check size={14} />Đánh dấu tất cả đã đọc
              </button>
            : undefined
        }
      />

      <div className="p-6 pf-center-x w-full" style={{ maxWidth: 1600 }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* CỘT TRÁI — 5 KPI-lọc xếp DỌC, bề ngang cố định, sát lề trái */}
          <div className="lg:w-[260px] lg:shrink-0">
            <FilterKpiList tab={tab} counts={counts} onChange={setTab} />
          </div>

          {/* CỘT PHẢI — danh sách thông báo 1 CỘT, mở rộng hết phần còn lại */}
          <div className="min-w-0 flex-1 space-y-5">
            {loading && <p className="text-center text-sm [color:var(--pf-color-muted)] py-8">Đang tải...</p>}

            {!loading && unread.length > 0 && (
              <div>
                <p className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wider mb-3">Chưa đọc</p>
                <div className="space-y-2">
                  {unread.map(n => <NotifCard key={n.id} n={n} onOpen={handleOpen} />)}
                </div>
              </div>
            )}

            {!loading && read.length > 0 && (
              <div>
                <p className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wider mb-3">Đã đọc</p>
                <div className="space-y-2">
                  {read.map(n => <NotifCard key={n.id} n={n} onOpen={handleOpen} />)}
                </div>
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="py-16 text-center">
                <Bell size={36} className="mx-auto [color:var(--pf-color-muted)] mb-3" />
                <p className="text-sm [color:var(--pf-color-muted)]">Không có thông báo trong mục này</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
