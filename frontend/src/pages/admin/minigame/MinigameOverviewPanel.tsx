/**
 * MinigameOverviewPanel — cột phải của Hub "Tạo Giải đấu".
 * Bám theo BỘ MÔN đang chọn ở form trái → hiển thị tổng quan TRỰC TIẾP của giải mới nhất
 * thuộc bộ môn đó: 4 KPI · Lịch thi đấu · BXH (preview) · Thể thức · Hoạt động gần đây.
 * Số liệu THẬT (findOne giải tiêu điểm) + hoạt động suy ra từ dữ liệu minigame (không đụng backend).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Trophy, Swords, Target, CalendarDays, BarChart2, ClipboardList,
  Activity, ChevronRight, Flag, Plus,
} from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'
import { useMinigameStore } from '../../../store/minigameStore'
import { sportEmoji } from '../../../types/minigame'
import api from '../../../lib/api'
import { cn } from '../../../lib/utils'

interface OTeam { id: string; name: string; createdAt?: string; members?: unknown[] }
interface OMatch {
  id: string; teamAId?: string | null; teamBId?: string | null
  teamA?: { id: string; name: string } | null; teamB?: { id: string; name: string } | null
  scoreA?: number | null; scoreB?: number | null; winnerId?: string | null
  round: number; leg: number; status: string; playedAt?: string | null
}
interface OGolfer { id: string; guestName?: string | null; memberId?: string | null; scores: { round: number; strokes: number }[]; createdAt?: string }

const TEAM_SPORTS = ['FOOTBALL', 'BASKETBALL']

function ago(iso?: string | null): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const s = Math.floor((Date.now() - t) / 1000)
  if (s < 60) return 'vừa xong'
  const m = Math.floor(s / 60); if (m < 60) return `${m} phút trước`
  const h = Math.floor(m / 60); if (h < 24) return `${h} giờ trước`
  const d = Math.floor(h / 24); return `${d} ngày trước`
}

function isToday(iso?: string | null): boolean {
  if (!iso) return false
  const d = new Date(iso); const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

export function MinigameOverviewPanel({ sport }: { sport: string }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { getMinigames } = useMinigameStore()

  // Giải tiêu điểm = giải mới nhất của bộ môn đang chọn (ưu tiên đang diễn ra).
  const featured = useMemo(() => {
    const list = getMinigames(clubId)
      .filter(m => (m.sport ?? 'PICKLEBALL') === sport && m.status !== 'CANCELLED')
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    return list.find(m => m.status === 'IN_PROGRESS') ?? list[0] ?? null
  }, [getMinigames, clubId, sport])

  const [detail, setDetail] = useState<{ teams: OTeam[]; matches: OMatch[]; golfers: OGolfer[]; settings: any } | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchDetail = useCallback(async () => {
    if (!featured) { setDetail(null); return }
    setLoading(true)
    try {
      const res = await api.get(`/minigames/${featured.id}`)
      const m = res.data?.data ?? res.data
      setDetail({ teams: m?.teams ?? [], matches: m?.matches ?? [], golfers: m?.golfers ?? [], settings: m?.settings ?? {} })
    } catch {
      setDetail(null)
    } finally { setLoading(false) }
  }, [featured])

  useEffect(() => { void fetchDetail() }, [fetchDetail])

  const isGolf = sport === 'GOLF'
  const isTeam = TEAM_SPORTS.includes(sport)
  const teams = detail?.teams ?? []
  const matches = detail?.matches ?? []
  const golfers = detail?.golfers ?? []
  const rounds = Math.max(1, Number(detail?.settings?.rounds) || 1)
  const footballFormat = detail?.settings?.footballFormat as string | undefined

  // KPI
  const completedMatches = matches.filter(m => m.status === 'COMPLETED').length
  const golfCells = golfers.length * rounds
  const golfEntered = golfers.reduce((s, g) => s + g.scores.length, 0)
  const kpis = isGolf
    ? [
        { icon: <Users size={20} />, label: 'Golfer', value: golfers.length },
        { icon: <Flag size={20} />, label: 'Số vòng', value: rounds },
        { icon: <ClipboardList size={20} />, label: 'Đã nhập', value: golfEntered },
        { icon: <Target size={20} />, label: 'Hoàn thành', value: golfCells ? `${Math.round((golfEntered / golfCells) * 100)}%` : '0%' },
      ]
    : [
        { icon: <Users size={20} />, label: 'Số đội', value: teams.length },
        { icon: <Trophy size={20} />, label: 'Tổng trận', value: matches.length },
        { icon: <Swords size={20} />, label: 'Đã xong', value: completedMatches },
        { icon: <Target size={20} />, label: 'Hoàn thành', value: matches.length ? `${Math.round((completedMatches / matches.length) * 100)}%` : '0%' },
      ]

  // BXH đội (các môn theo trận) — tính từ matches đã hoàn thành.
  const teamStandings = useMemo(() => {
    if (isGolf) return []
    const win = featured?.winPoints ?? 3, draw = featured?.drawPoints ?? 1, loss = featured?.lossPoints ?? 0
    const stat: Record<string, { id: string; name: string; P: number; W: number; L: number; Pts: number }> = {}
    teams.forEach(t => { stat[t.id] = { id: t.id, name: t.name, P: 0, W: 0, L: 0, Pts: 0 } })
    matches
      .filter(m => m.status === 'COMPLETED' && m.teamAId && m.teamBId && m.scoreA != null && m.scoreB != null)
      .forEach(m => {
        const a = stat[m.teamAId!]; const b = stat[m.teamBId!]; if (!a || !b) return
        const sa = m.scoreA!, sb = m.scoreB!
        a.P++; b.P++
        if (sa > sb) { a.W++; a.Pts += win; b.L++; b.Pts += loss }
        else if (sa < sb) { b.W++; b.Pts += win; a.L++; a.Pts += loss }
        else { a.Pts += draw; b.Pts += draw }
      })
    return Object.values(stat).sort((x, y) => y.Pts - x.Pts || y.W - x.W || x.name.localeCompare(y.name))
  }, [isGolf, teams, matches, featured])

  // BXH golf — tổng gậy nhỏ nhất.
  const golfStandings = useMemo(() => {
    if (!isGolf) return []
    return golfers
      .map(g => ({ id: g.id, name: g.guestName?.trim() || 'Golfer', played: g.scores.length, total: g.scores.reduce((s, x) => s + x.strokes, 0) }))
      .sort((a, b) => (a.played > 0) !== (b.played > 0) ? (a.played > 0 ? -1 : 1) : a.total - b.total)
  }, [isGolf, golfers])

  // Lịch thi đấu (các môn theo trận): ưu tiên trận HÔM NAY, nếu không có thì trận chưa đấu.
  const scheduleRows = useMemo(() => {
    if (isGolf) return []
    const today = matches.filter(m => isToday(m.playedAt))
    const base = today.length ? today : matches.filter(m => m.status !== 'COMPLETED')
    return (base.length ? base : matches).slice(0, 6)
  }, [isGolf, matches])

  // Hoạt động gần đây — suy ra từ dữ liệu minigame.
  const activity = useMemo(() => {
    if (!featured) return []
    const items: { icon: string; text: string; time?: string | null }[] = []
    items.push({ icon: '🏆', text: `Đã tạo giải "${featured.name}"`, time: featured.createdAt })
    teams.forEach(t => { if (t.createdAt) items.push({ icon: '➕', text: `Thêm đội ${t.name}`, time: t.createdAt }) })
    matches.filter(m => m.status === 'COMPLETED' && m.playedAt).forEach(m => {
      items.push({ icon: isGolf ? '⛳' : '🎯', text: `Kết quả ${m.teamA?.name ?? 'Đội'} ${m.scoreA ?? 0}-${m.scoreB ?? 0} ${m.teamB?.name ?? 'Đội'}`, time: m.playedAt })
    })
    golfers.forEach(g => { if (g.createdAt) items.push({ icon: '➕', text: `Thêm golfer ${g.guestName?.trim() || 'CLB'}`, time: g.createdAt }) })
    return items.sort((a, b) => (b.time ?? '').localeCompare(a.time ?? '')).slice(0, 5)
  }, [featured, teams, matches, golfers, isGolf])

  const formatLabel = () => {
    if (isGolf) return 'Stroke-play (tổng gậy)'
    if (isTeam) return footballFormat === 'KNOCKOUT' ? 'Loại trực tiếp' : 'Vòng tròn tính điểm'
    switch (featured?.formatType) {
      case 'RANDOM_DOUBLES': return 'Đánh đôi ngẫu nhiên'
      case 'GROUP_STAGE': return 'Vòng bảng'
      case 'FIXED_DOUBLES_ROUND_ROBIN': return 'Đôi cố định vòng tròn'
      default: return 'Thi đấu'
    }
  }
  const dashLink = `/minigames/${featured?.id}`
  // Đôi cố định cũng có BXH/lịch RIÊNG trong dashboard (giống đội/golf) → trang BXH/lịch generic
  // chỉ cho RANDOM_DOUBLES + GROUP_STAGE. Tránh link tới trang generic sẽ trống/sai.
  const isFixedDoubles = featured?.formatType === 'FIXED_DOUBLES_ROUND_ROBIN'
  const useDashboardViews = isTeam || isGolf || isFixedDoubles
  const standingsLink = useDashboardViews ? dashLink : `/minigames/${featured?.id}/standings`
  const scheduleLink = useDashboardViews ? dashLink : `/minigames/${featured?.id}/schedule`

  const card = 'rounded-[18px] border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]'

  // ── Trạng thái rỗng ──
  if (!featured) {
    return (
      <div className={cn(card, 'flex flex-col items-center justify-center text-center py-12')}>
        <div className="text-3xl">{sportEmoji(sport) || '🏆'}</div>
        <p className="mt-2 text-sm font-medium [color:var(--pf-text)]">Chưa có giải nào cho bộ môn này</p>
        <p className="mt-1 text-xs [color:var(--pf-color-muted)]">Điền thông tin bên trái để tạo giải đầu tiên.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPI trên nền tím (giống mockup) */}
      <div className="rounded-[18px] p-4 text-white [background:linear-gradient(135deg,var(--pf-primary),var(--pf-primary-hover))] shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-90">
          <Trophy size={16} /> Tổng quan · {sportEmoji(sport)} {featured.name}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {kpis.map(k => (
            <div key={k.label} className="text-center">
              <div className="flex justify-center opacity-90">{k.icon}</div>
              <p className="mt-1 text-xl font-bold leading-none">{k.value}</p>
              <p className="mt-1 text-[11px] opacity-80">{k.label}</p>
            </div>
          ))}
        </div>
      </div>

      {loading && <p className="text-xs [color:var(--pf-color-muted)] px-1">Đang tải tổng quan…</p>}

      {/* Lịch thi đấu (môn theo trận) */}
      {!isGolf && (
        <div className={card}>
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold [color:var(--pf-text)]"><CalendarDays size={16} /> Lịch thi đấu</h3>
            <button onClick={() => navigate(scheduleLink)} className="text-xs font-medium [color:var(--pf-primary)] hover:underline inline-flex items-center gap-0.5">Xem toàn bộ <ChevronRight size={12} /></button>
          </div>
          {scheduleRows.length === 0 ? (
            <p className="mt-2 text-xs [color:var(--pf-color-muted)]">Chưa có lịch. Tạo lịch trong màn giải.</p>
          ) : (
            <ul className="mt-2 flex flex-col divide-y divide-[color:var(--pf-border)]">
              {scheduleRows.map(m => (
                <li key={m.id} className="flex items-center gap-2 py-1.5 text-sm">
                  <span className="flex-1 text-right truncate [color:var(--pf-text)]">{m.teamA?.name ?? 'Đội'}</span>
                  <span className="shrink-0 text-xs font-semibold px-1.5 [color:var(--pf-color-muted)]">
                    {m.status === 'COMPLETED' ? `${m.scoreA ?? 0} - ${m.scoreB ?? 0}` : 'vs'}
                  </span>
                  <span className="flex-1 text-left truncate [color:var(--pf-text)]">{m.teamB?.name ?? '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* BXH preview */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold [color:var(--pf-text)]"><BarChart2 size={16} /> Bảng xếp hạng</h3>
          <button onClick={() => navigate(standingsLink)} className="text-xs font-medium [color:var(--pf-primary)] hover:underline inline-flex items-center gap-0.5">Xem chi tiết <ChevronRight size={12} /></button>
        </div>
        {isGolf ? (
          golfStandings.length === 0 ? <p className="mt-2 text-xs [color:var(--pf-color-muted)]">Chưa có golfer.</p> : (
            <table className="mt-2 w-full text-sm">
              <thead><tr className="text-[11px] uppercase [color:var(--pf-color-muted)]"><th className="text-left font-semibold py-1">#</th><th className="text-left font-semibold py-1">Golfer</th><th className="text-center font-semibold py-1">Vòng</th><th className="text-right font-semibold py-1">Tổng gậy</th></tr></thead>
              <tbody>
                {golfStandings.slice(0, 5).map((s, i) => (
                  <tr key={s.id} className="border-t border-[color:var(--pf-border)]">
                    <td className="py-1.5 [color:var(--pf-color-muted)]">{i + 1}</td>
                    <td className="py-1.5 font-medium [color:var(--pf-text)] truncate">{s.name}</td>
                    <td className="py-1.5 text-center [color:var(--pf-color-muted)]">{s.played}/{rounds}</td>
                    <td className="py-1.5 text-right font-bold [color:var(--pf-primary)]">{s.played > 0 ? s.total : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          teamStandings.length === 0 ? <p className="mt-2 text-xs [color:var(--pf-color-muted)]">Chưa có đội.</p> : (
            <table className="mt-2 w-full text-sm">
              <thead><tr className="text-[11px] uppercase [color:var(--pf-color-muted)]"><th className="text-left font-semibold py-1">#</th><th className="text-left font-semibold py-1">Đội</th><th className="text-center font-semibold py-1">Trận</th><th className="text-center font-semibold py-1">Thắng</th><th className="text-center font-semibold py-1">Thua</th><th className="text-right font-semibold py-1">Điểm</th></tr></thead>
              <tbody>
                {teamStandings.slice(0, 5).map((s, i) => (
                  <tr key={s.id} className="border-t border-[color:var(--pf-border)]">
                    <td className="py-1.5 [color:var(--pf-color-muted)]">{i + 1}</td>
                    <td className="py-1.5 font-medium [color:var(--pf-text)] truncate">{s.name}</td>
                    <td className="py-1.5 text-center">{s.P}</td>
                    <td className="py-1.5 text-center text-emerald-600 font-medium">{s.W}</td>
                    <td className="py-1.5 text-center text-red-500">{s.L}</td>
                    <td className="py-1.5 text-right font-bold [color:var(--pf-primary)]">{s.Pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* Thể thức */}
      <div className={card}>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold [color:var(--pf-text)]"><ClipboardList size={16} /> Thể thức</h3>
        <ul className="mt-2 space-y-1 text-xs [color:var(--pf-color-muted)]">
          <li>• {formatLabel()}</li>
          {isGolf ? (
            <li>• Tổng gậy nhỏ nhất đứng đầu ({rounds} vòng)</li>
          ) : (
            <>
              <li>• {featured.allowDraw ? 'Có Thắng / Hòa / Thua' : 'Chỉ có Thắng / Thua, không Hòa'}</li>
              <li>• Thắng: {featured.winPoints} điểm{featured.allowDraw ? ` · Hòa: ${featured.drawPoints}` : ''} · Thua: {featured.lossPoints}</li>
              <li className="flex items-center gap-1 text-amber-600">🏆 Điểm cao nhất đoạt CUP</li>
            </>
          )}
        </ul>
      </div>

      {/* Hoạt động gần đây */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold [color:var(--pf-text)]"><Activity size={16} /> Hoạt động gần đây</h3>
          <button onClick={() => navigate(dashLink)} className="text-xs font-medium [color:var(--pf-primary)] hover:underline inline-flex items-center gap-0.5">Xem tất cả <ChevronRight size={12} /></button>
        </div>
        {activity.length === 0 ? <p className="mt-2 text-xs [color:var(--pf-color-muted)]">Chưa có hoạt động.</p> : (
          <ul className="mt-2 space-y-2">
            {activity.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="shrink-0">{a.icon}</span>
                <span className="flex-1 [color:var(--pf-text)] leading-snug">{a.text}</span>
                <span className="shrink-0 text-[11px] [color:var(--pf-color-muted)]">{ago(a.time)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Lối vào nhanh dashboard giải */}
      <button onClick={() => navigate(dashLink)} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white [background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)] transition-colors">
        <Plus size={16} /> Mở màn quản lý giải
      </button>
    </div>
  )
}
