import { Zap } from 'lucide-react';

interface QuickStats {
  topScorer: { name: string; points: number };
  bestDiff: { name: string; diff: number };
  topWinRate: { name: string; rate: number };
  mostPlayed: { name: string; count: number };
  mostSitOut: { name: string; count: number };
}

interface QuickStatsPanelProps {
  stats: QuickStats;
}

interface StatRow {
  emoji: string;
  label: string;
  name: string;
  value: string;
}

export function QuickStatsPanel({ stats }: QuickStatsPanelProps) {
  const rows: StatRow[] = [
    {
      emoji: '🏆',
      label: 'Ghi Điểm Cao Nhất',
      name: stats.topScorer.name,
      value: `${stats.topScorer.points} pts`,
    },
    {
      emoji: '📈',
      label: 'Hiệu Số Tốt Nhất',
      name: stats.bestDiff.name,
      value: stats.bestDiff.diff >= 0 ? `+${stats.bestDiff.diff}` : `${stats.bestDiff.diff}`,
    },
    {
      emoji: '🎯',
      label: 'Tỉ Lệ Thắng Cao',
      name: stats.topWinRate.name,
      value: `${stats.topWinRate.rate}%`,
    },
    {
      emoji: '🔄',
      label: 'Nhiều Trận Nhất',
      name: stats.mostPlayed.name,
      value: `${stats.mostPlayed.count} trận`,
    },
    {
      emoji: '😴',
      label: 'Ngồi Nghỉ Nhiều',
      name: stats.mostSitOut.name,
      value: `${stats.mostSitOut.count} lần`,
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={18} className="text-indigo-600" />
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Thống Kê Nhanh
        </h2>
      </div>

      <ul className="flex flex-col">
        {rows.map((row, idx) => (
          <li key={row.label}>
            <div className="flex items-center gap-3 py-3">
              <span className="text-base shrink-0 w-6 text-center">{row.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 leading-tight">{row.label}</p>
                <p className="text-sm text-slate-700 font-medium truncate">{row.name}</p>
              </div>
              <span className="text-sm font-semibold text-indigo-700 shrink-0 tabular-nums">
                {row.value}
              </span>
            </div>
            {idx < rows.length - 1 && <div className="border-b border-slate-100" />}
          </li>
        ))}
      </ul>
    </div>
  );
}
