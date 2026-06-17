import { useState, useEffect } from 'react'
import { Bell, CheckCircle, DollarSign, Calendar, Users, AlertTriangle, Check } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatDate } from '../../lib/utils'
import toast from 'react-hot-toast'

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
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? 'club-1'
  const { getClubData } = useClubDataStore()
  const data = getClubData(clubId)

  const activePeriod = data.fundPeriods.find(p => p.status === 'active')
  const unpaid = data.contributions.filter(c => !c.isConfirmed)
  const upcoming = data.sessions.filter(s => s.status === 'scheduled')

  // Generate dynamic notifications from store state + static ones
  const STORAGE_KEY = `notif-read-${clubId}`
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>()
    } catch { return new Set<string>() }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...readIds])) } catch {}
  }, [readIds, STORAGE_KEY])

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
    {
      id: 'sys-1',
      type: 'system',
      title: 'Hệ thống cập nhật',
      body: 'PickleFund v2.1 ra mắt với giao diện mới và tính năng báo cáo nâng cao.',
      time: '2026-06-10T08:00:00Z',
      read: true,
    },
    {
      id: 'warn-1',
      type: 'warning',
      title: activePeriod ? `Kỳ quỹ ${activePeriod.name} sắp kết thúc` : 'Cảnh báo kỳ quỹ',
      body: activePeriod ? `Kỳ quỹ ${activePeriod.name} kết thúc ngày ${formatDate(activePeriod.endDate)}. Vui lòng chốt sổ trước ngày này.` : 'Không có kỳ quỹ đang mở.',
      time: '2026-06-12T10:00:00Z',
      read: false,
    },
    {
      id: 'mem-1',
      type: 'member',
      title: 'Thành viên mới tham gia',
      body: `CLB có ${data.members.filter(m => m.status === 'active').length} thành viên đang hoạt động trong kỳ này.`,
      time: '2026-06-08T09:00:00Z',
      read: true,
    },
  ]

  const isRead = (id: string, defaultRead: boolean) => readIds.has(id) || defaultRead
  const unreadCount = dynamicNotifs.filter(n => !isRead(n.id, n.read)).length

  const markAll = () => {
    setReadIds(new Set(dynamicNotifs.map(n => n.id)))
    toast.success('Đã đánh dấu tất cả là đã đọc')
  }

  const markOne = (id: string) => setReadIds(prev => new Set([...prev, id]))

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
