import { Bell, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useClubDataStore, DEMO_CLUB_ID } from '../../store/clubDataStore'
import { PickleFundLogoMark } from '../ui/PickleFundLogoMark'

export function MobileHeader() {
  const { user } = useAuthStore()
  const { getClubData } = useClubDataStore()
  if (!user) return null

  const clubId = user.clubId ?? DEMO_CLUB_ID
  const { fundPeriods } = getClubData(clubId)
  const activePeriod = fundPeriods.find(p => p.status === 'active')

  const initials = user.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'U'

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 pt-3 pb-2 safe-top">
      {/* Row 1: Logo + Actions */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <PickleFundLogoMark size={28} />
          <span className="text-[17px] font-extrabold text-slate-900 tracking-tight">PickleFund</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Bell with badge */}
          <button className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-600 active:bg-slate-100 transition-colors">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
          </button>

          {/* Avatar */}
          <button className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm active:opacity-80 transition-opacity"
            style={{ background: 'linear-gradient(135deg,#00C896,#4F46E5)' }}>
            {initials}
          </button>
        </div>
      </div>

      {/* Row 2: Period selector */}
      {activePeriod ? (
        <button className="flex items-center gap-1.5 group">
          <span className="text-[15px] font-bold text-slate-900">Kỳ Quỹ {activePeriod.name}</span>
          <ChevronDown size={15} className="text-slate-400 group-active:rotate-180 transition-transform" />
        </button>
      ) : (
        <span className="text-[15px] font-bold text-slate-500">Chưa có kỳ quỹ</span>
      )}

      {activePeriod && (
        <p className="text-xs text-slate-400 mt-0.5">
          {activePeriod.startDate} – {activePeriod.endDate}
        </p>
      )}
    </header>
  )
}
