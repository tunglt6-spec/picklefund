import { Bell } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { PickleFundLogoMark } from '../ui/PickleFundLogoMark'

export function MobileHeader() {
  const { user } = useAuthStore()
  if (!user) return null

  const initials = user.username ? user.username.slice(0, 2).toUpperCase() : 'U'

  return (
    <header
      className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 flex items-center justify-between"
      style={{ height: 64, paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Left: Logo + Name */}
      <div className="flex items-center gap-2">
        <PickleFundLogoMark size={26} />
        <span className="text-[18px] font-[800] text-slate-900 tracking-tight">PickleFund</span>
      </div>

      {/* Right: Bell + Avatar */}
      <div className="flex items-center gap-2">
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-500 active:bg-slate-100">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[12px] font-[800] text-white active:opacity-80"
          style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}
        >
          {initials}
        </button>
      </div>
    </header>
  )
}
