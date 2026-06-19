import { useState, useEffect } from 'react'
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

  const today = new Date()
  const daysUntilEnd = activePeriod
    ? Math.ceil((new Date(activePeriod.endDate).getTime() - today.getTime()) / 86400000)
    : null

  const dynamicNotifs: Notif[] = [
    ...unpaid.slice(0, 3).map((c) => ({
      id: `pay-${c.id}`,
      type: 'payment' as NotifType,
      title: 'Khoáº£n thu chá» xÃ¡c nháº­n',
      body: `${c.member?.fullName ?? 'ThÃ nh viÃªn'} Ä‘Ã£ Ä‘Ã³ng quá»¹ nhÆ°ng chÆ°a Ä‘Æ°á»£c xÃ¡c nháº­n.`,
      time: c.createdAt,
      read: false,
    })),
    ...upcoming.slice(0, 2).map((s) => ({
      id: `sess-${s.id}`,
      type: 'session' as NotifType,
      title: 'Buá»•i táº­p sáº¯p diá»…n ra',
      body: `Buá»•i táº­p ngÃ y ${formatDate(s.sessionDate)} táº¡i ${s.courtName ?? 'sÃ¢n'} â€“ nhá»› Ä‘iá»ƒm danh.`,
      time: s.sessionDate,
      read: false,
    })),
    ...(activePeriod && daysUntilEnd !== null && daysUntilEnd <= 14 ? [{
      id: `warn-period-${activePeriod.id}`,
      type: 'warning' as NotifType,
      title: `Ká»³ quá»¹ "${activePeriod.name}" sáº¯p káº¿t thÃºc`,
      body: daysUntilEnd <= 0
        ? `Ká»³ quá»¹ Ä‘Ã£ káº¿t thÃºc ngÃ y ${formatDate(activePeriod.endDate)}. Vui lÃ²ng chá»‘t sá»•.`
        : `CÃ²n ${daysUntilEnd} ngÃ y Ä‘áº¿n ${formatDate(activePeriod.endDate)}. Vui lÃ²ng chá»‘t sá»• trÆ°á»›c ngÃ y nÃ y.`,
      time: activePeriod.endDate,
      read: false,
    }] : []),
    ...(data.members.filter(m => m.status === 'active').length === 0 ? [{
      id: 'warn-no-members',
      type: 'warning' as NotifType,
      title: 'ChÆ°a cÃ³ thÃ nh viÃªn',
      body: 'CLB chÆ°a cÃ³ thÃ nh viÃªn nÃ o Ä‘ang hoáº¡t Ä‘á»™ng. HÃ£y thÃªm thÃ nh viÃªn Ä‘á»ƒ báº¯t Ä‘áº§u.',
      time: today.toISOString(),
      read: false,
    }] : []),
    ...(data.fundPeriods.length === 0 ? [{
      id: 'warn-no-period',
      type: 'warning' as NotifType,
      title: 'ChÆ°a cÃ³ ká»³ quá»¹',
      body: 'CLB chÆ°a táº¡o ká»³ quá»¹ nÃ o. HÃ£y táº¡o ká»³ quá»¹ Ä‘á»ƒ báº¯t Ä‘áº§u quáº£n lÃ½ thu chi.',
      time: today.toISOString(),
      read: false,
    }] : []),
  ]

  const isRead = (id: string, defaultRead: boolean) => readIds.has(id) || defaultRead
  const unreadCount = dynamicNotifs.filter(n => !isRead(n.id, n.read)).length

  const markAll = () => {
    setReadIds(new Set(dynamicNotifs.map(n => n.id)))
    toast.success('ÄÃ£ Ä‘Ã¡nh dáº¥u táº¥t cáº£ lÃ  Ä‘Ã£ Ä‘á»c')
  }

  const markOne = (id: string) => setReadIds(prev => new Set([...prev, id]))

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[17px] font-[800] text-slate-900">ThÃ´ng bÃ¡o</div>
            {unreadCount > 0 && <div className="text-[12px] text-slate-400">{unreadCount} chÆ°a Ä‘á»c</div>}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAll} className="flex items-center gap-1 text-[12px] font-[600] text-indigo-600 active:opacity-70">
              <Check size={13} />ÄÃ¡nh dáº¥u Ä‘Ã£ Ä‘á»c
            </button>
          )}
        </div>
        <div className="px-4 pt-4 pb-6 space-y-2">
          {dynamicNotifs.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-[14px]">KhÃ´ng cÃ³ thÃ´ng bÃ¡o nÃ o</div>
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
        title="ThÃ´ng bÃ¡o"
        subtitle={unreadCount > 0 ? `${unreadCount} thÃ´ng bÃ¡o chÆ°a Ä‘á»c` : 'Táº¥t cáº£ Ä‘Ã£ Ä‘á»c'}
        actions={
          unreadCount > 0
            ? <button onClick={markAll} className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                <Check size={14} />ÄÃ¡nh dáº¥u táº¥t cáº£ Ä‘Ã£ Ä‘á»c
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
            <p className="text-sm text-slate-400">KhÃ´ng cÃ³ thÃ´ng bÃ¡o nÃ o</p>
          </div>
        )}
      </div>
    </div>
  )
}

