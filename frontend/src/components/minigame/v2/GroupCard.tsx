import { Crown, Eye } from 'lucide-react'

interface DashboardMember {
  id: string
  name: string
  skill: 'Cao' | 'TB' | 'Thấp'
  isSeed?: boolean
}

interface DashboardGroup {
  id: string
  label: string
  members: DashboardMember[]
  totalExpectedMatches: number
  completedMatches: number
}

interface GroupCardProps {
  group: DashboardGroup
  colorIndex: number
  onViewGroup?: () => void
}

const BORDER_COLORS = [
  'border-indigo-500',
  'border-purple-500',
  'border-emerald-500',
  'border-amber-500',
  'border-rose-500',
] as const

const LABEL_COLORS = [
  'text-indigo-600',
  'text-purple-600',
  'text-emerald-600',
  'text-amber-600',
  'text-rose-600',
] as const

const PROGRESS_COLORS = [
  'bg-indigo-500',
  'bg-purple-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
] as const

function SkillBadge({ skill }: { skill: 'Cao' | 'TB' | 'Thấp' }) {
  if (skill === 'Cao') {
    return (
      <span className="text-xs bg-red-100 text-red-700 rounded-full px-1.5 py-0.5">
        Cao
      </span>
    )
  }
  if (skill === 'TB') {
    return (
      <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">
        TB
      </span>
    )
  }
  return (
    <span className="text-xs bg-sky-100 text-sky-700 rounded-full px-1.5 py-0.5">
      Thấp
    </span>
  )
}

export function GroupCard({ group, colorIndex, onViewGroup }: GroupCardProps) {
  const safeIndex = colorIndex % BORDER_COLORS.length
  const borderColor = BORDER_COLORS[safeIndex]
  const labelColor = LABEL_COLORS[safeIndex]
  const progressColor = PROGRESS_COLORS[safeIndex]

  const progressPct =
    group.totalExpectedMatches > 0
      ? Math.min(
          100,
          Math.round((group.completedMatches / group.totalExpectedMatches) * 100)
        )
      : 0

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-slate-100 border-l-4 ${borderColor} p-4 flex flex-col gap-3`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className={`text-base font-bold ${labelColor}`}>{group.label}</span>
        <span className="text-xs text-slate-500 font-medium">
          {group.completedMatches}/{group.totalExpectedMatches} trận
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Members list */}
      <ul className="flex flex-col gap-1.5">
        {group.members.map((member) => (
          <li key={member.id} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {member.isSeed && (
                <Crown size={13} className="text-amber-400 shrink-0" />
              )}
              <span className="text-sm text-slate-700 truncate">{member.name}</span>
            </div>
            <SkillBadge skill={member.skill} />
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-50">
        <span className="text-xs text-slate-400">
          {group.members.length} thành viên
        </span>
        {onViewGroup && (
          <button
            onClick={onViewGroup}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <Eye size={13} />
            Xem chi tiết
          </button>
        )}
      </div>
    </div>
  )
}
