import { Users, AlertTriangle } from 'lucide-react'
import type { MiniGamePairStat } from '../../types/minigame'

interface Props {
  pairStats: MiniGamePairStat[]
}

export function PairStatsCard({ pairStats }: Props) {
  const eligible = pairStats.filter(p => p.pairedCount >= 2)
  const topPairs = [...eligible].sort((a, b) => b.winRateTogether - a.winRateTogether).slice(0, 3)
  const overusedPairs = pairStats.filter(p => p.pairedCount > 4)

  return (
    <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users size={15} className="[color:var(--pf-primary)]" />
        <p className="text-sm font-semibold [color:var(--pf-text)]">Cặp Đấu Tốt Nhất</p>
      </div>

      {topPairs.length === 0 ? (
        <p className="text-xs [color:var(--pf-color-muted)] mb-3">Chưa đủ dữ liệu</p>
      ) : (
        <div className="space-y-2 mb-4">
          {topPairs.map((p, i) => (
            <div key={`${p.memberAId}-${p.memberBId}`} className="flex items-center justify-between [background:var(--pf-surface-muted)] rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold [color:var(--pf-color-muted)]">#{i + 1}</span>
                <span className="text-sm font-medium [color:var(--pf-text)]">{p.memberAName} & {p.memberBName}</span>
              </div>
              <span className="text-xs font-semibold text-green-600">{p.winRateTogether}% ({p.wonTogether}/{p.pairedCount})</span>
            </div>
          ))}
        </div>
      )}

      {overusedPairs.length > 0 && (
        <div className="pt-3 border-t border-[color:var(--pf-border)] space-y-1.5">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={12} className="text-amber-500" />
            <p className="text-xs font-semibold text-amber-700">Nên tránh ghép lại</p>
          </div>
          {overusedPairs.map(p => (
            <div key={`${p.memberAId}-${p.memberBId}-warn`} className="text-xs [color:var(--pf-color-muted)]">
              {p.memberAName} & {p.memberBName} — đã ghép {p.pairedCount} lần
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
