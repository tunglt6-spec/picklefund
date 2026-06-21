import { useEffect } from 'react'
import { Bell, CheckCircle, DollarSign, Calendar, Users, AlertTriangle, Check, Receipt, BookOpen } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { useIsMobile } from '../../hooks/useIsMobile'
import { buildNotifications, buildHistory, type NotifType } from '../../lib/notifications'

const ICON: Record<NotifType, React.ReactNode> = {
  payment:  <DollarSign size={15} className="text-emerald-500" />,
  session:  <Calendar size={15} className="text-indigo-500" />,
  member:   <Users size={15} className="text-purple-500" />,
  expense:  <Receipt size={15} className="text-orange-500" />,
  period:   <BookOpen size={15} className="text-sky-500" />,
  warning:  <AlertTriangle size={15} className="text-amber-500" />,
}
const BG: Record<NotifType, string> = {
  payment: 'bg-emerald-50',
  session: 'bg-indigo-50',
  member:  'bg-purple-50',
  expense: 'bg-orange-50',
  period:  'bg-sky-50',
  warning: 'bg-amber-50',
}

function NotifCard({ n, read, onClick, mobile }: { n: { id: string; type: NotifType; title: string; body: string; time: string }; read: boolean; onClick?: () => void; mobile?: boolean }) {
  if (mobile) {
    return (
      <div onClick={onClick}
        className={`flex items-start gap-3 p-4 rounded-[16px] border shadow-sm cursor-pointer active:opacity-80
          ${read ? 'bg-white border-slate-100 opacity-60' : 'bg-white border-indigo-100'}`}>
        <div className={`h-9 w-9 rounded-[12px] ${BG[n.type]} flex items-center justify-center shrink-0`}>
          {ICON[n.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className={`text-[14px] font-[700] ${read ? 'text-slate-400' : 'text-slate-900'}`}>{n.title}</p>
            {!read && <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />}
          </div>
          <p className="text-[12px] text-slate-500 leading-relaxed">{n.body}</p>
          <p className="text-[11px] text-slate-400 mt-1">{n.time.slice(0, 10)}</p>
        </div>
        {read && <CheckCircle size={13} className="text-slate-300 shrink-0 mt-1" />}
      </div>
    )
  }
  return (
    <div onClick={onClick}
      className={`flex items-start gap-4 p-4 rounded-xl border transition-all
        ${onClick ? 'cursor-pointer' : ''}
        ${read ? 'bg-white border-slate-100 opacity-60' : 'bg-white border-indigo-100 shadow-[var(--shadow-card)]'}`}
    >
      <div className={`h-9 w-9 rounded-xl ${BG[n.type]} flex items-center justify-center shrink-0`}>
        {ICON[n.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className={`text-sm font-semibold ${read ? 'text-slate-400' : 'text-slate-900'}`}>{n.title}</p>
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
}

export function Notifications() {
  const isMobile = useIsMobile()
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { getClubData, markNotifRead, readNotifIds } = useClubDataStore()
  const data = getClubData(clubId)

  const readIds = new Set<string>(readNotifIds[clubId] ?? [])
  const actionNotifs = buildNotifications(data)
  const historyNotifs = buildHistory(data)

  // Auto-mark action items as read when page opens
  useEffect(() => {
    const unread = actionNotifs.filter(n => !readIds.has(n.id)).map(n => n.id)
    if (unread.length > 0) markNotifRead(clubId, unread)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId])

  const unreadCount = actionNotifs.filter(n => !readIds.has(n.id)).length

  const markAll = () => {
    markNotifRead(clubId, actionNotifs.map(n => n.id))
    toast.success('Đã đánh dấu tất cả là đã đọc')
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[17px] font-[800] text-slate-900">Thông báo</div>
            {unreadCount > 0
              ? <div className="text-[12px] text-slate-400">{unreadCount} cần xử lý</div>
              : <div className="text-[12px] text-slate-400">Tất cả đã đọc</div>
            }
          </div>
          {unreadCount > 0 && (
            <button onClick={markAll} className="flex items-center gap-1 text-[12px] font-[600] text-indigo-600 active:opacity-70">
              <Check size={13} />Đánh dấu đã đọc
            </button>
          )}
        </div>

        <div className="px-4 pt-4 pb-6 space-y-4">
          {/* Action items */}
          {actionNotifs.length > 0 && (
            <div>
              <p className="text-[11px] font-[700] text-slate-400 uppercase tracking-wider mb-2">Cần xử lý</p>
              <div className="space-y-2">
                {actionNotifs.map(n => (
                  <NotifCard key={n.id} n={n} read={readIds.has(n.id)} onClick={() => markNotifRead(clubId, [n.id])} mobile />
                ))}
              </div>
            </div>
          )}

          {/* History */}
          {historyNotifs.length > 0 && (
            <div>
              <p className="text-[11px] font-[700] text-slate-400 uppercase tracking-wider mb-2">Lịch sử hoạt động</p>
              <div className="space-y-2">
                {historyNotifs.map(n => (
                  <NotifCard key={n.id} n={n} read mobile />
                ))}
              </div>
            </div>
          )}

          {actionNotifs.length === 0 && historyNotifs.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-[14px]">Không có thông báo nào</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Thông báo"
        subtitle={unreadCount > 0 ? `${unreadCount} cần xử lý` : 'Tất cả đã đọc'}
        actions={
          unreadCount > 0
            ? <button onClick={markAll} className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                <Check size={14} />Đánh dấu tất cả đã đọc
              </button>
            : undefined
        }
      />

      <div className="p-6 max-w-[800px] mx-auto space-y-6">
        {/* Action items */}
        {actionNotifs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Cần xử lý</p>
            <div className="space-y-2">
              {actionNotifs.map(n => (
                <NotifCard key={n.id} n={n} read={readIds.has(n.id)} onClick={() => markNotifRead(clubId, [n.id])} />
              ))}
            </div>
          </div>
        )}

        {/* History timeline */}
        {historyNotifs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Lịch sử hoạt động</p>
            <div className="relative">
              <div className="absolute left-[22px] top-0 bottom-0 w-px bg-slate-100" />
              <div className="space-y-1">
                {historyNotifs.map(n => (
                  <div key={n.id} className="flex items-start gap-3 pl-2">
                    <div className={`relative z-10 h-9 w-9 rounded-xl ${BG[n.type]} flex items-center justify-center shrink-0`}>
                      {ICON[n.type]}
                    </div>
                    <div className="flex-1 py-2 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-700">{n.title}</p>
                        <p className="text-[11px] text-slate-400 shrink-0">{n.time.slice(0, 10)}</p>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{n.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {actionNotifs.length === 0 && historyNotifs.length === 0 && (
          <div className="py-16 text-center">
            <Bell size={36} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">Không có thông báo nào</p>
          </div>
        )}
      </div>
    </div>
  )
}
