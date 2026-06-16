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
    dotColor: 'bg-indigo-500',
    icon: <RefreshCw size={14} className="text-indigo-500" />,
  },
  group: {
    dotColor: 'bg-purple-500',
    icon: <Users size={14} className="text-purple-500" />,
  },
  system: {
    dotColor: 'bg-slate-400',
    icon: <Settings size={14} className="text-slate-400" />,
  },
}

export function RecentActivitiesPanel({ activities }: RecentActivitiesPanelProps) {
  const MAX_VISIBLE = 5
  const visible = activities.slice(0, MAX_VISIBLE)
  const hasMore = activities.length > MAX_VISIBLE

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Hoạt Động Gần Đây
        </h3>
        <Clock size={16} className="text-slate-400" />
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">Chưa có hoạt động nào.</p>
      ) : (
        <div className="relative">
          <div
            className="absolute left-[17px] top-0 bottom-0 w-px bg-slate-100"
            aria-hidden="true"
          />

          <ul className="flex flex-col gap-0">
            {visible.map((activity) => {
              const config = typeConfig[activity.type]
              return (
                <li key={activity.id} className="flex items-start gap-3 relative pb-4 last:pb-0">
                  <div className="flex-shrink-0 mt-0.5 z-10 flex items-center justify-center w-[22px] h-[22px] rounded-full bg-white border-2 border-slate-100">
                    <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1.5">
                      <span className="flex-shrink-0 mt-0.5">{config.icon}</span>
                      <span className="text-sm text-slate-700 leading-snug">{activity.text}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{activity.time}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {hasMore && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors duration-150">
            Xem thêm ({activities.length - MAX_VISIBLE} hoạt động)
          </button>
        </div>
      )}
    </div>
  )
}
