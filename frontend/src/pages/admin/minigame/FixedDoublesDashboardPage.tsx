import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Edit2, Calendar, Trophy,
  ChevronDown, ChevronUp, Plus, Trash2,
  Check, X, MoreVertical, AlertCircle, TrendingUp,
  Users, Target, Activity, Image as ImageIcon, FileText,
} from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Button } from '../../../components/ui/Button'
import { useMinigameStore } from '../../../store/minigameStore'
import { useAuthStore } from '../../../store/authStore'
import { useClubDataStore } from '../../../store/clubDataStore'
import { PairBuilder } from '../../../components/minigame/PairBuilder'
import { PageHeader } from '../../../components/layout/PageHeader'
import { MetricCard } from '../../../components/shared/MetricCard'
import { StatusBadge, type StatusTone } from '../../../components/shared/StatusBadge'
import type { MiniGame, MiniGameTeamMatch, MiniGameTeamStanding } from '../../../types/minigame'
import { normalizeMinigameStatus } from '../../../types/minigame'
import { exportStandingsPDF, exportSchedulePDF, captureElementAsReportPng } from '../../../lib/export'
import api from '../../../lib/api'
import toast from 'react-hot-toast'

const FD_EXPORT_ID = 'fd-standings-export'
const FD_SCHEDULE_ID = 'fd-schedule-export'
const FD_SPORT_LABEL: Record<string, string> = {
  PICKLEBALL: 'Pickleball', TENNIS: 'Tennis', BADMINTON: 'Cầu lông', TABLE_TENNIS: 'Bóng bàn',
  FOOTBALL: 'Bóng đá', BASKETBALL: 'Bóng rổ', GOLF: 'Golf',
}

// ── design tokens ──────────────────────────────────────────────────────────────
// Màu qua token --pf-* (đồng bộ Football/Golf).
const T = {
  brand:   'var(--pf-primary)',
  cyan:    'var(--pf-primary-hover)',
  success: 'var(--pf-color-success)',
  warning: 'var(--pf-color-warning)',
  danger:  'var(--pf-color-danger)',
  bg:      'var(--pf-bg)',
  card:    'var(--pf-surface)',
  border:  'var(--pf-border)',
  txt1:    'var(--pf-text)',
  txt2:    'var(--pf-color-muted)',
}

const CARD = {
  background: T.card,
  borderRadius: 16,
  border: `1px solid ${T.border}`,
  boxShadow: 'var(--pf-shadow)',
}

// ── match status → shared StatusBadge (tone + nhãn) ─────────────────────────────
const MATCH_STATUS: Record<string, { tone: StatusTone; label: string }> = {
  PENDING:   { tone: 'warning', label: 'Chờ' },
  COMPLETED: { tone: 'success', label: 'Đã xong' },
  CANCELLED: { tone: 'danger',  label: 'Đã hủy' },
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
      <div className="[background:var(--pf-surface)] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: T.border }}>
          <p className="font-bold [color:var(--pf-text)]">Nhập Kết Quả</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] transition-colors">
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
                  className="w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-lg [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] transition-colors"
                  style={{ borderColor: T.border }}>−</button>
                <input type="number" min={0} value={side.val}
                  onChange={e => side.set(Math.max(0, parseInt(e.target.value) || 0))}
                  className="flex-1 text-center text-2xl font-extrabold border rounded-xl py-2 outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]"
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
        className="w-7 h-7 rounded-lg flex items-center justify-center hover:[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] transition-colors">
        <MoreVertical size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 [background:var(--pf-surface)] rounded-xl shadow-lg border py-1 z-30" style={{ borderColor: T.border }}>
          <button onClick={() => { onScore(); setOpen(false) }}
            className="w-full text-left text-sm px-3 py-2 hover:[background:var(--pf-surface-muted)] flex items-center gap-2 [color:var(--pf-text)]">
            <Plus size={13} /> {isDone ? 'Sửa điểm' : 'Nhập điểm'}
          </button>
          <button onClick={() => { onDelete(); setOpen(false) }}
            className="w-full text-left text-sm px-3 py-2 hover:[background:var(--pf-color-danger-soft)] flex items-center gap-2 [color:var(--pf-color-danger)]">
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
  const st       = MATCH_STATUS[match.status] ?? { tone: 'neutral' as StatusTone, label: match.status }

  // ── desktop row (grid) ─────────────────────────────────────────────────────
  const desktopRow = (
    <div
      className="hidden md:grid items-center gap-3 px-4 py-3 hover:[background:var(--pf-color-muted-soft)] transition-colors border-b last:border-0 group"
      style={{ gridTemplateColumns: '52px 1fr 36px 1fr 72px 84px 28px', borderColor: T.border }}
    >
      {/* match # */}
      <span className="text-[11px] font-bold [color:var(--pf-color-muted)] tabular-nums text-center">#{matchNumber}</span>

      {/* team 1 */}
      <div className="min-w-0">
        <p className={cn('text-sm font-bold truncate', t1Win ? '[color:var(--pf-color-success)]' : '[color:var(--pf-text)]')}>
          {t1Win && <span className="mr-1">🏆</span>}{team1.name}
        </p>
        <p className="text-[11px] truncate mt-0.5" style={{ color: T.txt2 }}>{team1.members}</p>
      </div>

      {/* VS */}
      <div className="text-center text-[11px] font-bold" style={{ color: T.txt2 }}>VS</div>

      {/* team 2 */}
      <div className="min-w-0">
        <p className={cn('text-sm font-bold truncate', t2Win ? '[color:var(--pf-color-success)]' : '[color:var(--pf-text)]')}>
          {t2Win && <span className="mr-1">🏆</span>}{team2.name}
        </p>
        <p className="text-[11px] truncate mt-0.5" style={{ color: T.txt2 }}>{team2.members}</p>
      </div>

      {/* score */}
      <div className="text-center tabular-nums">
        {isDone ? (
          <span className="font-extrabold text-sm">
            <span style={{ color: t1Win ? T.success : T.txt2 }}>{match.team1Score}</span>
            <span className="mx-1 [color:var(--pf-color-muted)]">–</span>
            <span style={{ color: t2Win ? T.success : T.txt2 }}>{match.team2Score}</span>
          </span>
        ) : (
          <span className="[color:var(--pf-color-muted)] text-sm font-bold">– : –</span>
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
          <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
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
        <span className="text-[11px] font-bold [color:var(--pf-color-muted)]">Trận #{matchNumber}</span>
        <div className="flex items-center gap-1.5">
          <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
          <MatchMenu isDone={isDone} onScore={() => onEnterScore(match)} onDelete={() => onDelete(match.id)} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-bold', t1Win ? '[color:var(--pf-color-success)]' : '[color:var(--pf-text)]')}>
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
            <p className="text-xs font-bold [color:var(--pf-color-muted)]">VS</p>
          )}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className={cn('text-sm font-bold', t2Win ? '[color:var(--pf-color-success)]' : '[color:var(--pf-text)]')}>
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
        className="w-full flex items-center justify-between px-4 py-3.5 hover:[background:var(--pf-color-muted-soft)] transition-colors"
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
              style={{ background: 'var(--pf-color-success-soft)', color: 'var(--pf-color-success)' }}>✓ Hoàn thành</span>
          )}
          {!allDone && done === 0 && (
            <span className="text-[10px] font-semibold rounded-full px-2 py-0.5"
              style={{ background: 'var(--pf-surface-muted)', color: T.txt2 }}>Chưa diễn ra</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* progress bar */}
          <div className="hidden sm:block h-1.5 w-24 [background:var(--pf-color-muted-soft)] rounded-full overflow-hidden">
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

// ── nút xuất Ảnh/PDF dùng chung (pill có nhãn — chuẩn SaaS toàn app) ─────────────
function ExportButtons({ onPng, onPdf, ariaScope }: {
  onPng?: () => void
  onPdf?: () => void
  ariaScope: string
}) {
  if (!onPng && !onPdf) return null
  return (
    <div className="flex items-center gap-2 shrink-0" data-html2canvas-ignore="true">
      {onPng && (
        <button onClick={onPng} aria-label={`Xuất ảnh ${ariaScope}`} title="Xuất ảnh"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold [background:var(--pf-primary-soft)] [color:var(--pf-primary)] hover:opacity-90 transition-opacity">
          <ImageIcon size={15} /> Xuất ảnh
        </button>
      )}
      {onPdf && (
        <button onClick={onPdf} aria-label={`Xuất PDF ${ariaScope}`} title="Xuất PDF"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border border-[color:var(--pf-border)] [color:var(--pf-color-muted)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)] transition-colors">
          <FileText size={15} /> Xuất PDF
        </button>
      )}
    </div>
  )
}

// ── compact ranking ────────────────────────────────────────────────────────────
function CompactRankingCard({ standings, exportId, onExportPng, onExportPdf }: {
  standings: MiniGameTeamStanding[]
  exportId?: string
  onExportPng?: () => void
  onExportPdf?: () => void
}) {
  return (
    <div id={exportId} style={CARD} className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b" style={{ borderColor: T.border }}>
        <div className="flex items-center gap-2 min-w-0">
          <Trophy size={14} style={{ color: T.warning }} className="shrink-0" />
          <span className="font-bold text-sm truncate" style={{ color: T.txt1 }}>Bảng Xếp Hạng</span>
        </div>
        {standings.length > 0 && (
          <ExportButtons onPng={onExportPng} onPdf={onExportPdf} ariaScope="bảng xếp hạng" />
        )}
      </div>
      {standings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 [color:var(--pf-color-muted)]">
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
              <tr key={s.teamId} className={cn('hover:[background:var(--pf-color-muted-soft)] transition-colors', s.rank <= 3 && '[background:var(--pf-color-warning-soft)]')}
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
                  s.pointDifference > 0 ? '[color:var(--pf-color-success)]' : s.pointDifference < 0 ? '[color:var(--pf-color-danger)]' : '[color:var(--pf-color-muted)]')}>
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
          <div key={i} className="[background:var(--pf-surface)] px-4 py-3">
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
      style={{ background: 'var(--pf-primary-soft)', borderColor: 'var(--pf-color-primary-soft)' }}>
      <AlertCircle size={16} style={{ color: T.brand }} className="shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-bold" style={{ color: T.brand }}>Giải đấu đang diễn ra</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--pf-color-primary)' }}>
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
        <div className="flex flex-col items-center justify-center py-8 [color:var(--pf-color-muted)]">
          <Activity size={20} className="mb-2 opacity-30" />
          <p className="text-xs">Chưa có hoạt động nào được ghi lại</p>
        </div>
      ) : (
        <ul className="divide-y divide-[color:var(--pf-border-soft)]">
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


// ── main page ──────────────────────────────────────────────────────────────────
export function FixedDoublesDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    getMinigame, getTeams, getTeamStandings,
    getFixedDoublesDashboard, enterTeamMatchResult,
    deleteTeamMatchResult,
    setTeamsFromApi, setTeamMatchesFromApi, updateMinigame,
  } = useMinigameStore()
  const { user } = useAuthStore()
  const { getClubData } = useClubDataStore()

  const [scoreModal, setScoreModal]     = useState<MiniGameTeamMatch | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showScheduleChoice, setShowScheduleChoice] = useState(false)

  const hydrateFromApi = useCallback(async () => {
    if (!id) return
    try {
      const res = await api.get(`/minigames/${id}`)
      const mg = res.data?.data ?? res.data
      setTeamsFromApi(id, mg.teams ?? [])
      setTeamMatchesFromApi(id, mg.matches ?? [])
      // pairingMode nằm trong settings — hydrate lại tại đây để dashboard tự sửa dù store
      // (nạp từ danh sách) có thể thiếu field → isManual đúng chế độ (THỦ CÔNG vs TỰ ĐỘNG).
      const patch: Partial<MiniGame> = {}
      if (mg.status) patch.status = normalizeMinigameStatus(mg.status)
      if (mg.settings?.pairingMode) patch.pairingMode = mg.settings.pairingMode
      if (Object.keys(patch).length) updateMinigame(id, patch)
    } catch { toast.error('Không tải được dữ liệu giải đấu') }
  }, [id, setTeamsFromApi, setTeamMatchesFromApi, updateMinigame])

  useEffect(() => { hydrateFromApi() }, [hydrateFromApi])

  // Bấm "Tạo Lịch" → mở lựa chọn thể thức (1 lượt / lượt đi & về) trước khi sinh lịch.
  const handleCreateSchedule = useCallback(async () => {
    setShowScheduleChoice(true)
  }, [])

  const doCreateSchedule = useCallback(async (doubleRoundRobin: boolean) => {
    if (!id) return
    setShowScheduleChoice(false)
    try {
      await api.post(`/minigames/${id}/generate-schedule`, { doubleRoundRobin })
      await hydrateFromApi()
      toast.success(doubleRoundRobin ? 'Đã tạo lịch lượt đi & lượt về!' : 'Đã tạo lịch thi đấu!')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi tạo lịch')
    }
  }, [id, hydrateFromApi])

  const handleClearSchedule = useCallback(async () => {
    if (!id) return
    // Xoá lịch = phá lịch thi đấu + kết quả + BXH hiện tại → confirm rõ ràng (Rule 3).
    if (!window.confirm('Việc xoá lịch sẽ xoá lịch thi đấu, kết quả và bảng xếp hạng hiện tại. Tiếp tục?')) return
    try {
      await api.delete(`/minigames/${id}/schedule`)
      setTeamMatchesFromApi(id, [])
      toast.success('Đã xóa lịch')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi xóa lịch')
    }
  }, [id, setTeamMatchesFromApi])

  const handleSaveScoreApi = useCallback(async (matchId: string, s1: number, s2: number) => {
    try {
      await api.patch(`/minigames/matches/${matchId}/score`, { scoreA: s1, scoreB: s2 })
      enterTeamMatchResult(matchId, s1, s2)
      setScoreModal(null)
      toast.success('Đã lưu kết quả!')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi lưu điểm')
    }
  }, [enterTeamMatchResult])

  // Xóa kết quả trận: persist server (reset điểm + đảo thống kê đội) TRƯỚC, rồi mới xóa local —
  // fix lỗi refresh điểm hiện lại + BXH sai do trước đây chỉ xóa ở store.
  const handleDeleteScoreApi = useCallback(async (matchId: string) => {
    try {
      await api.delete(`/minigames/matches/${matchId}/score`)
      deleteTeamMatchResult(matchId)
      setDeleteConfirm(null)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi xóa kết quả')
    }
  }, [deleteTeamMatchResult])

  const mg = getMinigame(id!)
  if (!mg) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: T.bg }}>
        <p className="[color:var(--pf-color-muted)]">Không tìm thấy minigame</p>
      </div>
    )
  }

  const teams       = getTeams(id!)
  const standings   = getTeamStandings(id!)
  const dashboard   = getFixedDoublesDashboard(id!)
  const kpi         = dashboard?.kpi
  const schedule    = dashboard?.schedule ?? []

  // ── Xuất Ảnh/PDF bảng xếp hạng (đôi cố định) — PDF vector chuẩn SaaS, PNG chụp panel ──
  const doExportPng = async () => {
    try { await captureElementAsReportPng(FD_EXPORT_ID, `BXH_${mg.name}`.replace(/[^a-zA-Z0-9À-ỹ]/g, '_').replace(/_+/g, '_'), { title: 'Bảng xếp hạng', subtitle: mg.name }); toast.success('Đã tải ảnh bảng xếp hạng') }
    catch { toast.error('Xuất ảnh thất bại') }
  }
  const doExportPdf = async () => {
    try {
      await exportStandingsPDF({
        clubName: getClubData(user?.clubId ?? '').settings?.name ?? 'CLB',
        tournamentName: mg.name,
        sportLabel: FD_SPORT_LABEL[mg.sport ?? 'PICKLEBALL'] ?? 'Giải đấu',
        formatLabel: 'Đôi cố định vòng tròn',
        rankNote: `Xếp theo: Điểm → Hiệu số → Điểm ghi được. Điểm: thắng ${mg.winPoints} · hòa ${mg.drawPoints} · thua ${mg.lossPoints}.`,
        stats: [
          { label: 'Số đội', value: teams.length },
          { label: 'Tổng trận', value: kpi?.totalMatches ?? schedule.length },
          { label: 'Đã có kết quả', value: `${kpi?.completedMatches ?? 0}/${kpi?.totalMatches ?? schedule.length}` },
        ],
        columns: [
          { key: 'rank', label: '#', w: 8, align: 'left' },
          { key: 'name', label: 'ĐỘI', w: 18, align: 'left', bold: true },
          { key: 'pair', label: 'CẶP ĐÔI', w: 46, align: 'left', tone: 'muted' },
          { key: 'P', label: 'T', w: 12, align: 'center' },
          { key: 'W', label: 'TH', w: 12, align: 'center', tone: 'win' },
          { key: 'D', label: 'H', w: 12, align: 'center', tone: 'muted' },
          { key: 'L', label: 'B', w: 12, align: 'center', tone: 'loss' },
          { key: 'gd', label: 'HS', w: 16, align: 'center', tone: 'sign' },
          { key: 'pts', label: 'ĐIỂM', w: 20, align: 'right', tone: 'points' },
        ],
        rows: standings.map(s => ({
          name: s.teamName,
          pair: `${s.player1Name} & ${s.player2Name}`,
          P: s.played, W: s.won, D: s.drawn, L: s.lost,
          gd: s.pointDifference > 0 ? `+${s.pointDifference}` : String(s.pointDifference),
          pts: s.rankingPoints,
        })),
      })
      toast.success('Đã tải PDF bảng xếp hạng')
    } catch { toast.error('Xuất PDF thất bại') }
  }
  const rounds      = Array.from(new Set(schedule.map(m => m.round))).sort((a, b) => a - b)
  // Lượt đi/lượt về: nhóm theo leg (1=đi, 2=về). Nhiều leg ⇒ hiện 2 mục.
  const legs        = Array.from(new Set(schedule.map(m => m.leg ?? 1))).sort((a, b) => a - b)
  const isDoubleLeg = legs.length > 1
  const roundsOfLeg = (leg: number) =>
    Array.from(new Set(schedule.filter(m => (m.leg ?? 1) === leg).map(m => m.round))).sort((a, b) => a - b)

  const getTeamInfo = (tid: string): TeamInfo => {
    const t = teams.find(t => t.id === tid)
    return {
      name:    t?.name ?? tid,
      members: t ? `${t.player1.memberName} & ${t.player2.memberName}` : '',
    }
  }

  // Phase suy TỪ DỮ LIỆU (teams/schedule), KHÔNG dựa status backend — backend chỉ
  // có DRAFT/ACTIVE/COMPLETED/CANCELLED, không có PAIRED/SCHEDULED nên các cờ cũ
  // luôn false → kẹt luồng đôi cố định.
  const hasTeams   = teams.length > 0
  const hasSchedule = schedule.length > 0
  const showSched  = hasSchedule
  const canEnter   = hasSchedule && mg.status !== 'COMPLETED' && mg.status !== 'CANCELLED'

  const completed  = schedule.filter(m => m.status === 'COMPLETED').length
  const totalFor   = schedule.reduce((s, m) => s + (m.team1Score ?? 0) + (m.team2Score ?? 0), 0)
  const totalAgain = schedule.filter(m => m.status === 'COMPLETED')
    .reduce((s, m) => s + (m.team1Score ?? 0) + (m.team2Score ?? 0), 0)

  const handleSaveScore = (matchId: string, s1: number, s2: number) => {
    handleSaveScoreApi(matchId, s1, s2)
  }

  // ── Xuất Ảnh/PDF Lịch Thi Đấu — PNG chụp panel lịch, PDF vector bảng đầy đủ mọi trận ──
  const doExportSchedulePng = async () => {
    try { await captureElementAsReportPng(FD_SCHEDULE_ID, `Lich_${mg.name}`.replace(/[^a-zA-Z0-9À-ỹ]/g, '_').replace(/_+/g, '_'), { title: 'Lịch thi đấu', subtitle: mg.name }); toast.success('Đã tải ảnh lịch thi đấu') }
    catch { toast.error('Xuất ảnh thất bại') }
  }
  const doExportSchedulePdf = async () => {
    if (schedule.length === 0) { toast.error('Chưa có lịch thi đấu'); return }
    try {
      // Sắp xếp lượt → vòng để bảng PDF liệt kê đủ mọi trận (không phụ thuộc trạng thái đóng/mở panel).
      const scheduleSorted = [...schedule].sort((a, b) => (a.leg ?? 1) - (b.leg ?? 1) || a.round - b.round)
      await exportSchedulePDF({
        clubName: getClubData(user?.clubId ?? '').settings?.name ?? 'CLB',
        tournamentName: mg.name,
        sportLabel: FD_SPORT_LABEL[mg.sport ?? 'PICKLEBALL'] ?? 'Giải đấu',
        formatLabel: 'Đôi cố định vòng tròn',
        rankNote: 'Tỷ số theo Đội 1 – Đội 2. Trận chưa đấu để dấu “–”.',
        stats: [
          { label: 'Số đội', value: teams.length },
          { label: 'Tổng trận', value: kpi?.totalMatches ?? schedule.length },
          { label: 'Đã hoàn thành', value: `${completed}/${schedule.length}` },
        ],
        columns: [
          { key: 'vong', label: 'VÒNG', w: 24, align: 'left', bold: true },
          { key: 't1', label: 'ĐỘI 1', w: 58, align: 'left' },
          { key: 'sc', label: 'TỶ SỐ', w: 22, align: 'center', bold: true },
          { key: 't2', label: 'ĐỘI 2', w: 58, align: 'left' },
          { key: 'st', label: 'TRẠNG THÁI', w: 24, align: 'right', tone: 'muted' },
        ],
        rows: scheduleSorted.map(m => {
          const done = m.status === 'COMPLETED'
          return {
            vong: isDoubleLeg ? `${(m.leg ?? 1) === 1 ? 'Đi' : 'Về'} · V${m.round}` : `Vòng ${m.round}`,
            t1: getTeamInfo(m.team1Id).name,
            sc: done ? `${m.team1Score} - ${m.team2Score}` : '–',
            t2: getTeamInfo(m.team2Id).name,
            st: done ? 'Đã xong' : (m.status === 'CANCELLED' ? 'Đã hủy' : 'Chờ'),
          }
        }),
      })
      toast.success('Đã tải PDF lịch thi đấu')
    } catch { toast.error('Xuất PDF thất bại') }
  }

  // Kết thúc giải đấu: DRAFT/ACTIVE → COMPLETED (endedAt) + phát event MINIGAME_COMPLETED →
  // vào lịch sử CLB. Còn trận chưa xong thì cảnh báo trước khi chốt.
  const canFinish = hasSchedule && mg.status !== 'COMPLETED' && mg.status !== 'CANCELLED'
  const allDone = hasSchedule && completed === schedule.length
  const handleEndTournament = async () => {
    if (!id) return
    const remaining = schedule.length - completed
    const msg = remaining > 0
      ? `Còn ${remaining} trận chưa có kết quả. Vẫn kết thúc giải đấu?`
      : 'Kết thúc giải đấu? Trạng thái chuyển sang "Hoàn Thành" và lưu vào lịch sử CLB.'
    if (!window.confirm(msg)) return
    try {
      await api.post(`/minigames/${id}/end`)
      await hydrateFromApi()
      toast.success('Đã kết thúc giải đấu — đã lưu vào lịch sử CLB!')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi kết thúc giải đấu')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: T.bg }}>
      <PageHeader
        title={`🤝 Đôi Cố Định – ${mg.name}`}
        subtitle={`${mg.startDate}${mg.endDate ? ` — ${mg.endDate}` : ''}`}
        actions={
          <>
            {canFinish && (
              <button
                onClick={handleEndTournament}
                title={allDone ? 'Kết thúc giải đấu — chuyển Hoàn Thành & lưu lịch sử CLB' : 'Còn trận chưa xong — vẫn có thể kết thúc'}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white transition-colors"
                style={{ background: allDone ? 'var(--pf-color-success)' : 'var(--pf-color-muted)' }}
              >
                <Trophy size={15} />
                <span className="hidden sm:inline">Kết thúc giải đấu</span>
              </button>
            )}
            <button
              title="Chỉnh sửa"
              className="p-2 rounded-xl hover:[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] transition-colors"
              onClick={() => navigate(`/minigames/${id}/edit`)}
            >
              <Edit2 size={16} />
            </button>
          </>
        }
      />

      {/* ── page body ── */}
      <div className="pf-center-x w-full max-w-[1280px] px-4 sm:px-6 py-5 space-y-5">
        <button onClick={() => navigate('/minigames')} className="flex items-center gap-1.5 text-sm [color:var(--pf-color-muted)] hover:[color:var(--pf-text)] transition-colors w-fit">
          <ArrowLeft size={14} /> Danh Sách Giải Đấu
        </button>

        {/* champion banner */}
        {mg.status === 'COMPLETED' && standings.length > 0 && (
          <div className="rounded-2xl p-6 text-center"
            style={{ background: 'var(--pf-color-warning-soft)', color: 'var(--pf-color-warning)' }}>
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
            <MetricCard icon={<Users size={18} />} label="Số đội" value={kpi.totalTeams} sub="cặp đôi tham gia" accent="blue" />
            <MetricCard icon={<Calendar size={18} />} label="Tổng trận" value={kpi.totalMatches} sub="trận đấu" accent="teal" />
            <MetricCard icon={<Check size={18} />} label="Đã xong" value={`${kpi.completedMatches}/${kpi.totalMatches}`} sub="trận hoàn thành" accent="green" />
            <MetricCard icon={<Target size={18} />} label="Hoàn thành" value={`${kpi.completionRate}%`} sub={`${kpi.pendingMatches} trận còn lại`} accent="violet" />
          </div>
        )}

        {/* Ghép cặp — dùng CHUNG PairBuilder (chuẩn SaaS, thống nhất mọi nội dung đôi). Sau khi
            đã có cặp thì hiện nút Tạo Lịch (vòng tròn đôi cố định). */}
        {!hasSchedule && (
          <>
            <PairBuilder minigameId={id!} isGroupStage={false} onChanged={hydrateFromApi} />
            {hasTeams && (
              <div className="flex justify-end">
                <button onClick={handleCreateSchedule}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm [background:var(--pf-primary)] hover:[filter:brightness(0.94)] transition">
                  <Calendar size={16} /> Tạo Lịch Thi Đấu
                </button>
              </div>
            )}
          </>
        )}

        {/* main 12-col grid */}
        {showSched && (
          <div className="grid grid-cols-12 gap-5">

            {/* ── left: schedule ── */}
            <div className="col-span-12 lg:col-span-7 xl:col-span-8 space-y-3">
             <div id={FD_SCHEDULE_ID} className="space-y-3">
              {/* card header */}
              <div style={CARD} className="px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <Calendar size={14} style={{ color: T.brand }} className="shrink-0" />
                  <span className="font-bold text-sm" style={{ color: T.txt1 }}>Lịch Thi Đấu</span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full [background:var(--pf-color-success-soft)] [color:var(--pf-color-success)]">Đội &amp; lịch đã cố định</span>
                  <span className="text-[11px]" style={{ color: T.txt2 }}>
                    {completed}/{schedule.length} trận đã hoàn thành
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0" data-html2canvas-ignore="true">
                  <ExportButtons onPng={doExportSchedulePng} onPdf={doExportSchedulePdf} ariaScope="lịch thi đấu" />
                  <button
                    onClick={handleClearSchedule}
                    className="text-[11px] font-semibold [color:var(--pf-color-danger)] hover:[background:var(--pf-color-danger-soft)] flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Trash2 size={12} /> Xóa lịch
                  </button>
                </div>
              </div>

              {isDoubleLeg ? (
                legs.map(leg => (
                  <div key={`leg-${leg}`} className="space-y-3">
                    <div className="flex items-center gap-2 px-1 pt-1">
                      <span className="text-[12px] font-extrabold uppercase tracking-wide" style={{ color: T.brand }}>
                        {leg === 1 ? '↗ Lượt đi' : '↘ Lượt về'}
                      </span>
                      <span className="text-[11px]" style={{ color: T.txt2 }}>
                        {schedule.filter(m => (m.leg ?? 1) === leg && m.status === 'COMPLETED').length}/{schedule.filter(m => (m.leg ?? 1) === leg).length} trận
                      </span>
                      <div className="flex-1 h-px [background:var(--pf-border)]" />
                    </div>
                    {roundsOfLeg(leg).map(r => (
                      <RoundCard
                        key={`${leg}-${r}`}
                        round={r}
                        matches={schedule.filter(m => (m.leg ?? 1) === leg && m.round === r)}
                        getTeamInfo={getTeamInfo}
                        canEnter={canEnter}
                        onEnterScore={setScoreModal}
                        onDelete={id => setDeleteConfirm(id)}
                      />
                    ))}
                  </div>
                ))
              ) : (
                rounds.map(r => (
                  <RoundCard
                    key={r}
                    round={r}
                    matches={schedule.filter(m => m.round === r)}
                    getTeamInfo={getTeamInfo}
                    canEnter={canEnter}
                    onEnterScore={setScoreModal}
                    onDelete={id => setDeleteConfirm(id)}
                  />
                ))
              )}

              {rounds.length === 0 && (
                <div style={CARD} className="py-14 text-center [color:var(--pf-color-muted)]">
                  <Calendar size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Chưa có lịch thi đấu</p>
                </div>
              )}
             </div>

              {/* recent activity — fills empty space below schedule */}
              <RecentActivityCard entries={[]} />
            </div>

            {/* ── right panel ── */}
            <div className="col-span-12 lg:col-span-5 xl:col-span-4 space-y-4">
              <CompactRankingCard standings={standings} exportId={FD_EXPORT_ID} onExportPng={doExportPng} onExportPdf={doExportPdf} />
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
          <CompactRankingCard standings={standings} exportId={FD_EXPORT_ID} onExportPng={doExportPng} onExportPdf={doExportPdf} />
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

      {/* ── chọn thể thức sinh lịch: 1 lượt / lượt đi & về ── */}
      {showScheduleChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.6)' }}>
          <div className="[background:var(--pf-surface)] rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={18} style={{ color: T.brand }} />
              <p className="font-bold [color:var(--pf-text)]">Tạo lịch thi đấu</p>
            </div>
            <p className="text-sm [color:var(--pf-color-muted)] mb-4">Chọn thể thức vòng tròn. Đội/đôi giữ CỐ ĐỊNH ở mọi lượt.</p>
            <div className="space-y-2.5">
              <button onClick={() => doCreateSchedule(false)}
                className="w-full text-left px-4 py-3 rounded-xl border hover:[background:var(--pf-surface-muted)] transition-colors"
                style={{ borderColor: T.border }}>
                <div className="font-semibold [color:var(--pf-text)] text-sm">1 lượt (vòng tròn)</div>
                <div className="text-[12px] [color:var(--pf-color-muted)]">Mỗi cặp đội gặp nhau 1 lần.</div>
              </button>
              <button onClick={() => doCreateSchedule(true)}
                className="w-full text-left px-4 py-3 rounded-xl border-2 transition-colors"
                style={{ borderColor: T.brand, background: 'var(--pf-primary-soft)' }}>
                <div className="font-semibold text-sm" style={{ color: T.brand }}>Lượt đi &amp; lượt về</div>
                <div className="text-[12px] [color:var(--pf-color-muted)]">Mỗi cặp đội gặp nhau 2 lần (đi &amp; về), tính điểm chung.</div>
              </button>
            </div>
            <button onClick={() => setShowScheduleChoice(false)}
              className="mt-4 w-full py-2 rounded-xl border text-sm font-semibold [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] transition-colors"
              style={{ borderColor: T.border }}>
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* ── delete confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.6)' }}>
          <div className="[background:var(--pf-surface)] rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
            <div className="w-12 h-12 rounded-full [background:var(--pf-color-danger-soft)] flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} className="[color:var(--pf-color-danger)]" />
            </div>
            <p className="font-bold [color:var(--pf-text)] mb-1">Xóa kết quả trận này?</p>
            <p className="text-sm [color:var(--pf-color-muted)] mb-5">Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 rounded-xl border text-sm font-semibold [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] transition-colors"
                style={{ borderColor: T.border }}>
                Hủy
              </button>
              <button
                onClick={() => handleDeleteScoreApi(deleteConfirm)}
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
