import { Shuffle } from 'lucide-react'
import { Button } from '../ui/Button'
import { useMinigameStore } from '../../store/minigameStore'
import type { MiniGameRound } from '../../types/minigame'
import { cn } from '../../lib/utils'

const STATUS_LABEL: Record<MiniGameRound['status'], string> = {
  DRAFT: 'Nháp', ACTIVE: 'Đang Diễn Ra', LOCKED: 'Đã Khóa', COMPLETED: 'Hoàn Thành',
}
const STATUS_CLASS: Record<MiniGameRound['status'], string> = {
  DRAFT: '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]',
  ACTIVE: '[background:var(--pf-color-warning-soft)] [color:var(--pf-color-warning)]',
  LOCKED: '[background:var(--pf-primary-soft)] [color:var(--pf-primary)]',
  COMPLETED: '[background:var(--pf-color-success-soft)] [color:var(--pf-color-success)]',
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
    <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shuffle size={15} className="[color:var(--pf-primary)]" />
        <p className="text-sm font-semibold [color:var(--pf-text)]">Bốc Thăm Lượt Đấu</p>
      </div>

      {currentRound && (
        <div className="[background:var(--pf-surface-muted)] rounded-lg p-3 mb-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs [color:var(--pf-color-muted)]">Lượt hiện tại</span>
            <span className={cn('text-xs font-medium rounded-full px-2 py-0.5', STATUS_CLASS[currentRound.status])}>
              {STATUS_LABEL[currentRound.status]}
            </span>
          </div>
          <p className="text-sm font-semibold [color:var(--pf-text)]">Lượt {currentRound.roundNumber}</p>
          <p className="text-xs [color:var(--pf-color-muted)]">{currentRound.totalPlayers} người · {currentRound.totalMatches} trận · {currentRound.sitOutCount} ngồi ngoài</p>
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
