import { UserMinus } from 'lucide-react'
import type { MiniGameRoundSitOut } from '../../types/minigame'

interface Props {
  sitOuts: MiniGameRoundSitOut[]
  streakMemberIds?: Set<string>
}

export function SitOutPanel({ sitOuts, streakMemberIds }: Props) {
  return (
    <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <UserMinus size={15} className="text-red-500" />
        <p className="text-sm font-semibold [color:var(--pf-text)]">Ngồi Ngoài Lượt Này</p>
      </div>
      {sitOuts.length === 0 ? (
        <p className="text-xs [color:var(--pf-color-muted)]">Không ai ngồi ngoài</p>
      ) : (
        <div className="space-y-1.5">
          {sitOuts.map(s => (
            <div key={s.id} className="flex items-center justify-between [background:var(--pf-surface-muted)] rounded-lg px-3 py-2">
              <span className="text-sm font-medium [color:var(--pf-text)]">{s.memberName}</span>
              {streakMemberIds?.has(s.memberId) && (
                <span className="text-xs font-medium text-red-600 bg-red-50 rounded-full px-2 py-0.5">2 lượt liên tiếp</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
