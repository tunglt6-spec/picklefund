import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { MiniGamePersonalStanding } from '../../types/minigame'

const BAR_COLORS = ['#f59e0b', '#94a3b8', '#f97316', '#6366f1', '#22c55e', '#06b6d4', '#ec4899', '#8b5cf6']

interface Props {
  standings: MiniGamePersonalStanding[]
}

export function WinRateChart({ standings }: Props) {
  const data = [...standings]
    .filter(s => s.played > 0)
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 8)
    .map(s => ({ name: s.memberName.split(' ').pop()!, winRate: s.winRate }))

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
      <p className="text-sm font-semibold text-slate-800 mb-3">Top Win Rate</p>
      {data.length === 0 ? (
        <p className="text-xs text-slate-400">Chưa có dữ liệu</p>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v) => [`${v}%`, 'Win Rate']} />
              <Bar dataKey="winRate" radius={[0, 4, 4, 0]} barSize={18}>
                {data.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
