import { useNavigate } from 'react-router-dom'
import { Settings, Shuffle, CheckCircle, Users, Calendar, BarChart2 } from 'lucide-react'

interface QuickActionsPanelProps {
  onDrawRound?: () => void
  onCompleteRound?: () => void
  onViewGroups?: () => void
  onViewSchedule?: () => void
  onViewStandings?: () => void
  minigameId: string
  /** Có vòng đang diễn ra hay không — quyết định bật/tắt "Hoàn Thành Vòng". Mặc định true. */
  canCompleteRound?: boolean
}

interface ActionButton {
  label: string
  icon: React.ReactNode
  bgClass: string
  hoverClass: string
  onClick: () => void
  disabled?: boolean
  disabledTitle?: string
}

export function QuickActionsPanel({
  onDrawRound,
  onCompleteRound,
  onViewGroups,
  onViewSchedule,
  onViewStandings,
  minigameId,
  canCompleteRound = true,
}: QuickActionsPanelProps) {
  const navigate = useNavigate()

  const actions: ActionButton[] = [
    {
      label: 'Rút Thăm Vòng Mới',
      icon: <Shuffle size={18} className="text-white" />,
      bgClass: '[background:var(--pf-primary)]',
      hoverClass: 'hover:[background:var(--pf-primary-hover)]',
      onClick: () => onDrawRound?.(),
    },
    {
      label: 'Hoàn Thành Vòng',
      icon: <CheckCircle size={18} className="text-white" />,
      bgClass: 'bg-green-500',
      hoverClass: 'hover:bg-green-500',
      onClick: () => onCompleteRound?.(),
      disabled: !canCompleteRound,
      disabledTitle: 'Chưa có vòng đang diễn ra',
    },
    {
      label: 'Quản Lý Bảng',
      icon: <Users size={18} className="text-white" />,
      bgClass: '[background:var(--pf-primary)]',
      hoverClass: 'hover:[background:var(--pf-primary-hover)]',
      onClick: () => {
        onViewGroups?.()
        navigate(`/minigames/${minigameId}/groups`)
      },
    },
    {
      label: 'Lịch Thi Đấu',
      icon: <Calendar size={18} className="text-white" />,
      bgClass: 'bg-sky-500',
      hoverClass: 'hover:bg-sky-500',
      onClick: () => {
        onViewSchedule?.()
        navigate(`/minigames/${minigameId}/schedule`)
      },
    },
    {
      label: 'Bảng Xếp Hạng',
      icon: <BarChart2 size={18} className="text-white" />,
      bgClass: 'bg-amber-500',
      hoverClass: 'hover:bg-amber-500',
      onClick: () => {
        onViewStandings?.()
        navigate(`/minigames/${minigameId}/standings`)
      },
    },
  ]

  return (
    <div className="[background:var(--pf-surface)] rounded-2xl shadow-sm border border-[color:var(--pf-border)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold [color:var(--pf-text)] uppercase tracking-wide">
          Thao Tác Nhanh
        </h3>
        <Settings size={16} className="[color:var(--pf-color-muted)]" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.disabled ? action.disabledTitle : undefined}
            aria-disabled={action.disabled}
            className={`${action.bgClass} rounded-xl p-3 flex flex-col items-start gap-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[color:var(--pf-primary)] ${
              action.disabled
                ? 'opacity-50 cursor-not-allowed'
                : `${action.hoverClass} cursor-pointer`
            }`}
          >
            {action.icon}
            <span className="text-xs font-medium text-white leading-tight">
              {action.label}
              {action.disabled && (
                <span className="block text-[10px] font-normal text-white/80 mt-0.5">
                  Chưa có vòng đang diễn ra
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
