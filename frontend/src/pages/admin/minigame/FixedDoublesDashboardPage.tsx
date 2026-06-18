import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Edit2, Bell, MoreHorizontal, Calendar, Trophy,
  ChevronDown, ChevronUp, Shuffle, RefreshCw, Plus, Trash2,
  Check, X, MoreVertical, AlertCircle, TrendingUp,
  Users, Target, Activity,
} from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Button } from '../../../components/ui/Button'
import { useMinigameStore } from '../../../store/minigameStore'
import { useIsMobile } from '../../../hooks/useIsMobile'
import type { MiniGameTeam, MiniGameTeamMatch, MiniGameTeamStanding } from '../../../types/minigame'
import toast from 'react-hot-toast'

// ── design tokens ──────────────────────────────────────────────────────────────
const T = {
  brand:   '#4F46E5',
  cyan:    '#06B6D4',
  success: '#22C55E',
  warning: '#F59E0B',
  danger:  '#EF4444',
  bg:      '#F8FAFC',
  card:    '#FFFFFF',
  border:  '#E2E8F0',
  txt1:    '#0F172A',
  txt2:    '#64748B',
}

const CARD = {
  background: T.card,
  borderRadius: 16,
  border: `1px solid ${T.border}`,
  boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
}

// ── status config ──────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT:       { label: 'Nháp',          bg: '#F1F5F9', color: '#64748B' },
  PAIRED:      { label: 'Đã Ghép Cặp',  bg: '#F5F3FF', color: '#7C3AED' },
  SCHEDULED:   { label: 'Có Lịch',      bg: '#EEF2FF', color: '#4F46E5' },
  IN_PROGRESS: { label: 'Đang Diễn Ra', bg: '#DCFCE7', color: '#16A34A' },
  COMPLETED:   { label: 'Hoàn Thành',   bg: '#DCFCE7', color: '#16A34A' },
  CANCELLED:   { label: 'Đã Hủy',       bg: '#FEE2E2', color: '#DC2626' },
}

const MATCH_STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:   { label: 'Chờ',     bg: '#FEF3C7', color: '#D97706' },
  COMPLETED: { label: 'Đã xong', bg: '#DCFCE7', color: '#16A34A' },
  CANCELLED: { label: 'Đã hủy',  bg: '#FEE2E2', color: '#DC2626' },
}

// ── small helpers ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, bg: '#F1F5F9', color: '#64748B' }
  return (
    <span
      className="text-[11px] font-semibold rounded-full px-2.5 py-0.5 inline-flex items-center gap-1"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  )
}

function MatchStatusBadge({ status }: { status: string }) {
  const cfg = MATCH_STATUS_CFG[status] ?? { label: status, bg: '#F1F5F9', color: '#64748B' }
  return (
    <span
      className="text-[10px] font-semibold rounded-full px-2 py-0.5 inline-flex items-center gap-1 whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}

// ── KPI card ───────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, accent, icon,
}: {
  label: string; value: string | number; sub?: string; accent?: string; icon: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col justify-between p-[18px]"
      style={{ ...CARD, minHeight: 96 }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: T.txt2 }}>{label}</p>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#F1F5F9' }}>
          {icon}
        </span>
      </div>
      <div>
        <p className="text-2xl font-extrabold leading-none mt-2" style={{ color: accent ?? T.txt1 }}>{value}</p>
        {sub && <p className="text-[11px] mt-1" style={{ color: T.txt2 }}>{sub}</p>}
      </div>
    </div>
  )
}

// ── score modal ────────────────────────────────────────────────────────────────
interface ScoreModalProps {
  match: MiniGameTeamMatch
  team1Name: string; team1Members: string
  team2Name: string; team2Members: string
  onSave: (s1: number, s2: number) => void
  onClose: () => void
}
function ScoreModal({ match, team1Name, team1Members, team2Name, team2Members, onSave, onClose }: ScoreModalProps) {
  const [s1, setS1] = useState(match.team1Score ?? 0)
  const [s2, setS2] = useState(match.team2Score ?? 0)
  const adj = (set: React.Dispatch<React.SetStateAction<number>>, d: number) =>
    set(v => Math.max(0, v + d))
  const save = () => {
    if (s1 === s2) { toast.error('Không được hòa — cần người thắng'); return }
    onSave(s1, s2)
  }
  const sides = [
    { name: team1Name, members: team1Members, val: s1, set: setS1 },
    { name: team2Name, members: team2Members, val: s2, set: setS2 },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: T.border }}>
          <p className="font-bold text-slate-900">Nhập Kết Quả</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {sides.map((side, i) => (
            <div key={i}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: T.brand }}>{side.name}</p>
              <p className="text-[11px] mb-2" style={{ color: T.txt2 }}>{side.members}</p>
              <div className="flex items-center gap-3">
                <button onClick={() => adj(side.set, -1)}
                  className="w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-lg text-slate-500 hover:bg-slate-50 transition-colors"
                  style={{ borderColor: T.border }}>−</button>
                <input type="number" min={0} value={side.val}
                  onChange={e => side.set(Math.max(0, parseInt(e.target.value) || 0))}
                  className="flex-1 text-center text-2xl font-extrabold border rounded-xl py-2 outline-none focus:ring-2 focus:ring-indigo-300"
                  style={{ borderColor: T.border }} />
                <button onClick={() => adj(side.set, 1)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg text-white"
                  style={{ background: `linear-gradient(135deg,${T.brand},${T.cyan})` }}>+</button>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Hủy</Button>
          <button onClick={save}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: `linear-gradient(135deg,${T.brand},${T.cyan})` }}>
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
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400 transition-colors">
        <MoreVertical size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border py-1 z-30" style={{ borderColor: T.border }}>
          <button onClick={() => { onScore(); setOpen(false) }}
            className="w-full text-left text-sm px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700">
            <Plus size={13} /> {isDone ? 'Sửa điểm' : 'Nhập điểm'}
          </button>
          <button onClick={() => { onDelete(); setOpen(false) }}
            className="w-full text-left text-sm px-3 py-2 hover:bg-red-50 flex items-center gap-2 text-red-500">
            <Trash2 size={13} /> Xóa lịch
          </button>
        </div>
      )}
    </div>
  )
}

// ── match row ──────────────────────────────────────────────────────────────────
interface TeamInfo { name: string; members: string }

function MatchRow({
  match, matchNumber, team1, team2, canEnter, onEnterScore, onDelete,
}: {
  match: MiniGameTeamMatch
  matchNumber: number
  team1: TeamInfo; team2: TeamInfo
  canEnter: boolean
  onEnterScore: (m: MiniGameTeamMatch) => void
  onDelete: (id: string) => void
}) {
  const isDone   = match.status === 'COMPLETED'
  const t1Win    = isDone && match.winningTeamId === match.team1Id
  const t2Win    = isDone && match.winningTeamId === match.team2Id

  // ── desktop row (grid) ─────────────────────────────────────────────────────
  const desktopRow = (
    <div
      className="hidden md:grid items-center gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors border-b last:border-0 group"
      style={{ gridTemplateColumns: '52px 1fr 36px 1fr 72px 84px 28px', borderColor: T.border }}
    >
      {/* match # */}
      <span className="text-[11px] font-bold text-slate-400 tabular-nums text-center">#{matchNumber}</span>

      {/* team 1 */}
      <div className="min-w-0">
        <p className={cn('text-sm font-bold truncate', t1Win ? 'text-green-700' : 'text-slate-900')}>
          {t1Win && <span className="mr-1">🏆</span>}{team1.name}
        </p>
        <p className="text-[11px] truncate mt-0.5" style={{ color: T.txt2 }}>{team1.members}</p>
      </div>

      {/* VS */}
      <div className="text-center text-[11px] font-bold" style={{ color: T.txt2 }}>VS</div>

      {/* team 2 */}
      <div className="min-w-0">
        <p className={cn('text-sm font-bold truncate', t2Win ? 'text-green-700' : 'text-slate-900')}>
          {t2Win && <span className="mr-1">🏆</span>}{team2.name}
        </p>
        <p className="text-[11px] truncate mt-0.5" style={{ color: T.txt2 }}>{team2.members}</p>
      </div>

      {/* score */}
      <div className="text-center tabular-nums">
        {isDone ? (
          <span className="font-extrabold text-sm">
            <span style={{ color: t1Win ? T.success : T.txt2 }}>{match.team1Score}</span>
            <span className="mx-1 text-slate-300">–</span>
            <span style={{ color: t2Win ? T.success : T.txt2 }}>{match.team2Score}</span>
          </span>
        ) : (
          <span className="text-slate-300 text-sm font-bold">– : –</span>
        )}
      </div>

      {/* status + enter */}
      <div className="flex items-center justify-center gap-1.5">
        {!isDone && canEnter ? (
          <button
            onClick={() => onEnterScore(match)}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg text-white whitespace-nowrap"
            style={{ background: `linear-gradient(135deg,${T.brand},${T.cyan})` }}>
            Nhập điểm
          </button>
        ) : (
          <MatchStatusBadge status={match.status} />
        )}
      </div>

      {/* menu */}
      <div className="flex justify-center">
        <MatchMenu isDone={isDone} onScore={() => onEnterScore(match)} onDelete={() => onDelete(match.id)} />
      </div>
    </div>
  )

  // ── mobile card ────────────────────────────────────────────────────────────
  const mobileCard = (
    <div className="md:hidden p-4 border-b last:border-0" style={{ borderColor: T.border }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-slate-400">Trận #{matchNumber}</span>
        <div className="flex items-center gap-1.5">
          <MatchStatusBadge status={match.status} />
          <MatchMenu isDone={isDone} onScore={() => onEnterScore(match)} onDelete={() => onDelete(match.id)} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-bold', t1Win ? 'text-green-700' : 'text-slate-900')}>
            {t1Win && '🏆 '}{team1.name}
          </p>
          <p className="text-[11px]" style={{ color: T.txt2 }}>{team1.members}</p>
        </div>
        <div className="shrink-0 text-center px-2">
          {isDone ? (
            <p className="text-base font-extrabold tabular-nums" style={{ color: T.txt1 }}>
              {match.team1Score} – {match.team2Score}
            </p>
          ) : (
            <p className="text-xs font-bold text-slate-300">VS</p>
          )}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className={cn('text-sm font-bold', t2Win ? 'text-green-700' : 'text-slate-900')}>
            {team2.name}{t2Win && ' 🏆'}
          </p>
          <p className="text-[11px]" style={{ color: T.txt2 }}>{team2.members}</p>
        </div>
      </div>
      {!isDone && canEnter && (
        <button
          onClick={() => onEnterScore(match)}
          className="mt-3 w-full py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: `linear-gradient(135deg,${T.brand},${T.cyan})` }}>
          Nhập điểm
        </button>
      )}
    </div>
  )

  return (
    <>
      {desktopRow}
      {mobileCard}
    </>
  )
}

// ── round card ─────────────────────────────────────────────────────────────────
function RoundCard({
  round, matches, getTeamInfo, canEnter, onEnterScore, onDelete,
}: {
  round: number
  matches: MiniGameTeamMatch[]
  getTeamInfo: (id: string) => TeamInfo
  canEnter: boolean
  onEnterScore: (m: MiniGameTeamMatch) => void
  onDelete: (id: string) => void
}) {
  const done    = matches.filter(m => m.status === 'COMPLETED').length
  const allDone = done === matches.length
  const hasInProgress = matches.some(m => m.status !== 'COMPLETED' && m.status !== 'PENDING')
  // default open: round 1, or if has in-progress, or already has results
  const defaultOpen = round === 1 || done > 0 || hasInProgress
  const [open, setOpen] = useState(defaultOpen)
  const pct = matches.length > 0 ? (done / matches.length) * 100 : 0

  return (
    <div style={CARD} className="overflow-hidden">
      {/* header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/60 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full text-[11px] font-extrabold text-white flex items-center justify-center"
            style={{ background: `linear-gradient(135deg,${T.brand},${T.cyan})` }}>
            {round}
          </span>
          <span className="font-bold text-sm" style={{ color: T.txt1 }}>Vòng {round}</span>
          <span className="text-[11px]" style={{ color: T.txt2 }}>{done}/{matches.length} trận</span>
          {allDone && (
            <span className="text-[10px] font-semibold rounded-full px-2 py-0.5"
              style={{ background: '#DCFCE7', color: '#16A34A' }}>✓ Hoàn thành</span>
          )}
          {!allDone && done === 0 && (
            <span className="text-[10px] font-semibold rounded-full px-2 py-0.5"
              style={{ background: '#F1F5F9', color: T.txt2 }}>Chưa diễn ra</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* progress bar */}
          <div className="hidden sm:block h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: `linear-gradient(90deg,${T.brand},${T.cyan})` }} />
          </div>
          {open
            ? <ChevronUp size={15} style={{ color: T.txt2 }} />
            : <ChevronDown size={15} style={{ color: T.txt2 }} />}
        </div>
      </button>

      {/* matches */}
      {open && (
        <div style={{ borderTop: `1px solid ${T.border}` }}>
          {/* desktop header row */}
          <div
            className="hidden md:grid px-4 py-2"
            style={{ gridTemplateColumns: '52px 1fr 36px 1fr 72px 84px 28px', borderBottom: `1px solid ${T.border}` }}
          >
            {['Trận', 'Đội 1', '', 'Đội 2', 'Tỷ số', 'Trạng thái', ''].map((h, i) => (
              <span key={i} className="text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: T.txt2 }}>
                {h}
              </span>
            ))}
          </div>
          {matches.map((m, idx) => (
            <MatchRow
              key={m.id}
              match={m}
              matchNumber={idx + 1}
              team1={getTeamInfo(m.team1Id)}
              team2={getTeamInfo(m.team2Id)}
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

// ── compact ranking ────────────────────────────────────────────────────────────
function CompactRankingCard({ standings }: { standings: MiniGameTeamStanding[] }) {
  return (
    <div style={CARD} className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: T.border }}>
        <div className="flex items-center gap-2">
          <Trophy size={14} style={{ color: T.warning }} />
          <span className="font-bold text-sm" style={{ color: T.txt1 }}>Bảng Xếp Hạng</span>
        </div>
      </div>
      {standings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
          <Trophy size={24} className="mb-2 opacity-30" />
          <p className="text-xs">Chưa có dữ liệu</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              {['#', 'Đội', 'TĐ', 'H.Số', 'Điểm'].map((h, i) => (
                <th key={i}
                  className={cn('py-2 text-[10px] font-bold uppercase tracking-wider', i === 1 ? 'text-left pl-3' : 'text-center px-2')}
                  style={{ color: T.txt2 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standings.map(s => (
              <tr key={s.teamId} className={cn('hover:bg-slate-50/60 transition-colors', s.rank <= 3 && 'bg-amber-50/20')}
                style={{ borderBottom: `1px solid ${T.border}` }}>
                <td className="text-center py-2.5 px-2 text-base leading-none w-8">
                  {s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉'
                    : <span className="text-xs font-bold" style={{ color: T.txt2 }}>{s.rank}</span>}
                </td>
                <td className="py-2.5 pl-3 pr-2">
                  <p className="text-sm font-bold truncate" style={{ color: T.txt1 }}>{s.teamName}</p>
                  <p className="text-[10px] truncate" style={{ color: T.txt2 }}>
                    {s.player1Name} &amp; {s.player2Name}
                  </p>
                </td>
                <td className="text-center px-2 py-2.5 text-xs" style={{ color: T.txt2 }}>{s.played}</td>
                <td className={cn('text-center px-2 py-2.5 text-xs font-bold',
                  s.pointDifference > 0 ? 'text-green-600' : s.pointDifference < 0 ? 'text-red-500' : 'text-slate-400')}>
                  {s.pointDifference > 0 ? '+' : ''}{s.pointDifference}
                </td>
                <td className="text-center px-2 py-2.5 font-extrabold text-sm" style={{ color: T.brand }}>
                  {s.rankingPoints}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── quick stats card ───────────────────────────────────────────────────────────
function QuickStatsCard({ totalFor, totalAgainst, completedMatches }: {
  totalFor: number; totalAgainst: number; completedMatches: number
}) {
  const diff = totalFor - totalAgainst
  const avg  = completedMatches > 0 ? (totalFor / completedMatches).toFixed(1) : '–'
  const stats = [
    { label: 'Tổng điểm ghi', value: totalFor,   color: T.success },
    { label: 'Tổng điểm mất', value: totalAgainst, color: T.danger },
    { label: 'Hiệu số',       value: diff >= 0 ? `+${diff}` : diff, color: diff >= 0 ? T.success : T.danger },
    { label: 'Điểm TB/trận',  value: avg,         color: T.brand },
  ]
  return (
    <div style={CARD} className="overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: T.border }}>
        <TrendingUp size={14} style={{ color: T.brand }} />
        <span className="font-bold text-sm" style={{ color: T.txt1 }}>Thống Kê Nhanh</span>
      </div>
      <div className="grid grid-cols-2 gap-px" style={{ background: T.border }}>
        {stats.map((s, i) => (
          <div key={i} className="bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: T.txt2 }}>{s.label}</p>
            <p className="text-xl font-extrabold mt-1 leading-none" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── tournament status card ─────────────────────────────────────────────────────
function TournamentStatusCard({ status }: { status: string }) {
  if (status !== 'IN_PROGRESS') return null
  return (
    <div className="rounded-2xl border p-4 flex gap-3"
      style={{ background: '#EEF2FF', borderColor: '#C7D2FE' }}>
      <AlertCircle size={16} style={{ color: T.brand }} className="shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-bold" style={{ color: T.brand }}>Giải đấu đang diễn ra</p>
        <p className="text-xs mt-0.5" style={{ color: '#6366F1' }}>
          Nhập điểm sau mỗi trận để cập nhật bảng xếp hạng theo thời gian thực.
        </p>
      </div>
    </div>
  )
}

// ── recent activity card ───────────────────────────────────────────────────────
function RecentActivityCard({ entries }: { entries: string[] }) {
  return (
    <div style={CARD} className="overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: T.border }}>
        <Activity size={14} style={{ color: T.brand }} />
        <span className="font-bold text-sm" style={{ color: T.txt1 }}>Hoạt Động Gần Đây</span>
      </div>
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <Activity size={20} className="mb-2 opacity-30" />
          <p className="text-xs">Chưa có hoạt động nào được ghi lại</p>
        </div>
      ) : (
        <ul className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
          {entries.map((e, i) => (
            <li key={i} className="flex items-start gap-3 px-4 py-3">
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: T.brand }} />
              <span className="text-sm" style={{ color: T.txt2 }}>{e}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── draft / paired panels (unchanged logic) ────────────────────────────────────
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
    <div style={CARD} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-slate-400" />
          <span className="font-bold text-slate-900">Người Tham Gia ({parts.length})</span>
        </div>
        <Button onClick={handleAuto} disabled={loading}><Shuffle size={13} /> Ghép Cặp Tự Động</Button>
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
    <div style={CARD} className="p-5">
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
              style={{ background: `linear-gradient(135deg,${T.brand},${T.cyan})` }}>{i + 1}</span>
            {editId === team.id ? (
              <input autoFocus className="flex-1 text-sm border rounded-lg px-2 py-1 outline-none"
                value={editName} onChange={e => setEditName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { updateTeam(team.id, { name: editName.trim() }); setEditId(null); toast.success('Đã lưu') }
                  if (e.key === 'Escape') setEditId(null)
                }} />
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
  const {
    getMinigame, getTeams, getTeamStandings,
    getFixedDoublesDashboard, enterTeamMatchResult,
    deleteTeamMatchResult, clearTeamSchedule,
  } = useMinigameStore()

  const [scoreModal, setScoreModal]     = useState<MiniGameTeamMatch | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const isMobile = useIsMobile()

  const mg = getMinigame(id!)
  if (!mg) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: T.bg }}>
        <p className="text-slate-500">Không tìm thấy minigame</p>
      </div>
    )
  }

  const teams       = getTeams(id!)
  const standings   = getTeamStandings(id!)
  const dashboard   = getFixedDoublesDashboard(id!)
  const kpi         = dashboard?.kpi
  const schedule    = dashboard?.schedule ?? []
  const rounds      = Array.from(new Set(schedule.map(m => m.round))).sort((a, b) => a - b)

  const getTeamInfo = (tid: string): TeamInfo => {
    const t = teams.find(t => t.id === tid)
    return {
      name:    t?.name ?? tid,
      members: t ? `${t.player1.memberName} & ${t.player2.memberName}` : '',
    }
  }

  const canEnter   = mg.status === 'SCHEDULED' || mg.status === 'IN_PROGRESS'
  const showSched  = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].includes(mg.status)

  const completed  = schedule.filter(m => m.status === 'COMPLETED').length
  const totalFor   = schedule.reduce((s, m) => s + (m.team1Score ?? 0) + (m.team2Score ?? 0), 0)
  const totalAgain = schedule.filter(m => m.status === 'COMPLETED')
    .reduce((s, m) => s + (m.team1Score ?? 0) + (m.team2Score ?? 0), 0)

  const handleSaveScore = (matchId: string, s1: number, s2: number) => {
    enterTeamMatchResult(matchId, s1, s2)
    setScoreModal(null)
    toast.success('Đã lưu kết quả!')
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: T.bg }}>

      {/* ── sticky header ── */}
      <div className="bg-white border-b sticky top-0 z-20" style={{ borderColor: T.border }}>
        <div className="flex items-center gap-3 px-4 sm:px-6 min-h-[56px] py-2">
          <button
            onClick={() => navigate('/minigames')}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-extrabold truncate leading-tight" style={{ color: T.txt1 }}>
                {mg.name}
              </h1>
              {!isMobile && (mg.startDate || mg.endDate) && (
                <p className="text-[11px] leading-none" style={{ color: T.txt2 }}>
                  {mg.startDate}{mg.endDate ? ` → ${mg.endDate}` : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[11px] font-semibold rounded-full px-2 py-0.5"
                style={{ background: '#FEF3C7', color: '#D97706' }}>
                🤝 Đôi Cố Định
              </span>
              <StatusBadge status={mg.status} />
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              title="Chỉnh sửa"
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
              onClick={() => navigate(`/minigames/${id}/edit`)}
            >
              <Edit2 size={16} />
            </button>
            {!isMobile && (
              <>
                <button title="Thông báo" className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                  <Bell size={16} />
                </button>
                <button title="Thêm" className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                  <MoreHorizontal size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── page body ── */}
      <div className="px-4 sm:px-6 py-5 space-y-5">

        {/* champion banner */}
        {mg.status === 'COMPLETED' && standings.length > 0 && (
          <div className="rounded-2xl p-6 text-white text-center"
            style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)' }}>
            <div className="text-4xl mb-2">🏆</div>
            <p className="text-xs font-semibold opacity-80 uppercase tracking-widest mb-1">Nhà Vô Địch</p>
            <p className="text-2xl font-extrabold">{standings[0].teamName}</p>
            <p className="text-sm opacity-90 mt-0.5">{standings[0].player1Name} &amp; {standings[0].player2Name}</p>
            <p className="text-sm font-bold mt-1.5">{standings[0].rankingPoints} điểm · {standings[0].won} thắng</p>
          </div>
        )}

        {/* KPI — 4 columns */}
        {showSched && kpi && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Số đội"     value={kpi.totalTeams}     accent={T.brand}
              sub="cặp đôi tham gia"   icon={<Users size={14} style={{ color: T.brand }} />} />
            <KpiCard label="Tổng trận"  value={kpi.totalMatches}
              sub="trận đấu"           icon={<Calendar size={14} style={{ color: T.cyan }} />} />
            <KpiCard label="Đã xong"    value={`${kpi.completedMatches}/${kpi.totalMatches}`}
              accent={T.success}       sub="trận hoàn thành"
              icon={<Check size={14} style={{ color: T.success }} />} />
            <KpiCard label="Hoàn thành" value={`${kpi.completionRate}%`}
              accent={kpi.completionRate === 100 ? T.success : T.brand}
              sub={`${kpi.pendingMatches} trận còn lại`}
              icon={<Target size={14} style={{ color: T.warning }} />} />
          </div>
        )}

        {/* status-specific panels */}
        {mg.status === 'DRAFT'  && <DraftPanel  minigameId={id!} />}
        {mg.status === 'PAIRED' && <PairedPanel minigameId={id!} teams={teams} />}

        {/* main 12-col grid */}
        {showSched && (
          <div className="grid grid-cols-12 gap-5">

            {/* ── left: schedule ── */}
            <div className="col-span-12 lg:col-span-7 xl:col-span-8 space-y-3">
              {/* card header */}
              <div style={CARD} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={14} style={{ color: T.brand }} />
                  <span className="font-bold text-sm" style={{ color: T.txt1 }}>Lịch Thi Đấu</span>
                  <span className="text-[11px]" style={{ color: T.txt2 }}>
                    {completed}/{schedule.length} trận đã hoàn thành
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { clearTeamSchedule(id!); toast.success('Đã xóa lịch') }}
                    className="text-[11px] font-semibold text-red-400 hover:text-red-600 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={12} /> Xóa lịch
                  </button>
                </div>
              </div>

              {rounds.map(r => (
                <RoundCard
                  key={r}
                  round={r}
                  matches={schedule.filter(m => m.round === r)}
                  getTeamInfo={getTeamInfo}
                  canEnter={canEnter}
                  onEnterScore={setScoreModal}
                  onDelete={id => setDeleteConfirm(id)}
                />
              ))}

              {rounds.length === 0 && (
                <div style={CARD} className="py-14 text-center text-slate-400">
                  <Calendar size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Chưa có lịch thi đấu</p>
                </div>
              )}

              {/* recent activity — fills empty space below schedule */}
              <RecentActivityCard entries={[]} />
            </div>

            {/* ── right panel ── */}
            <div className="col-span-12 lg:col-span-5 xl:col-span-4 space-y-4">
              <CompactRankingCard standings={standings} />
              {completed > 0 && (
                <QuickStatsCard
                  totalFor={totalFor}
                  totalAgainst={totalAgain}
                  completedMatches={completed}
                />
              )}
              <TournamentStatusCard status={mg.status} />
            </div>
          </div>
        )}

        {/* paired + has results */}
        {mg.status === 'PAIRED' && standings.length > 0 && (
          <CompactRankingCard standings={standings} />
        )}
      </div>

      {/* ── score modal ── */}
      {scoreModal && (
        <ScoreModal
          match={scoreModal}
          team1Name={getTeamInfo(scoreModal.team1Id).name}
          team1Members={getTeamInfo(scoreModal.team1Id).members}
          team2Name={getTeamInfo(scoreModal.team2Id).name}
          team2Members={getTeamInfo(scoreModal.team2Id).members}
          onSave={(s1, s2) => handleSaveScore(scoreModal.id, s1, s2)}
          onClose={() => setScoreModal(null)}
        />
      )}

      {/* ── delete confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.6)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <p className="font-bold text-slate-900 mb-1">Xóa kết quả trận này?</p>
            <p className="text-sm text-slate-500 mb-5">Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 rounded-xl border text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                style={{ borderColor: T.border }}>
                Hủy
              </button>
              <button
                onClick={() => { deleteTeamMatchResult(deleteConfirm); setDeleteConfirm(null); toast.success('Đã xóa') }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: T.danger }}>
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
