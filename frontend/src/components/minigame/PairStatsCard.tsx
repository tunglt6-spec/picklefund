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
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users size={15} className="text-indigo-600" />
        <p className="text-sm font-semibold text-slate-800">Cặp Đấu Tốt Nhất</p>
      </div>

      {topPairs.length === 0 ? (
        <p className="text-xs text-slate-400 mb-3">Chưa đủ dữ liệu</p>
      ) : (
        <div className="space-y-2 mb-4">
          {topPairs.map((p, i) => (
            <div key={`${p.memberAId}-${p.memberBId}`} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                <span className="text-sm font-medium text-slate-800">{p.memberAName} & {p.memberBName}</span>
              </div>
              <span className="text-xs font-semibold text-green-600">{p.winRateTogether}% ({p.wonTogether}/{p.pairedCount})</span>
            </div>
          ))}
        </div>
      )}

      {overusedPairs.length > 0 && (
        <div className="pt-3 border-t border-slate-100 space-y-1.5">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={12} className="text-amber-500" />
            <p className="text-xs font-semibold text-amber-700">Nên tránh ghép lại</p>
          </div>
          {overusedPairs.map(p => (
            <div key={`${p.memberAId}-${p.memberBId}-warn`} className="text-xs text-slate-600">
              {p.memberAName} & {p.memberBName} — đã ghép {p.pairedCount} lần
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
