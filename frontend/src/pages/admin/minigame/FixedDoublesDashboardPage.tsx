import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Users, Calendar, Trophy, Shuffle, RefreshCw,
  Clock, Edit2, Trash2, Plus, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Button } from '../../../components/ui/Button'
import { useMinigameStore } from '../../../store/minigameStore'
import type { MiniGameTeam, MiniGameTeamMatch, MiniGameTeamStanding } from '../../../types/minigame'
import toast from 'react-hot-toast'

// ── helpers ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', color ?? 'text-slate-900')}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── sub-panels ────────────────────────────────────────────────────────────────

function DraftPanel({ minigameId }: { minigameId: string }) {
  const { participants, autoGenerateTeams } = useMinigameStore()
  const parts = participants.filter(p => p.minigameId === minigameId && p.status === 'ACTIVE')
  const [loading, setLoading] = useState(false)

  const handleAuto = async () => {
    if (parts.length < 2) { toast.error('Cần ít nhất 2 người tham gia'); return }
    if (parts.length % 2 !== 0) { toast.error('Số người tham gia phải là số chẵn'); return }
    setLoading(true)
    try {
      autoGenerateTeams(minigameId)
      toast.success('Đã ghép cặp đội!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Users size={16} /> Danh Sách Người Tham Gia ({parts.length})
          </h3>
          <Button onClick={handleAuto} disabled={loading}>
            <Shuffle size={14} /> Ghép Cặp Tự Động
          </Button>
        </div>
        {parts.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">Chưa có người tham gia</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {parts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                <span className="w-5 h-5 bg-slate-200 rounded-full text-xs flex items-center justify-center font-medium text-slate-600">{i + 1}</span>
                <span className="text-sm text-slate-800 truncate">{p.memberName}</span>
                {p.skillLevel && <span className="ml-auto text-xs text-slate-400">{p.skillLevel}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      {parts.length % 2 !== 0 && parts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
          ⚠️ Số người tham gia lẻ ({parts.length}). Cần số chẵn để ghép cặp đội.
        </div>
      )}
    </div>
  )
}

function PairedPanel({ minigameId, teams }: { minigameId: string; teams: MiniGameTeam[] }) {
  const { generateTeamRoundRobinSchedule, updateTeam, removeTeam, autoGenerateTeams } = useMinigameStore()
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleGenSchedule = () => {
    if (teams.length < 2) { toast.error('Cần ít nhất 2 đội'); return }
    generateTeamRoundRobinSchedule(minigameId)
    toast.success('Đã tạo lịch vòng tròn!')
  }

  const handleSaveName = (id: string) => {
    if (!editName.trim()) return
    updateTeam(id, { name: editName.trim() })
    setEditId(null)
    toast.success('Đã cập nhật tên đội')
  }

  const handleRemove = (id: string) => {
    removeTeam(id)
    toast.success('Đã xóa đội')
  }

  const handleRegenerate = () => {
    autoGenerateTeams(minigameId)
    toast.success('Đã ghép lại đội!')
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Users size={16} /> Danh Sách Đội ({teams.length})
          </h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleRegenerate}>
              <RefreshCw size={14} /> Ghép Lại
            </Button>
            <Button onClick={handleGenSchedule}>
              <Calendar size={14} /> Tạo Lịch Vòng Tròn
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {teams.map((team, i) => (
            <div key={team.id} className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-3">
              <span className="w-7 h-7 bg-orange-100 text-orange-700 rounded-full text-sm flex items-center justify-center font-semibold">{i + 1}</span>
              {editId === team.id ? (
                <input
                  autoFocus
                  className="flex-1 text-sm border border-slate-300 rounded px-2 py-1 outline-none focus:border-orange-400"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(team.id); if (e.key === 'Escape') setEditId(null) }}
                />
              ) : (
                <span className="flex-1 font-medium text-slate-900">{team.name}</span>
              )}
              <div className="text-sm text-slate-600">
                {team.player1.memberName} &amp; {team.player2.memberName}
              </div>
              {team.player1.skillLevel && team.player2.skillLevel && (
                <span className="text-xs text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                  ∑{(team.player1.skillLevel ?? 0) + (team.player2.skillLevel ?? 0)}
                </span>
              )}
              <div className="flex gap-1">
                {editId === team.id ? (
                  <Button size="sm" variant="ghost" onClick={() => handleSaveName(team.id)}>✓</Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => { setEditId(team.id); setEditName(team.name) }}>
                    <Edit2 size={13} />
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => handleRemove(team.id)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SchedulePanel({ minigameId, schedule, teams, canEnterResults }: {
  minigameId: string
  schedule: MiniGameTeamMatch[]
  teams: MiniGameTeam[]
  canEnterResults: boolean
}) {
  const { enterTeamMatchResult, deleteTeamMatchResult, clearTeamSchedule } = useMinigameStore()
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set([1]))
  const [scoring, setScoring] = useState<{ matchId: string; s1: string; s2: string } | null>(null)

  const teamName = (id: string) => teams.find(t => t.id === id)?.name ?? id
  const teamPlayers = (id: string) => {
    const t = teams.find(tt => tt.id === id)
    return t ? `${t.player1.memberName} & ${t.player2.memberName}` : ''
  }

  const rounds = Array.from(new Set(schedule.map(m => m.round))).sort((a, b) => a - b)

  const toggleRound = (r: number) => {
    setExpandedRounds(prev => {
      const n = new Set(prev)
      n.has(r) ? n.delete(r) : n.add(r)
      return n
    })
  }

  const handleSubmitScore = (matchId: string) => {
    if (!scoring || scoring.matchId !== matchId) return
    const s1 = parseInt(scoring.s1)
    const s2 = parseInt(scoring.s2)
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) { toast.error('Điểm không hợp lệ'); return }
    enterTeamMatchResult(matchId, s1, s2)
    setScoring(null)
    toast.success('Đã lưu kết quả!')
  }

  const handleDelete = (matchId: string) => {
    deleteTeamMatchResult(matchId)
    toast.success('Đã xóa kết quả')
  }

  const handleClearSchedule = () => {
    clearTeamSchedule(minigameId)
    toast.success('Đã xóa lịch thi đấu')
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={handleClearSchedule}>
          <Trash2 size={14} /> Xóa Lịch
        </Button>
      </div>
      {rounds.map(round => {
        const roundMatches = schedule.filter(m => m.round === round)
        const completed = roundMatches.filter(m => m.status === 'COMPLETED').length
        const expanded = expandedRounds.has(round)
        return (
          <div key={round} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
              onClick={() => toggleRound(round)}
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-900">Vòng {round}</span>
                <span className="text-xs text-slate-500">{completed}/{roundMatches.length} trận xong</span>
                {completed === roundMatches.length && (
                  <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">✓ Hoàn thành</span>
                )}
              </div>
              {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>
            {expanded && (
              <div className="divide-y divide-slate-50">
                {roundMatches.map(match => {
                  const isScoring = scoring?.matchId === match.id
                  const isDone = match.status === 'COMPLETED'
                  return (
                    <div key={match.id} className="px-5 py-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'font-semibold text-sm',
                              isDone && match.winningTeamId === match.team1Id ? 'text-green-700' : 'text-slate-900'
                            )}>
                              {teamName(match.team1Id)}
                            </span>
                            <span className="text-xs text-slate-400">({teamPlayers(match.team1Id)})</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn(
                              'font-semibold text-sm',
                              isDone && match.winningTeamId === match.team2Id ? 'text-green-700' : 'text-slate-900'
                            )}>
                              {teamName(match.team2Id)}
                            </span>
                            <span className="text-xs text-slate-400">({teamPlayers(match.team2Id)})</span>
                          </div>
                        </div>

                        {isDone ? (
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-slate-900">
                              {match.team1Score} – {match.team2Score}
                            </span>
                            {canEnterResults && (
                              <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(match.id)}>
                                <Trash2 size={13} />
                              </Button>
                            )}
                          </div>
                        ) : isScoring ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number" min={0}
                              className="w-14 text-center border border-slate-300 rounded px-1 py-1 text-sm focus:border-orange-400 outline-none"
                              value={scoring.s1}
                              onChange={e => setScoring(s => s ? { ...s, s1: e.target.value } : s)}
                            />
                            <span className="text-slate-400">–</span>
                            <input
                              type="number" min={0}
                              className="w-14 text-center border border-slate-300 rounded px-1 py-1 text-sm focus:border-orange-400 outline-none"
                              value={scoring.s2}
                              onChange={e => setScoring(s => s ? { ...s, s2: e.target.value } : s)}
                            />
                            <Button size="sm" onClick={() => handleSubmitScore(match.id)}>Lưu</Button>
                            <Button size="sm" variant="ghost" onClick={() => setScoring(null)}>✕</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 flex items-center gap-1">
                              <Clock size={10} /> Chờ
                            </span>
                            {canEnterResults && (
                              <Button size="sm" variant="ghost" onClick={() => setScoring({ matchId: match.id, s1: '', s2: '' })}>
                                <Plus size={13} /> Nhập điểm
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function StandingsPanel({ standings }: { standings: MiniGameTeamStanding[] }) {
  if (standings.length === 0) {
    return <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-400 text-sm">Chưa có dữ liệu xếp hạng</div>
  }
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <Trophy size={16} className="text-amber-500" />
        <span className="font-semibold text-slate-900">Bảng Xếp Hạng</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <th className="text-center px-3 py-2 w-8">#</th>
              <th className="text-left px-3 py-2">Đội</th>
              <th className="text-left px-3 py-2">Thành Viên</th>
              <th className="text-center px-3 py-2">TĐ</th>
              <th className="text-center px-3 py-2">T</th>
              <th className="text-center px-3 py-2">H</th>
              <th className="text-center px-3 py-2">B</th>
              <th className="text-center px-3 py-2">ĐV/ĐT</th>
              <th className="text-center px-3 py-2">HS</th>
              <th className="text-center px-3 py-2">Điểm</th>
              <th className="text-center px-3 py-2">Tỷ lệ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {standings.map(s => (
              <tr key={s.teamId} className={cn(
                'transition-colors hover:bg-slate-50/50',
                s.rank === 1 && 'bg-amber-50/50',
                s.rank === 2 && 'bg-slate-50/60',
                s.rank === 3 && 'bg-orange-50/40',
              )}>
                <td className="text-center px-3 py-2.5">
                  {s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : <span className="text-slate-500 font-medium">{s.rank}</span>}
                </td>
                <td className="px-3 py-2.5 font-semibold text-slate-900">{s.teamName}</td>
                <td className="px-3 py-2.5 text-slate-600 text-xs">{s.player1Name} &amp; {s.player2Name}</td>
                <td className="text-center px-3 py-2.5 text-slate-700">{s.played}</td>
                <td className="text-center px-3 py-2.5 text-green-700 font-medium">{s.won}</td>
                <td className="text-center px-3 py-2.5 text-slate-500">{s.drawn}</td>
                <td className="text-center px-3 py-2.5 text-red-500">{s.lost}</td>
                <td className="text-center px-3 py-2.5 text-slate-600">{s.pointsFor}/{s.pointsAgainst}</td>
                <td className={cn('text-center px-3 py-2.5 font-medium', s.pointDifference > 0 ? 'text-green-600' : s.pointDifference < 0 ? 'text-red-500' : 'text-slate-500')}>
                  {s.pointDifference > 0 ? '+' : ''}{s.pointDifference}
                </td>
                <td className="text-center px-3 py-2.5 font-bold text-orange-700">{s.rankingPoints}</td>
                <td className="text-center px-3 py-2.5 text-slate-600">{(s.winRate * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export function FixedDoublesDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getMinigame, getTeams, getTeamStandings, getFixedDoublesDashboard } = useMinigameStore()

  const mg = getMinigame(id!)
  if (!mg) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">Không tìm thấy minigame</p>
      </div>
    )
  }

  const teams = getTeams(id!)
  const standings = getTeamStandings(id!)
  const dashboard = getFixedDoublesDashboard(id!)
  const kpi = dashboard?.kpi
  const schedule = dashboard?.schedule ?? []

  const STATUS_COLOR: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-600',
    PAIRED: 'bg-violet-100 text-violet-700',
    SCHEDULED: 'bg-indigo-100 text-indigo-700',
    IN_PROGRESS: 'bg-amber-100 text-amber-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-600',
  }
  const STATUS_LABEL: Record<string, string> = {
    DRAFT: 'Nháp', PAIRED: 'Đã Ghép Cặp', SCHEDULED: 'Có Lịch',
    IN_PROGRESS: 'Đang Diễn Ra', COMPLETED: 'Hoàn Thành', CANCELLED: 'Đã Hủy',
  }

  const canEnterResults = mg.status === 'SCHEDULED' || mg.status === 'IN_PROGRESS'
  const showSchedule = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].includes(mg.status)

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {/* header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/minigames')}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900 truncate">{mg.name}</h1>
              <span className="text-xs bg-orange-100 text-orange-700 font-medium px-2 py-0.5 rounded-full">🤝 Đôi Cố Định</span>
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLOR[mg.status] ?? 'bg-slate-100 text-slate-500')}>
                {STATUS_LABEL[mg.status] ?? mg.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {mg.startDate}{mg.endDate ? ` → ${mg.endDate}` : ''}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/minigames/${id}/edit`)}>
            <Edit2 size={14} /> Chỉnh Sửa
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* champion banner */}
        {mg.status === 'COMPLETED' && standings.length > 0 && (
          <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-xl p-6 text-white text-center shadow-md">
            <div className="text-3xl mb-2">🏆</div>
            <p className="text-sm font-medium opacity-90">Nhà Vô Địch</p>
            <p className="text-2xl font-bold">{standings[0].teamName}</p>
            <p className="text-sm opacity-90">{standings[0].player1Name} &amp; {standings[0].player2Name}</p>
            <p className="text-sm font-semibold mt-1">{standings[0].rankingPoints} điểm · {standings[0].won} thắng</p>
          </div>
        )}

        {/* KPI */}
        {showSchedule && kpi && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <KpiCard label="Số Đội" value={kpi.totalTeams} color="text-orange-700" />
            <KpiCard label="Tổng Trận" value={kpi.totalMatches} />
            <KpiCard label="Đã Xong" value={`${kpi.completedMatches}/${kpi.totalMatches}`} color="text-green-700" />
            <KpiCard
              label="Hoàn Thành"
              value={`${kpi.completionRate}%`}
              sub={`${kpi.pendingMatches} trận còn lại`}
              color={kpi.completionRate === 100 ? 'text-green-700' : 'text-slate-900'}
            />
          </div>
        )}

        {/* status-specific panels */}
        {mg.status === 'DRAFT' && <DraftPanel minigameId={id!} />}

        {mg.status === 'PAIRED' && <PairedPanel minigameId={id!} teams={teams} />}

        {showSchedule && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Calendar size={14} /> Lịch Thi Đấu
              </h2>
              <SchedulePanel
                minigameId={id!}
                schedule={schedule}
                teams={teams}
                canEnterResults={canEnterResults}
              />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Trophy size={14} /> Xếp Hạng
              </h2>
              <StandingsPanel standings={standings} />
            </div>
          </div>
        )}

        {/* paired: also show standings if any results exist */}
        {mg.status === 'PAIRED' && standings.length > 0 && (
          <StandingsPanel standings={standings} />
        )}
      </div>
    </div>
  )
}
