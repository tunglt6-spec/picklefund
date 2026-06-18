import { useState, useEffect } from 'react'
import { DollarSign, Calendar, Info, Check } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatDate, formatVND } from '../../lib/utils'
import toast from 'react-hot-toast'
import { useIsMobile } from '../../hooks/useIsMobile'

type NotifType = 'payment' | 'session' | 'info'
const ICON: Record<NotifType, React.ReactNode> = {
  payment: <DollarSign size={14} className="text-emerald-500" />,
  session: <Calendar size={14} className="text-indigo-500" />,
  info: <Info size={14} className="text-slate-500" />,
}
const BG: Record<NotifType, string> = {
  payment: 'bg-emerald-50',
  session: 'bg-indigo-50',
  info: 'bg-slate-100',
}

export function MemberNotifications() {
  const isMobile = useIsMobile()
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? 'club-1'
  const memberId = user?.memberId ?? 'mem-1'
  const { getClubData } = useClubDataStore()
  const data = getClubData(clubId)

  const activePeriod = data.fundPeriods.find(p => p.status === 'active')
  const myContrib = data.contributions.find(c => c.memberId === memberId && (!activePeriod || c.fundPeriodId === activePeriod.id))
  const upcoming = data.sessions.filter(s => s.status === 'scheduled').slice(0, 2)
  const STORAGE_KEY = `notif-read-member-${clubId}`
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>()
    } catch { return new Set<string>() }
  })
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...readIds])) } catch {}
  }, [readIds, STORAGE_KEY])

  const notifs = [
    myContrib
      ? {
          id: 'pay-confirm',
          type: 'payment' as NotifType,
          title: myContrib.isConfirmed ? 'Đóng quỹ đã được xác nhận' : 'Đóng quỹ đang chờ xác nhận',
          body: myContrib.isConfirmed
            ? `Khoản đóng ${formatVND(myContrib.amount)} của bạn đã được thủ quỹ xác nhận.`
            : `Khoản đóng ${formatVND(myContrib.amount)} đang chờ thủ quỹ xác nhận. Vui lòng kiên nhẫn.`,
          time: myContrib.paymentDate,
          read: myContrib.isConfirmed,
        }
      : {
          id: 'pay-due',
          type: 'payment' as NotifType,
          title: 'Nhắc đóng quỹ',
          body: activePeriod
            ? `Bạn chưa đóng quỹ kỳ ${activePeriod.name}. Mức đóng: ${formatVND(activePeriod.contributionAmount ?? 1000000)}.`
            : 'Không có kỳ quỹ nào đang mở.',
          time: new Date().toISOString().slice(0, 10),
          read: false,
        },
    ...upcoming.map(s => ({
      id: `sess-${s.id}`,
      type: 'session' as NotifType,
      title: 'Buổi tập sắp diễn ra',
      body: `Buổi tập ngày ${formatDate(s.sessionDate)} tại ${s.courtName ?? 'sân'}. Nhớ tham gia và điểm danh!`,
      time: s.sessionDate,
      read: false,
    })),
    {
      id: 'info-1',
      type: 'info' as NotifType,
      title: 'Chào mừng đến PickleFund!',
      body: 'Bạn có thể xem lịch sử đóng quỹ, lịch tham gia và phiếu thu cá nhân trong menu bên trái.',
      time: '2026-04-01',
      read: true,
    },
  ]

  const isRead = (id: string, def: boolean) => readIds.has(id) || def
  const unreadCount = notifs.filter(n => !isRead(n.id, n.read)).length

  const markAll = () => {
    setReadIds(new Set(notifs.map(n => n.id)))
    toast.success('Đã đánh dấu tất cả là đã đọc')
  }

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
          {notifs.map(n => {
            const read = isRead(n.id, n.read)
            return (
              <div key={n.id} onClick={() => setReadIds(prev => new Set([...prev, n.id]))}
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
            ? <button onClick={markAll} className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800">
                <Check size={14} />Đánh dấu đã đọc
              </button>
            : undefined
        }
      />

      <div className="p-6 max-w-[700px] mx-auto space-y-3">
        {notifs.map(n => {
          const read = isRead(n.id, n.read)
          return (
            <div
              key={n.id}
              onClick={() => setReadIds(prev => new Set([...prev, n.id]))}
              className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all
                ${read ? 'bg-white border-slate-100 opacity-70' : 'bg-white border-indigo-100 shadow-[var(--shadow-card)]'}`}
            >
              <div className={`h-8 w-8 rounded-xl ${BG[n.type]} flex items-center justify-center shrink-0`}>
                {ICON[n.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className={`text-sm font-semibold ${read ? 'text-slate-500' : 'text-slate-900'}`}>{n.title}</p>
                  {!read && <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{n.body}</p>
              </div>
              <p className="text-[11px] text-slate-400 shrink-0">{n.time.slice(0, 10)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
