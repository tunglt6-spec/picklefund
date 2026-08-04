import { Users, Shuffle } from 'lucide-react'
import { GroupCard } from './GroupCard'

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

interface GroupAssignmentPanelProps {
  groups: DashboardGroup[]
  onDrawAgain?: () => void
}

export function GroupAssignmentPanel({
  groups,
  onDrawAgain,
}: GroupAssignmentPanelProps) {
  const totalMembers = groups.reduce((sum, g) => sum + g.members.length, 0)

  const gridCols =
    groups.length <= 2
      ? 'sm:grid-cols-2'
      : groups.length === 3
      ? 'sm:grid-cols-2 xl:grid-cols-3'
      : groups.length === 4
      ? 'sm:grid-cols-2 xl:grid-cols-4'
      : 'sm:grid-cols-2 xl:grid-cols-3'

  return (
    <div className="[background:var(--pf-surface)] rounded-2xl shadow-sm border border-[color:var(--pf-border)] p-5 flex flex-col gap-4">
      {/* Panel header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Users size={20} className="[color:var(--pf-primary)] shrink-0" />
          <h2 className="text-sm font-semibold [color:var(--pf-text)] uppercase tracking-wide">
            Phân Bảng &amp; Thành Viên
          </h2>
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">
            {totalMembers} thành viên
          </span>
        </div>

        {onDrawAgain && (
          <button
            onClick={onDrawAgain}
            className="inline-flex items-center gap-1.5 rounded-lg border [border-color:var(--pf-primary)] px-3 py-1.5 text-xs font-medium [color:var(--pf-primary)] hover:[background:var(--pf-primary-soft)] transition-colors"
          >
            <Shuffle size={14} />
            Rút Thăm Lại
          </button>
        )}
      </div>

      {/* Groups grid */}
      {groups.length === 0 ? (
        <p className="text-sm [color:var(--pf-color-muted)] text-center py-6">
          Chưa có bảng nào được tạo.
        </p>
      ) : (
        <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
          {groups.map((group, index) => (
            <GroupCard key={group.id} group={group} colorIndex={index} />
          ))}
        </div>
      )}
    </div>
  )
}
