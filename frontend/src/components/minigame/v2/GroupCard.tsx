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
  '[border-color:var(--pf-primary)]',
  '[border-color:var(--pf-primary)]',
  '[border-color:var(--pf-color-success)]',
  '[border-color:var(--pf-color-warning)]',
  '[border-color:var(--pf-color-danger)]',
] as const

const LABEL_COLORS = [
  '[color:var(--pf-primary)]',
  '[color:var(--pf-primary)]',
  '[color:var(--pf-color-success)]',
  '[color:var(--pf-color-warning)]',
  '[color:var(--pf-color-danger)]',
] as const

const PROGRESS_COLORS = [
  '[background:var(--pf-primary)]',
  '[background:var(--pf-primary)]',
  '[background:var(--pf-color-success)]',
  '[background:var(--pf-color-warning)]',
  '[background:var(--pf-color-danger)]',
] as const

function SkillBadge({ skill }: { skill: 'Cao' | 'TB' | 'Thấp' }) {
  if (skill === 'Cao') {
    return (
      <span className="text-xs [background:var(--pf-color-danger-soft)] [color:var(--pf-color-danger)] rounded-full px-1.5 py-0.5">
        Cao
      </span>
    )
  }
  if (skill === 'TB') {
    return (
      <span className="text-xs [background:var(--pf-color-warning-soft)] [color:var(--pf-color-warning)] rounded-full px-1.5 py-0.5">
        TB
      </span>
    )
  }
  return (
    <span className="text-xs [background:var(--pf-color-info-soft)] [color:var(--pf-color-info)] rounded-full px-1.5 py-0.5">
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
      className={`[background:var(--pf-surface)] rounded-2xl shadow-sm border border-[color:var(--pf-border)] border-l-4 ${borderColor} p-4 flex flex-col gap-3`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className={`text-base font-bold ${labelColor}`}>{group.label}</span>
        <span className="text-xs [color:var(--pf-color-muted)] font-medium">
          {group.completedMatches}/{group.totalExpectedMatches} trận
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 [background:var(--pf-color-muted-soft)] rounded-full overflow-hidden">
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
                <Crown size={13} className="[color:var(--pf-color-warning)] shrink-0" />
              )}
              <span className="text-sm [color:var(--pf-text)] truncate">{member.name}</span>
            </div>
            <SkillBadge skill={member.skill} />
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-[color:var(--pf-border)]">
        <span className="text-xs [color:var(--pf-color-muted)]">
          {group.members.length} thành viên
        </span>
        {onViewGroup && (
          <button
            onClick={onViewGroup}
            className="inline-flex items-center gap-1 text-xs [color:var(--pf-color-muted)] hover:[color:var(--pf-primary)] transition-colors"
          >
            <Eye size={13} />
            Xem chi tiết
          </button>
        )}
      </div>
    </div>
  )
}
