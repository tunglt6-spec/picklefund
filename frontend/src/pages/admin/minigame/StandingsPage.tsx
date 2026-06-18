import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { PageHeader } from '../../../components/layout/PageHeader'
import { useMinigameStore } from '../../../store/minigameStore'
import { useMinigameDetailSync } from '../../../hooks/useMinigameDetailSync'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { cn } from '../../../lib/utils'

const RANK_CLASS: Record<number, string> = {
  1: 'bg-yellow-50 border-l-2 border-yellow-400',
  2: 'bg-slate-50 border-l-2 border-slate-400',
  3: 'bg-amber-50 border-l-2 border-amber-400',
}

const BAR_COLORS = ['#f59e0b', '#94a3b8', '#f97316', '#6366f1', '#22c55e', '#06b6d4', '#ec4899', '#8b5cf6']

export function StandingsPage() {
  const { id } = useParams<{ id: string }>()
  useMinigameDetailSync(id)
  const navigate = useNavigate()
  const { getMinigame, getStandings, groups } = useMinigameStore()
  const mg = getMinigame(id!)
  const standings = getStandings(id!)
  const myGroups = groups.filter(g => g.minigameId === id).sort((a, b) => a.groupOrder - b.groupOrder)

  const [activeTab, setActiveTab] = useState<'all' | string>('all')
  const isMobile = useIsMobile()

  if (!mg) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-slate-500">Không tìm thấy minigame</p>
    </div>
  )

  const displayed = activeTab === 'all'
    ? standings
    : standings.filter(s => s.groupId === activeTab)

  const sorted = [...displayed].sort((a, b) =>
    b.rankingPoints - a.rankingPoints || b.pointDifference - a.pointDifference || b.pointsFor - a.pointsFor
  ).map((s, i) => ({ ...s, overallRank: i + 1 }))

  const chartData = sorted.map(s => ({ name: s.memberName.split(' ').pop()!, points: s.rankingPoints }))

  const tabs = [
    { id: 'all' as const, label: 'Tổng Quan' },
    ...myGroups.map(g => ({ id: g.id, label: g.groupName })),
  ]

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/minigames/${id}`)} className="text-slate-500">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-slate-800 truncate">Bảng Xếp Hạng</p>
            <p className="text-[11px] text-slate-400 truncate">{mg.name} · {standings.length} thành viên</p>
          </div>
        </div>

        {/* Scrollable group tabs */}
        <div className="flex gap-1.5 bg-white border-b border-slate-100 px-3 py-2 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={cn(
                'shrink-0 text-[12px] font-medium px-3 py-1.5 rounded-[8px] transition-colors',
                activeTab === t.id ? 'text-white shadow-sm' : 'text-slate-500 bg-slate-50'
              )}
              style={activeTab === t.id ? { background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' } : {}}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-4 py-4 space-y-3">
          {/* Bar chart */}
          {sorted.length > 0 && (
            <div className="bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm">
              <p className="text-[13px] font-semibold text-slate-800 mb-3">Điểm Xếp Hạng</p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barSize={22}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={28} />
                    <Tooltip formatter={(v) => [`${v} điểm`, 'Điểm']} />
                    <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Rank cards */}
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <p className="text-slate-400 text-[13px]">Chưa có dữ liệu xếp hạng</p>
            </div>
          ) : sorted.map(s => (
            <div key={`${s.memberId}-${s.groupId}`}
              className={cn('bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm', RANK_CLASS[s.overallRank] ?? '')}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className={cn('h-8 w-8 shrink-0 flex items-center justify-center rounded-full text-[13px] font-bold',
                  s.overallRank === 1 ? 'bg-yellow-400 text-white' :
                  s.overallRank === 2 ? 'bg-slate-400 text-white' :
                  s.overallRank === 3 ? 'bg-amber-500 text-white' :
                  'bg-slate-100 text-slate-500'
                )}>
                  {s.overallRank === 1 ? '🥇' : s.overallRank === 2 ? '🥈' : s.overallRank === 3 ? '🥉' : s.overallRank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-[14px]">{s.memberName}</p>
                  <p className="text-[11px] text-slate-400">{s.groupName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[20px] font-black text-indigo-700 leading-tight">{s.rankingPoints}</p>
                  <p className="text-[10px] text-slate-400">điểm</p>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: 'Trận', value: s.played, cls: 'text-slate-900' },
                  { label: 'Thắng', value: s.won, cls: 'text-green-700' },
                  { label: 'Hòa', value: s.drawn, cls: 'text-amber-600' },
                  { label: 'Thua', value: s.lost, cls: 'text-red-500' },
                  { label: 'Hiệu số', value: `${s.pointDifference > 0 ? '+' : ''}${s.pointDifference}`, cls: s.pointDifference >= 0 ? 'text-green-600' : 'text-red-500' },
                ].map(item => (
                  <div key={item.label} className="bg-slate-50 rounded-[8px] py-1.5 text-center">
                    <p className={cn('text-[13px] font-bold', item.cls)}>{item.value}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title={`Bảng Xếp Hạng – ${mg.name}`}
        subtitle={`${standings.length} thành viên`}
      />

      <div className="p-6">
        <button onClick={() => navigate(`/minigames/${id}`)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors">
          <ArrowLeft size={14} /> {mg.name}
        </button>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 bg-white rounded-xl border border-slate-100 shadow-sm p-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                activeTab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Bar chart */}
        {sorted.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-4">
            <p className="text-sm font-semibold text-slate-800 mb-3">Điểm Xếp Hạng</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={28}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v} điểm`, 'Điểm']} />
                  <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Standings table */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Thành Viên</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Bảng</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Trận</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Thắng</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Hòa</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Thua</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Điểm+</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Điểm-</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Hiệu Số</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase font-bold">Điểm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.length === 0 && (
                <tr><td colSpan={11} className="text-center py-10 text-slate-400 text-sm">Chưa có dữ liệu</td></tr>
              )}
              {sorted.map((s) => (
                <tr key={`${s.memberId}-${s.groupId}`} className={cn('transition-colors', RANK_CLASS[s.overallRank] ?? 'hover:bg-slate-50/50')}>
                  <td className="px-3 py-2.5 text-center">
                    <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                      s.overallRank === 1 ? 'bg-yellow-400 text-white' :
                      s.overallRank === 2 ? 'bg-slate-400 text-white' :
                      s.overallRank === 3 ? 'bg-amber-500 text-white' :
                      'text-slate-500'
                    )}>
                      {s.overallRank}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{s.memberName}</td>
                  <td className="px-3 py-2.5 text-center text-xs text-slate-500">{s.groupName}</td>
                  <td className="px-3 py-2.5 text-center text-slate-700">{s.played}</td>
                  <td className="px-3 py-2.5 text-center text-green-700 font-semibold">{s.won}</td>
                  <td className="px-3 py-2.5 text-center text-amber-600">{s.drawn}</td>
                  <td className="px-3 py-2.5 text-center text-red-500">{s.lost}</td>
                  <td className="px-3 py-2.5 text-center text-slate-700">{s.pointsFor}</td>
                  <td className="px-3 py-2.5 text-center text-slate-400">{s.pointsAgainst}</td>
                  <td className={cn('px-3 py-2.5 text-center font-semibold', s.pointDifference >= 0 ? 'text-green-600' : 'text-red-500')}>
                    {s.pointDifference > 0 ? '+' : ''}{s.pointDifference}
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold text-indigo-700 text-base">{s.rankingPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
