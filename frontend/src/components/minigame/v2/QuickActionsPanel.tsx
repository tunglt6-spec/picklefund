import { useNavigate } from 'react-router-dom'
import { Settings, Shuffle, CheckCircle, Users, Calendar, BarChart2 } from 'lucide-react'

interface QuickActionsPanelProps {
  onDrawRound?: () => void
  onCompleteRound?: () => void
  onViewGroups?: () => void
  onViewSchedule?: () => void
  onViewStandings?: () => void
  minigameId: string
}

interface ActionButton {
  label: string
  icon: React.ReactNode
  bgClass: string
  hoverClass: string
  onClick: () => void
}

export function QuickActionsPanel({
  onDrawRound,
  onCompleteRound,
  onViewGroups,
  onViewSchedule,
  onViewStandings,
  minigameId,
}: QuickActionsPanelProps) {
  const navigate = useNavigate()

  const actions: ActionButton[] = [
    {
      label: 'Rút Thăm Vòng Mới',
      icon: <Shuffle size={18} className="text-white" />,
      bgClass: 'bg-indigo-600',
      hoverClass: 'hover:bg-indigo-700',
      onClick: () => onDrawRound?.(),
    },
    {
      label: 'Hoàn Thành Vòng',
      icon: <CheckCircle size={18} className="text-white" />,
      bgClass: 'bg-green-500',
      hoverClass: 'hover:bg-green-600',
      onClick: () => onCompleteRound?.(),
    },
    {
      label: 'Quản Lý Bảng',
      icon: <Users size={18} className="text-white" />,
      bgClass: 'bg-purple-600',
      hoverClass: 'hover:bg-purple-700',
      onClick: () => {
        onViewGroups?.()
        navigate(`/minigames/${minigameId}/groups`)
      },
    },
    {
      label: 'Lịch Thi Đấu',
      icon: <Calendar size={18} className="text-white" />,
      bgClass: 'bg-sky-500',
      hoverClass: 'hover:bg-sky-600',
      onClick: () => {
        onViewSchedule?.()
        navigate(`/minigames/${minigameId}/schedule`)
      },
    },
    {
      label: 'Bảng Xếp Hạng',
      icon: <BarChart2 size={18} className="text-white" />,
      bgClass: 'bg-amber-500',
      hoverClass: 'hover:bg-amber-600',
      onClick: () => {
        onViewStandings?.()
        navigate(`/minigames/${minigameId}/standings`)
      },
    },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Thao Tác Nhanh
        </h3>
        <Settings size={16} className="text-slate-400" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`${action.bgClass} ${action.hoverClass} rounded-xl p-3 flex flex-col items-start gap-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            {action.icon}
            <span className="text-xs font-medium text-white leading-tight">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
