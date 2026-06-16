import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface TournamentKpi {
  totalMembers: number
  totalGroups: number
  totalExpectedMatches: number
  completedMatches: number
  pendingResultMatches: number
  completionRate: number
  totalSitOuts: number
  currentRoundNumber: number
}

interface TournamentProgressChartProps {
  kpi: TournamentKpi
}

export function TournamentProgressChart({ kpi }: TournamentProgressChartProps) {
  const remaining = Math.max(
    0,
    kpi.totalExpectedMatches - kpi.completedMatches - kpi.pendingResultMatches
  )

  const data = [
    { name: 'Hoàn Thành', value: kpi.completedMatches, color: '#22C55E' },
    { name: 'Chờ Điểm', value: kpi.pendingResultMatches, color: '#F59E0B' },
    { name: 'Còn Lại', value: remaining, color: '#E2E8F0' },
  ]

  const percentage = Math.round(kpi.completionRate)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
        Tiến Độ Giải Đấu
      </h3>

      <div className="flex flex-col items-center">
        <div className="relative w-[200px] h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: unknown, name: unknown) => [value as number, name as string]}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-bold text-slate-800">{percentage}%</span>
            <span className="text-xs text-slate-400 mt-0.5">Hoàn thành</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 w-full">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-slate-600">{item.name}</span>
              </div>
              <span className="text-sm font-medium text-slate-700">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
