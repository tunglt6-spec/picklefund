import { Trophy } from 'lucide-react'
import type { MiniGameDoublesMatch } from '../../types/minigame'
import { cn } from '../../lib/utils'

interface Props {
  match: MiniGameDoublesMatch
  onEnterScore: (match: MiniGameDoublesMatch) => void
}

export function MatchCard2v2({ match, onEnterScore }: Props) {
  const isCompleted = match.status === 'COMPLETED'
  const isDraw = isCompleted && match.team1Score === match.team2Score
  const team1Won = isCompleted && !isDraw && match.winningTeam === 1
  const team2Won = isCompleted && !isDraw && match.winningTeam === 2

  const teamName = (players: { memberName: string }[]) => players.map(p => p.memberName).join(' & ')

  return (
    <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-sm p-3">
      <p className="text-xs [color:var(--pf-color-muted)] mb-2">Trận {match.matchNumber}{match.matchDate ? ` · ${match.matchDate}` : ''}</p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* Team 1 */}
        <div className={cn(
          'rounded-lg px-3 py-2.5 text-center transition-colors',
          team1Won ? '[background:var(--pf-color-success-soft)] border [border-color:var(--pf-color-success-soft)]' : '[background:var(--pf-surface-muted)] border border-transparent'
        )}>
          {team1Won && <p className="text-xs mb-1">🏆</p>}
          <p className="text-sm font-semibold [color:var(--pf-text)] leading-tight">{teamName(match.team1)}</p>
        </div>

        {/* Score / VS */}
        <div className="text-center px-1">
          {isCompleted ? (
            <p className="text-lg font-bold tabular-nums [color:var(--pf-text)] whitespace-nowrap">
              {match.team1Score} – {match.team2Score}
            </p>
          ) : (
            <p className="text-sm font-semibold [color:var(--pf-color-muted)]">VS</p>
          )}
          {isDraw && <p className="text-xs [color:var(--pf-color-warning)] font-medium mt-0.5">Hòa</p>}
        </div>

        {/* Team 2 */}
        <div className={cn(
          'rounded-lg px-3 py-2.5 text-center transition-colors',
          team2Won ? '[background:var(--pf-color-success-soft)] border [border-color:var(--pf-color-success-soft)]' : '[background:var(--pf-surface-muted)] border border-transparent'
        )}>
          {team2Won && <p className="text-xs mb-1">🏆</p>}
          <p className="text-sm font-semibold [color:var(--pf-text)] leading-tight">{teamName(match.team2)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        {match.status === 'PENDING' ? (
          <button
            onClick={() => onEnterScore(match)}
            className="text-xs font-medium [color:var(--pf-primary)] hover:[background:var(--pf-primary-soft)] rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1"
          >
            ✏ Nhập Kết Quả
          </button>
        ) : (
          <button
            onClick={() => onEnterScore(match)}
            className="text-xs font-medium [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1"
          >
            <Trophy size={12} /> Xem Chi Tiết
          </button>
        )}
      </div>
    </div>
  )
}
