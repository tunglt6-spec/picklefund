import { useEffect } from 'react'
import { Bell, CheckCircle, DollarSign, Calendar, Users, AlertTriangle, Check } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatDate } from '../../lib/utils'
import toast from 'react-hot-toast'
import { useIsMobile } from '../../hooks/useIsMobile'

type NotifType = 'payment' | 'session' | 'member' | 'system' | 'warning'

interface Notif {
  id: string
  type: NotifType
  title: string
  body: string
  time: string
  read: boolean
}

const ICON: Record<NotifType, React.ReactNode> = {
  payment: <DollarSign size={15} className="text-emerald-500" />,
  session: <Calendar size={15} className="text-indigo-500" />,
  member: <Users size={15} className="text-purple-500" />,
  system: <Bell size={15} className="text-slate-500" />,
  warning: <AlertTriangle size={15} className="text-amber-500" />,
}
const BG: Record<NotifType, string> = {
  payment: 'bg-emerald-50',
  session: 'bg-indigo-50',
  member: 'bg-purple-50',
  system: 'bg-slate-100',
  warning: 'bg-amber-50',
}

export function Notifications() {
  const isMobile = useIsMobile()
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { getClubData } = useClubDataStore()
  const data = getClubData(clubId)

  const { markNotifRead, readNotifIds } = useClubDataStore()
  const readIds = new Set<string>(readNotifIds[clubId] ?? [])

  const activePeriod = data.fundPeriods.find(p => p.status === 'active')
  const unpaid = data.contributions.filter(c => !c.isConfirmed)
  const upcoming = data.sessions.filter(s => s.status === 'scheduled')

  const today = new Date()
  const daysUntilEnd = activePeriod
    ? Math.ceil((new Date(activePeriod.endDate).getTime() - today.getTime()) / 86400000)
    : null

  const dynamicNotifs: Notif[] = [
    ...unpaid.slice(0, 3).map((c) => ({
      id: `pay-${c.id}`,
      type: 'payment' as NotifType,
      title: 'Khoản thu chờ xác nhận',
      body: `${c.member?.fullName ?? 'Thành viên'} đã đóng quỹ nhưng chưa được xác nhận.`,
      time: c.createdAt,
      read: false,
    })),
    ...upcoming.slice(0, 2).map((s) => ({
      id: `sess-${s.id}`,
      type: 'session' as NotifType,
      title: 'Buổi tập sắp diễn ra',
      body: `Buổi tập ngày ${formatDate(s.sessionDate)} tại ${s.courtName ?? 'sân'} – nhớ điểm danh.`,
      time: s.sessionDate,
      read: false,
    })),
    ...(activePeriod && daysUntilEnd !== null && daysUntilEnd <= 14 ? [{
      id: `warn-period-${activePeriod.id}`,
      type: 'warning' as NotifType,
      title: `Kỳ quỹ "${activePeriod.name}" sắp kết thúc`,
      body: daysUntilEnd <= 0
        ? `Kỳ quỹ đã kết thúc ngày ${formatDate(activePeriod.endDate)}. Vui lòng chốt sổ.`
        : `Còn ${daysUntilEnd} ngày đến ${formatDate(activePeriod.endDate)}. Vui lòng chốt sổ trước ngày này.`,
      time: activePeriod.endDate,
      read: false,
    }] : []),
    ...(data.members.filter(m => m.status === 'active').length === 0 ? [{
      id: 'warn-no-members',
      type: 'warning' as NotifType,
      title: 'Chưa có thành viên',
      body: 'CLB chưa có thành viên nào đang hoạt động. Hãy thêm thành viên để bắt đầu.',
      time: today.toISOString(),
      read: false,
    }] : []),
    ...(data.fundPeriods.length === 0 ? [{
      id: 'warn-no-period',
      type: 'warning' as NotifType,
      title: 'Chưa có kỳ quỹ',
      body: 'CLB chưa tạo kỳ quỹ nào. Hãy tạo kỳ quỹ để bắt đầu quản lý thu chi.',
      time: today.toISOString(),
      read: false,
    }] : []),
  ]

  // Auto-mark all as read when user opens this page
  useEffect(() => {
    const unread = dynamicNotifs.filter(n => !readIds.has(n.id)).map(n => n.id)
    if (unread.length > 0) markNotifRead(clubId, unread)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId])

  const isRead = (id: string, defaultRead: boolean) => readIds.has(id) || defaultRead
  const unreadCount = dynamicNotifs.filter(n => !isRead(n.id, n.read)).length

  const markAll = () => {
    markNotifRead(clubId, dynamicNotifs.map(n => n.id))
    toast.success('Đã đánh dấu tất cả là đã đọc')
  }

  const markOne = (id: string) => markNotifRead(clubId, [id])

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[17px] font-[800] text-slate-900">Thông báo</div>
            {unreadCount > 0 && <div className="text-[12px] text-slate-400">{unreadCount} chưa đọc</div>}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAll} className="flex items-center gap-1 text-[12px] font-[600] text-indigo-600 active:opacity-70">
              <Check size={13} />Đánh dấu đã đọc
            </button>
          )}
        </div>
        <div className="px-4 pt-4 pb-6 space-y-2">
          {dynamicNotifs.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-[14px]">Không có thông báo nào</div>
          )}
          {dynamicNotifs.map(n => {
            const read = isRead(n.id, n.read)
            return (
              <div key={n.id} onClick={() => markOne(n.id)}
                className={`flex items-start gap-3 p-4 rounded-[16px] border shadow-sm cursor-pointer active:opacity-80
                  ${read ? 'bg-white border-slate-100 opacity-70' : 'bg-white border-indigo-100'}`}>
                <div className={`h-9 w-9 rounded-[12px] ${BG[n.type]} flex items-center justify-center shrink-0`}>
                  {ICON[n.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`text-[14px] font-[700] ${read ? 'text-slate-500' : 'text-slate-900'}`}>{n.title}</p>
                    {!read && <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />}
                  </div>
                  <p className="text-[12px] text-slate-500 leading-relaxed">{n.body}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{n.time.slice(0, 10)}</p>
                </div>
                {read && <CheckCircle size={13} className="text-slate-300 shrink-0 mt-1" />}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Thông báo"
        subtitle={unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Tất cả đã đọc'}
        actions={
          unreadCount > 0
            ? <button onClick={markAll} className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                <Check size={14} />Đánh dấu tất cả đã đọc
              </button>
            : undefined
        }
      />

      <div className="p-6 max-w-[800px] mx-auto space-y-3">
        {dynamicNotifs.map(n => {
          const read = isRead(n.id, n.read)
          return (
            <div
              key={n.id}
              onClick={() => markOne(n.id)}
              className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all
                ${read ? 'bg-white border-slate-100 opacity-70' : 'bg-white border-indigo-100 shadow-[var(--shadow-card)]'}`}
            >
              <div className={`h-9 w-9 rounded-xl ${BG[n.type]} flex items-center justify-center shrink-0`}>
                {ICON[n.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className={`text-sm font-semibold ${read ? 'text-slate-500' : 'text-slate-900'}`}>{n.title}</p>
                  {!read && <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{n.body}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] text-slate-400">{n.time.slice(0, 10)}</p>
                {read && <CheckCircle size={13} className="text-slate-300 ml-auto mt-1" />}
              </div>
            </div>
          )
        })}

        {dynamicNotifs.length === 0 && (
          <div className="py-16 text-center">
            <Bell size={36} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">Không có thông báo nào</p>
          </div>
        )}
      </div>
    </div>
  )
}
