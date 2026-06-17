import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Edit2, Bell, MoreHorizontal, Calendar, Trophy,
  ChevronDown, ChevronUp, Shuffle, RefreshCw, Plus, Trash2,
  Check, X, MoreVertical, AlertCircle, TrendingUp, Clock,
  Users, Target,
} from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Button } from '../../../components/ui/Button'
import { useMinigameStore } from '../../../store/minigameStore'
import type { MiniGameTeam, MiniGameTeamMatch, MiniGameTeamStanding } from '../../../types/minigame'
import toast from 'react-hot-toast'

// ── design tokens ──────────────────────────────────────────────────────────────
const T = {
  brand: '#4F46E5',
  cyan: '#06B6D4',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
}

// ── status config ──────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT:       { label: 'Nháp',         bg: '#F1F5F9', color: '#64748B' },
  PAIRED:      { label: 'Đã Ghép Cặp', bg: '#F5F3FF', color: '#7C3AED' },
  SCHEDULED:   { label: 'Có Lịch',     bg: '#EEF2FF', color: '#4F46E5' },
  IN_PROGRESS: { label: 'Đang Diễn Ra', bg: '#DCFCE7', color: '#16A34A' },
  COMPLETED:   { label: 'Hoàn Thành',  bg: '#DCFCE7', color: '#16A34A' },
  CANCELLED:   { label: 'Đã Hủy',      bg: '#FEE2E2', color: '#DC2626' },
}

// ── helpers ────────────────────────────────────────────────────────────────────
function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'xs' | 'sm' }) {
  const cfg = STATUS_CFG[status] ?? { label: status, bg: '#F1F5F9', color: '#64748B' }
  return (
    <span
      className={cn('font-semibold rounded-full px-2.5 py-0.5 inline-flex items-center gap-1', size === 'xs' ? 'text-[10px]' : 'text-xs')}
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  )
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: T.border }}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-2xl font-extrabold mt-1.5 leading-none" style={{ color: accent ?? '#0F172A' }}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

function QuickStatRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-0" style={{ borderColor: T.border }}>
      <div className="flex items-center gap-2.5 text-slate-500">
        <span className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-bold" style={{ color: color ?? '#0F172A' }}>{value}</span>
    </div>
  )
}

// ── score entry modal ──────────────────────────────────────────────────────────
interface ScoreModalProps {
  match: MiniGameTeamMatch
  team1Name: string
  team2Name: string
  onSave: (s1: number, s2: number) => void
  onClose: () => void
}
function ScoreModal({ match, team1Name, team2Name, onSave, onClose }: ScoreModalProps) {
  const [s1, setS1] = useState(match.team1Score ?? 0)
  const [s2, setS2] = useState(match.team2Score ?? 0)

  const adjust = (setter: React.Dispatch<React.SetStateAction<number>>, delta: number) =>
    setter(v => Math.max(0, v + delta))

  const handleSave = () => {
    if (s1 === s2) { toast.error('Không được hòa — cần người thắng'); return }
    onSave(s1, s2)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: T.border }}>
          <p className="font-bold text-slate-900">Nhập Kết Quả</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {[{ name: team1Name, val: s1, set: setS1 }, { name: team2Name, val: s2, set: setS2 }].map((side, i) => (
            <div key={i}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{side.name}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => adjust(side.set, -1)}
                  className="w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-lg text-slate-500 hover:bg-slate-50 transition-colors active:scale-95"
                  style={{ borderColor: T.border }}
                >−</button>
                <input
                  type="number" min={0}
                  value={side.val}
                  onChange={e => side.set(Math.max(0, parseInt(e.target.value) || 0))}
                  className="flex-1 text-center text-2xl font-extrabold border rounded-xl py-2 outline-none focus:ring-2"
                  style={{ borderColor: T.border }}
                />
                <button
                  onClick={() => adjust(side.set, 1)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg text-white transition-colors active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${T.brand}, ${T.cyan})` }}
                >+</button>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Hủy</Button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${T.brand}, ${T.cyan})` }}
          >
            <Check size={14} className="inline mr-1.5" />Lưu kết quả
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 3-dot match menu ───────────────────────────────────────────────────────────
function MatchMenu({ onScore, onDelete, isDone }: { onScore: () => void; onDelete: () => void; isDone: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border py-1 z-30" style={{ borderColor: T.border }}>
          <button
            onClick={() => { onScore(); setOpen(false) }}
            className="w-full text-left text-sm px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
          >
            <Plus size={13} /> {isDone ? 'Sửa điểm' : 'Nhập điểm'}
          </button>
          <button
            onClick={() => { onDelete(); setOpen(false) }}
            className="w-full text-left text-sm px-3 py-2 hover:bg-red-50 flex items-center gap-2 text-red-500"
          >
            <Trash2 size={13} /> Xóa lịch
          </button>
        </div>
      )}
    </div>
  )
}

// ── match row ──────────────────────────────────────────────────────────────────
function MatchRow({
  match, teamName, canEnter,
  onEnterScore, onDelete,
}: {
  match: MiniGameTeamMatch
  teamName: (id: string) => string
  canEnter: boolean
  onEnterScore: (match: MiniGameTeamMatch) => void
  onDelete: (id: string) => void
}) {
  const isDone = match.status === 'COMPLETED'
  const t1Win = isDone && match.winningTeamId === match.team1Id
  const t2Win = isDone && match.winningTeamId === match.team2Id

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors group">
      {/* teams */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          {t1Win && <span className="text-xs text-amber-500">🏆</span>}
          <span className={cn('text-sm font-semibold truncate', t1Win ? 'text-green-700' : 'text-slate-800')}>{teamName(match.team1Id)}</span>
        </div>
        <div className="flex items-center gap-2">
          {t2Win && <span className="text-xs text-amber-500">🏆</span>}
          <span className={cn('text-sm font-semibold truncate', t2Win ? 'text-green-700' : 'text-slate-800')}>{teamName(match.team2Id)}</span>
        </div>
      </div>

      {/* score / status */}
      <div className="flex items-center gap-3 shrink-0">
        {isDone ? (
          <div className="text-center min-w-[56px]">
            <span className={cn('font-extrabold text-base tabular-nums', t1Win ? 'text-green-700' : 'text-slate-400')}>{match.team1Score}</span>
            <span className="text-slate-300 mx-1">–</span>
            <span className={cn('font-extrabold text-base tabular-nums', t2Win ? 'text-green-700' : 'text-slate-400')}>{match.team2Score}</span>
          </div>
        ) : (
          <span className="text-[11px] font-medium rounded-full px-2 py-0.5 flex items-center gap-1" style={{ background: '#FEF3C7', color: '#D97706' }}>
            <Clock size={9} /> Chờ
          </span>
        )}

        {!isDone && canEnter && (
          <button
            onClick={() => onEnterScore(match)}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg text-white transition-all active:scale-95"
            style={{ background: `linear-gradient(135deg, ${T.brand}, ${T.cyan})` }}
          >
            Nhập điểm
          </button>
        )}

        <MatchMenu isDone={isDone} onScore={() => onEnterScore(match)} onDelete={() => onDelete(match.id)} />
      </div>
    </div>
  )
}

// ── round section ──────────────────────────────────────────────────────────────
function RoundSection({
  round, matches, teamName, canEnter,
  onEnterScore, onDelete,
}: {
  round: number
  matches: MiniGameTeamMatch[]
  teamName: (id: string) => string
  canEnter: boolean
  onEnterScore: (match: MiniGameTeamMatch) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(round === 1)
  const done = matches.filter(m => m.status === 'COMPLETED').length
  const allDone = done === matches.length

  return (
    <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: T.border }}>
      <button
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/60 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-900 text-sm">Vòng {round}</span>
          <span className="text-xs text-slate-400">{done}/{matches.length} trận</span>
          {allDone && (
            <span className="text-[10px] font-semibold rounded-full px-2 py-0.5" style={{ background: '#DCFCE7', color: '#16A34A' }}>
              ✓ Xong
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(done / matches.length) * 100}%`, background: `linear-gradient(90deg, ${T.brand}, ${T.cyan})` }}
            />
          </div>
          {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="divide-y" style={{ borderTopColor: T.border, borderTopWidth: 1 }}>
          {matches.map(m => (
            <MatchRow
              key={m.id}
              match={m}
              teamName={teamName}
              canEnter={canEnter}
              onEnterScore={onEnterScore}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── ranking table ──────────────────────────────────────────────────────────────
function RankingTable({ standings }: { standings: MiniGameTeamStanding[] }) {
  if (!standings.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <Trophy size={28} className="mb-2 opacity-40" />
        <p className="text-sm">Chưa có dữ liệu xếp hạng</p>
      </div>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b" style={{ borderColor: T.border }}>
            <th className="text-center px-3 py-2.5 w-8">#</th>
            <th className="text-left px-3 py-2.5">Đội</th>
            <th className="text-left px-3 py-2.5 hidden sm:table-cell">Thành viên</th>
            <th className="text-center px-2 py-2.5">TĐ</th>
            <th className="text-center px-2 py-2.5">Thắng</th>
            <th className="text-center px-2 py-2.5">H.Số</th>
            <th className="text-center px-2 py-2.5">Điểm</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ divideColor: T.border }}>
          {standings.map(s => (
            <tr
              key={s.teamId}
              className={cn('transition-colors hover:bg-slate-50/60', s.rank <= 3 && 'bg-amber-50/30')}
            >
              <td className="text-center px-3 py-2.5 text-base leading-none">
                {s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : (
                  <span className="text-xs font-semibold text-slate-400">{s.rank}</span>
                )}
              </td>
              <td className="px-3 py-2.5 font-bold text-slate-900">{s.teamName}</td>
              <td className="px-3 py-2.5 text-xs text-slate-500 hidden sm:table-cell">
                {s.player1Name} &amp; {s.player2Name}
              </td>
              <td className="text-center px-2 py-2.5 text-slate-600">{s.played}</td>
              <td className="text-center px-2 py-2.5 font-bold text-green-600">{s.won}</td>
              <td className={cn('text-center px-2 py-2.5 font-medium text-xs', s.pointDifference > 0 ? 'text-green-600' : s.pointDifference < 0 ? 'text-red-500' : 'text-slate-400')}>
                {s.pointDifference > 0 ? '+' : ''}{s.pointDifference}
              </td>
              <td className="text-center px-2 py-2.5 font-extrabold" style={{ color: T.brand }}>{s.rankingPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── draft / paired panels ──────────────────────────────────────────────────────
function DraftPanel({ minigameId }: { minigameId: string }) {
  const { participants, autoGenerateTeams } = useMinigameStore()
  const parts = participants.filter(p => p.minigameId === minigameId && p.status === 'ACTIVE')
  const [loading, setLoading] = useState(false)

  const handleAuto = async () => {
    if (parts.length < 2) { toast.error('Cần ít nhất 2 người'); return }
    if (parts.length % 2 !== 0) { toast.error('Số người cần là số chẵn'); return }
    setLoading(true)
    try { autoGenerateTeams(minigameId); toast.success('Đã ghép cặp đội!') }
    finally { setLoading(false) }
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5" style={{ borderColor: T.border }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-slate-400" />
          <span className="font-bold text-slate-900">Người Tham Gia ({parts.length})</span>
        </div>
        <Button onClick={handleAuto} disabled={loading}>
          <Shuffle size={13} /> Ghép Cặp Tự Động
        </Button>
      </div>
      {parts.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Chưa có người tham gia</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {parts.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <span className="w-5 h-5 rounded-full bg-slate-200 text-[10px] flex items-center justify-center font-bold text-slate-500">{i + 1}</span>
              <span className="text-sm text-slate-800 truncate">{p.memberName}</span>
            </div>
          ))}
        </div>
      )}
      {parts.length % 2 !== 0 && parts.length > 0 && (
        <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">⚠️ Số lẻ ({parts.length}) — cần chẵn để ghép đội</p>
      )}
    </div>
  )
}

function PairedPanel({ minigameId, teams }: { minigameId: string; teams: MiniGameTeam[] }) {
  const { generateTeamRoundRobinSchedule, updateTeam, removeTeam, autoGenerateTeams } = useMinigameStore()
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5" style={{ borderColor: T.border }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-slate-400" />
          <span className="font-bold text-slate-900">Danh Sách Đội ({teams.length})</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => { autoGenerateTeams(minigameId); toast.success('Đã ghép lại!') }}>
            <RefreshCw size={13} /> Ghép Lại
          </Button>
          <Button onClick={() => { generateTeamRoundRobinSchedule(minigameId); toast.success('Đã tạo lịch!') }}>
            <Calendar size={13} /> Tạo Lịch
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {teams.map((team, i) => (
          <div key={team.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: `linear-gradient(135deg, ${T.brand}, ${T.cyan})` }}>{i + 1}</span>
            {editId === team.id ? (
              <input
                autoFocus
                className="flex-1 text-sm border rounded-lg px-2 py-1 outline-none"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { updateTeam(team.id, { name: editName.trim() }); setEditId(null); toast.success('Đã lưu') }
                  if (e.key === 'Escape') setEditId(null)
                }}
              />
            ) : (
              <span className="flex-1 font-semibold text-slate-900">{team.name}</span>
            )}
            <span className="text-xs text-slate-500">{team.player1.memberName} &amp; {team.player2.memberName}</span>
            <Button size="sm" variant="ghost" onClick={() => { setEditId(team.id); setEditName(team.name) }}><Edit2 size={12} /></Button>
            <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-50" onClick={() => { removeTeam(team.id); toast.success('Đã xóa đội') }}><Trash2 size={12} /></Button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── main page ──────────────────────────────────────────────────────────────────
export function FixedDoublesDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getMinigame, getTeams, getTeamStandings, getFixedDoublesDashboard, enterTeamMatchResult, deleteTeamMatchResult, clearTeamSchedule } = useMinigameStore()

  const [scoreModal, setScoreModal] = useState<MiniGameTeamMatch | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const mg = getMinigame(id!)
  if (!mg) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: T.bg }}>
        <p className="text-slate-500">Không tìm thấy minigame</p>
      </div>
    )
  }

  const teams = getTeams(id!)
  const standings = getTeamStandings(id!)
  const dashboard = getFixedDoublesDashboard(id!)
  const kpi = dashboard?.kpi
  const schedule = dashboard?.schedule ?? []

  const rounds = Array.from(new Set(schedule.map(m => m.round))).sort((a, b) => a - b)
  const teamName = (tid: string) => teams.find(t => t.id === tid)?.name ?? tid

  const canEnterResults = mg.status === 'SCHEDULED' || mg.status === 'IN_PROGRESS'
  const showSchedule = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].includes(mg.status)

  const totalFor = schedule.reduce((s, m) => s + (m.team1Score ?? 0) + (m.team2Score ?? 0), 0)
  const totalAgainst = schedule.filter(m => m.status === 'COMPLETED').reduce((s, m) => s + (m.team1Score ?? 0) + (m.team2Score ?? 0), 0)
  const completedMatches = schedule.filter(m => m.status === 'COMPLETED').length
  const avgPerMatch = completedMatches > 0 ? (totalFor / completedMatches).toFixed(1) : '–'

  const handleSaveScore = (matchId: string, s1: number, s2: number) => {
    enterTeamMatchResult(matchId, s1, s2)
    setScoreModal(null)
    toast.success('Đã lưu kết quả!')
  }

  const handleDeleteMatch = (matchId: string) => {
    setDeleteConfirm(matchId)
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: T.bg }}>

      {/* ── Header ── */}
      <div className="bg-white border-b sticky top-0 z-20" style={{ borderColor: T.border }}>
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4">
          <button
            onClick={() => navigate('/minigames')}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-extrabold text-slate-900 truncate">{mg.name}</h1>
              <span className="text-[11px] font-semibold rounded-full px-2.5 py-0.5" style={{ background: '#FEF3C7', color: '#D97706' }}>
                🤝 Đôi Cố Định
              </span>
              <StatusBadge status={mg.status} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {mg.startDate}{mg.endDate ? ` → ${mg.endDate}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors" onClick={() => navigate(`/minigames/${id}/edit`)}>
              <Edit2 size={16} />
            </button>
            <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
              <Bell size={16} />
            </button>
            <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">

        {/* ── Champion banner ── */}
        {mg.status === 'COMPLETED' && standings.length > 0 && (
          <div className="rounded-2xl p-6 text-white text-center" style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}>
            <div className="text-4xl mb-2">🏆</div>
            <p className="text-xs font-semibold opacity-80 uppercase tracking-widest mb-1">Nhà Vô Địch</p>
            <p className="text-2xl font-extrabold">{standings[0].teamName}</p>
            <p className="text-sm opacity-90 mt-0.5">{standings[0].player1Name} &amp; {standings[0].player2Name}</p>
            <p className="text-sm font-bold mt-1.5">{standings[0].rankingPoints} điểm · {standings[0].won} thắng</p>
          </div>
        )}

        {/* ── KPI cards ── */}
        {showSchedule && kpi && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Số đội" value={kpi.totalTeams} accent={T.brand} />
            <KpiCard label="Tổng trận" value={kpi.totalMatches} />
            <KpiCard label="Đã xong" value={`${kpi.completedMatches}/${kpi.totalMatches}`} accent={T.success} />
            <KpiCard
              label="Hoàn thành"
              value={`${kpi.completionRate}%`}
              sub={`${kpi.pendingMatches} trận còn lại`}
              accent={kpi.completionRate === 100 ? T.success : T.brand}
            />
          </div>
        )}

        {/* ── Status panels ── */}
        {mg.status === 'DRAFT' && <DraftPanel minigameId={id!} />}
        {mg.status === 'PAIRED' && <PairedPanel minigameId={id!} teams={teams} />}

        {/* ── Main grid: schedule + sidebar ── */}
        {showSchedule && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">

            {/* Schedule */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Lịch Thi Đấu</h2>
                </div>
                <button
                  onClick={() => { clearTeamSchedule(id!); toast.success('Đã xóa lịch') }}
                  className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={12} /> Xóa lịch
                </button>
              </div>
              <div className="space-y-3">
                {rounds.map(round => (
                  <RoundSection
                    key={round}
                    round={round}
                    matches={schedule.filter(m => m.round === round)}
                    teamName={teamName}
                    canEnter={canEnterResults}
                    onEnterScore={setScoreModal}
                    onDelete={handleDeleteMatch}
                  />
                ))}
                {rounds.length === 0 && (
                  <div className="bg-white rounded-2xl border py-12 text-center text-slate-400" style={{ borderColor: T.border }}>
                    <Calendar size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Chưa có lịch thi đấu</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right sidebar */}
            <div className="space-y-4">

              {/* Rankings */}
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: T.border }}>
                <div className="px-4 py-3.5 border-b flex items-center gap-2" style={{ borderColor: T.border }}>
                  <Trophy size={15} style={{ color: T.warning }} />
                  <span className="font-bold text-slate-900 text-sm">Bảng Xếp Hạng</span>
                </div>
                <RankingTable standings={standings} />
              </div>

              {/* Quick stats */}
              {completedMatches > 0 && (
                <div className="bg-white rounded-2xl border shadow-sm p-4" style={{ borderColor: T.border }}>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={15} style={{ color: T.brand }} />
                    <span className="font-bold text-slate-900 text-sm">Thống Kê Nhanh</span>
                  </div>
                  <div className="mt-2">
                    <QuickStatRow icon={<Target size={13} />} label="Tổng điểm ghi" value={totalFor} color={T.success} />
                    <QuickStatRow icon={<Target size={13} />} label="Tổng điểm mất" value={totalAgainst} color={T.danger} />
                    <QuickStatRow
                      icon={<TrendingUp size={13} />}
                      label="Hiệu số"
                      value={`${totalFor - totalAgainst > 0 ? '+' : ''}${totalFor - totalAgainst}`}
                      color={totalFor >= totalAgainst ? T.success : T.danger}
                    />
                    <QuickStatRow icon={<BarIcon />} label="Điểm TB/trận" value={avgPerMatch} color={T.brand} />
                  </div>
                </div>
              )}

              {/* Info banner */}
              {mg.status === 'IN_PROGRESS' && (
                <div className="rounded-2xl border p-4 flex gap-3" style={{ background: '#EEF2FF', borderColor: '#C7D2FE' }}>
                  <AlertCircle size={16} style={{ color: T.brand }} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold" style={{ color: T.brand }}>Giải đấu đang diễn ra</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6366F1' }}>Nhập điểm sau mỗi trận để cập nhật bảng xếp hạng theo thời gian thực.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* paired + has results */}
        {mg.status === 'PAIRED' && standings.length > 0 && (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: T.border }}>
            <div className="px-4 py-3.5 border-b flex items-center gap-2" style={{ borderColor: T.border }}>
              <Trophy size={15} style={{ color: T.warning }} />
              <span className="font-bold text-slate-900 text-sm">Bảng Xếp Hạng</span>
            </div>
            <RankingTable standings={standings} />
          </div>
        )}
      </div>

      {/* ── Score modal ── */}
      {scoreModal && (
        <ScoreModal
          match={scoreModal}
          team1Name={teamName(scoreModal.team1Id)}
          team2Name={teamName(scoreModal.team2Id)}
          onSave={(s1, s2) => handleSaveScore(scoreModal.id, s1, s2)}
          onClose={() => setScoreModal(null)}
        />
      )}

      {/* ── Delete confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <p className="font-bold text-slate-900 mb-1">Xóa kết quả trận này?</p>
            <p className="text-sm text-slate-500 mb-5">Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 rounded-xl border text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors" style={{ borderColor: T.border }}>
                Hủy
              </button>
              <button
                onClick={() => { deleteTeamMatchResult(deleteConfirm); setDeleteConfirm(null); toast.success('Đã xóa') }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: T.danger }}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="1" y="7" width="2.5" height="5" rx="0.5" fill="currentColor" opacity="0.5" />
      <rect x="5.25" y="4" width="2.5" height="8" rx="0.5" fill="currentColor" opacity="0.75" />
      <rect x="9.5" y="1" width="2.5" height="11" rx="0.5" fill="currentColor" />
    </svg>
  )
}
