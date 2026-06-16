import { Shuffle } from 'lucide-react'
import { Button } from '../ui/Button'
import { useMinigameStore } from '../../store/minigameStore'
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
  minigameId: string
  currentRound: MiniGameRound | null
  currentRoundHasCompletedMatches: boolean
  onOpenDrawModal: () => void
}

export function DrawRoundPanel({ currentRound, currentRoundHasCompletedMatches, onOpenDrawModal }: Props) {
  const { redrawRound, lockRound } = useMinigameStore()

  const canRedraw = !!currentRound && !currentRoundHasCompletedMatches && currentRound.status !== 'LOCKED'
  const canLock = !!currentRound && currentRound.status === 'ACTIVE'

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shuffle size={15} className="text-indigo-600" />
        <p className="text-sm font-semibold text-slate-800">Bốc Thăm Lượt Đấu</p>
      </div>

      {currentRound && (
        <div className="bg-slate-50 rounded-lg p-3 mb-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Lượt hiện tại</span>
            <span className={cn('text-xs font-medium rounded-full px-2 py-0.5', STATUS_CLASS[currentRound.status])}>
              {STATUS_LABEL[currentRound.status]}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800">Lượt {currentRound.roundNumber}</p>
          <p className="text-xs text-slate-500">{currentRound.totalPlayers} người · {currentRound.totalMatches} trận · {currentRound.sitOutCount} ngồi ngoài</p>
        </div>
      )}

      <div className="space-y-2">
        <Button
          size="sm"
          className="w-full"
          onClick={onOpenDrawModal}
        >
          Bốc Thăm Lượt Mới
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          disabled={!canRedraw}
          onClick={() => currentRound && redrawRound(currentRound.id)}
        >
          Random Lại Lượt Này
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="w-full"
          disabled={!canLock}
          onClick={() => currentRound && lockRound(currentRound.id)}
        >
          Khóa Lượt
        </Button>
      </div>
    </div>
  )
}
