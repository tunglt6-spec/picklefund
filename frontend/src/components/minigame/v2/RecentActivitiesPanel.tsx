import { Clock, Trophy, RefreshCw, Users, Settings } from 'lucide-react'

interface DashboardActivity {
  id: string
  text: string
  time: string
  type: 'score' | 'round' | 'group' | 'system'
}

interface RecentActivitiesPanelProps {
  activities: DashboardActivity[]
}

const typeConfig: Record<
  DashboardActivity['type'],
  { dotColor: string; icon: React.ReactNode }
> = {
  score: {
    dotColor: 'bg-green-500',
    icon: <Trophy size={14} className="text-green-500" />,
  },
  round: {
    dotColor: '[background:var(--pf-primary)]',
    icon: <RefreshCw size={14} className="[color:var(--pf-primary)]" />,
  },
  group: {
    dotColor: '[background:var(--pf-primary)]',
    icon: <Users size={14} className="[color:var(--pf-primary)]" />,
  },
  system: {
    dotColor: 'bg-slate-400',
    icon: <Settings size={14} className="[color:var(--pf-color-muted)]" />,
  },
}

export function RecentActivitiesPanel({ activities }: RecentActivitiesPanelProps) {
  const MAX_VISIBLE = 5
  const visible = activities.slice(0, MAX_VISIBLE)
  const hasMore = activities.length > MAX_VISIBLE

  return (
    <div className="[background:var(--pf-surface)] rounded-2xl shadow-sm border border-[color:var(--pf-border)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold [color:var(--pf-text)] uppercase tracking-wide">
          Hoạt Động Gần Đây
        </h3>
        <Clock size={16} className="[color:var(--pf-color-muted)]" />
      </div>

      {visible.length === 0 ? (
        <p className="text-sm [color:var(--pf-color-muted)] text-center py-4">Chưa có hoạt động nào.</p>
      ) : (
        <div className="relative">
          <div
            className="absolute left-[17px] top-0 bottom-0 w-px [background:var(--pf-color-muted-soft)]"
            aria-hidden="true"
          />

          <ul className="flex flex-col gap-0">
            {visible.map((activity) => {
              const config = typeConfig[activity.type]
              return (
                <li key={activity.id} className="flex items-start gap-3 relative pb-4 last:pb-0">
                  <div className="flex-shrink-0 mt-0.5 z-10 flex items-center justify-center w-[22px] h-[22px] rounded-full [background:var(--pf-surface)] border-2 border-[color:var(--pf-border)]">
                    <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1.5">
                      <span className="flex-shrink-0 mt-0.5">{config.icon}</span>
                      <span className="text-sm [color:var(--pf-text)] leading-snug">{activity.text}</span>
                    </div>
                    <p className="text-xs [color:var(--pf-color-muted)] mt-0.5">{activity.time}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {hasMore && (
        <div className="mt-3 pt-3 border-t border-[color:var(--pf-border)]">
          <button className="text-xs [color:var(--pf-primary)] hover:[color:var(--pf-primary)] font-medium transition-colors duration-150">
            Xem thêm ({activities.length - MAX_VISIBLE} hoạt động)
          </button>
        </div>
      )}
    </div>
  )
}
