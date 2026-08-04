import { History } from 'lucide-react'
import type { MiniGameRound } from '../../types/minigame'
import { cn } from '../../lib/utils'

const STATUS_LABEL: Record<MiniGameRound['status'], string> = {
  DRAFT: 'Nháp', ACTIVE: 'Đang Diễn Ra', LOCKED: 'Đã Khóa', COMPLETED: 'Hoàn Thành',
}
const STATUS_CLASS: Record<MiniGameRound['status'], string> = {
  DRAFT: '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]',
  ACTIVE: 'bg-amber-100 text-amber-700',
  LOCKED: '[background:var(--pf-primary-soft)] [color:var(--pf-primary)]',
  COMPLETED: 'bg-green-100 text-green-700',
}

interface Props {
  rounds: MiniGameRound[]
}

export function RoundHistory({ rounds }: Props) {
  const sorted = [...rounds].sort((a, b) => b.roundNumber - a.roundNumber)
  return (
    <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <History size={15} className="[color:var(--pf-color-muted)]" />
        <p className="text-sm font-semibold [color:var(--pf-text)]">Lịch Sử Lượt Đấu</p>
      </div>
      {sorted.length === 0 ? (
        <p className="text-xs [color:var(--pf-color-muted)]">Chưa có lượt đấu nào</p>
      ) : (
        <div className="space-y-1.5">
          {sorted.map(r => (
            <div key={r.id} className="flex items-center justify-between [background:var(--pf-surface-muted)] rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium [color:var(--pf-text)]">Lượt {r.roundNumber}</p>
                <p className="text-xs [color:var(--pf-color-muted)]">{r.totalMatches} trận · {r.sitOutCount} ngồi ngoài</p>
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
