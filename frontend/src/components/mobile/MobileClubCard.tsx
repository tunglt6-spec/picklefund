import { ChevronRight, Users, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface MobileClubCardProps {
  id: string
  name: string
  code: string
  memberCount: number
  fundPeriodCount: number
  status: string
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Hoạt động', color: '#22C55E', bg: '#F0FDF4' },
  suspended: { label: 'Bị khóa',  color: '#F59E0B', bg: '#FFFBEB' },
  deleted:   { label: 'Đã xóa',   color: '#EF4444', bg: '#FEF2F2' },
}

export function MobileClubCard({ name, code, memberCount, fundPeriodCount, status }: MobileClubCardProps) {
  const navigate = useNavigate()
  const s = STATUS_MAP[status] ?? STATUS_MAP.active

  return (
    <button
      className="w-full bg-white rounded-[18px] border border-slate-100 p-4 shadow-sm flex items-center gap-3 active:bg-slate-50 transition-colors text-left"
      onClick={() => navigate(`/super/clubs`)}
    >
      {/* Avatar */}
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl font-[800] text-sm text-white"
        style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}>
        {code.slice(0, 2).toUpperCase()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-[15px] font-[700] text-slate-900 truncate">{name}</span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ color: s.color, background: s.bg }}>
            {s.label}
          </span>
        </div>
        <div className="text-[12px] text-slate-400 mb-1.5">Mã: {code}</div>
        <div className="flex items-center gap-3 text-[12px] text-slate-500">
          <span className="flex items-center gap-1"><Users size={11} /> {memberCount} thành viên</span>
          <span className="flex items-center gap-1"><Calendar size={11} /> {fundPeriodCount} kỳ quỹ</span>
        </div>
      </div>

      <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
    </button>
  )
}
