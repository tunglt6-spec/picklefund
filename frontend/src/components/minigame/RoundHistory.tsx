import { History } from 'lucide-react'
import type { MiniGameRound } from '../../types/minigame'
import { cn } from '../../lib/utils'

const STATUS_LABEL: Record<MiniGameRound['status'], string> = {
  DRAFT: 'Nháp', ACTIVE: 'Đang Diễn Ra', LOCKED: 'Đã Khóa', COMPLETED: 'Hoàn Thành',
}
const STATUS_CLASS: Record<MiniGameRound['status'], string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  ACTIVE: 'bg-amber-100 text-amber-700',
  LOCKED: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
}

interface Props {
  rounds: MiniGameRound[]
}

export function RoundHistory({ rounds }: Props) {
  const sorted = [...rounds].sort((a, b) => b.roundNumber - a.roundNumber)
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <History size={15} className="text-slate-500" />
        <p className="text-sm font-semibold text-slate-800">Lịch Sử Lượt Đấu</p>
      </div>
      {sorted.length === 0 ? (
        <p className="text-xs text-slate-400">Chưa có lượt đấu nào</p>
      ) : (
        <div className="space-y-1.5">
          {sorted.map(r => (
            <div key={r.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-800">Lượt {r.roundNumber}</p>
                <p className="text-xs text-slate-400">{r.totalMatches} trận · {r.sitOutCount} ngồi ngoài</p>
              </div>
              <span className={cn('text-xs font-medium rounded-full px-2 py-0.5', STATUS_CLASS[r.status])}>
                {STATUS_LABEL[r.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
