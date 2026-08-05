/**
 * FootballDashboardPage (Pha 1b + 1c) — Dashboard bộ môn BÓNG ĐÁ.
 * 3 tab: Đội bóng (roster nhiều người) · Lịch & Kết quả (vòng tròn, nhập tỉ số) ·
 * Bảng xếp hạng (Thắng-Hòa-Thua + bàn thắng/hiệu số, tính client từ matches).
 * Tái dùng endpoint: roster (Pha 1a), football/schedule + matches/:id/score + /schedule (Pha 1c).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Calendar, Users, Trophy, UserPlus, X, Plus, Trash2, Shield, Search,
  CalendarDays, BarChart2, ListChecks, Save, Crown, Swords, ChevronRight,
  Image as ImageIcon, FileDown,
} from 'lucide-react'
import { exportStandingsPDF, exportKnockoutPDF, exportSchedulePDF, captureElementAsReportPng } from '../../../lib/export'
import toast from 'react-hot-toast'
import { StatusBadge } from '../../../components/minigame/v2/StatusBadge'
import { useMinigameStore } from '../../../store/minigameStore'
import { normalizeMinigameStatus } from '../../../types/minigame'
import { useClubDataStore } from '../../../store/clubDataStore'
import { useAuthStore } from '../../../store/authStore'
import api from '../../../lib/api'
import { cn } from '../../../lib/utils'

// Dùng chung cho các MÔN ĐỒNG ĐỘI (bóng đá, bóng rổ): cùng engine đội-roster + trận có điểm.
// Chỉ khác nhãn hiển thị theo bộ môn.
const SPORT_UI: Record<string, {
  emoji: string; name: string; teamTab: string; player: string; scoreWord: string; gfgaShort: string; gfgaTitle: string
}> = {
  FOOTBALL: { emoji: '⚽', name: 'Bóng Đá', teamTab: 'Đội bóng', player: 'cầu thủ', scoreWord: 'bàn thắng', gfgaShort: 'BT-BB', gfgaTitle: 'Bàn thắng - Bàn thua' },
  BASKETBALL: { emoji: '🏀', name: 'Bóng Rổ', teamTab: 'Đội', player: 'vận động viên', scoreWord: 'điểm', gfgaShort: 'Đ+/Đ−', gfgaTitle: 'Điểm ghi - Điểm thua' },
}

interface RosterMember { id: string; memberId?: string | null; guestName?: string | null; role?: string | null }
interface RosterTeam { id: string; name: string; members: RosterMember[] }
interface FbMatch {
  id: string
  teamAId?: string | null; teamBId?: string | null
  teamA?: { id: string; name: string } | null
  teamB?: { id: string; name: string } | null
  scoreA?: number | null; scoreB?: number | null
  winnerId?: string | null
  round: number; leg: number; status: string; playedAt?: string | null
}
type Tab = 'teams' | 'schedule' | 'standings'

export function FootballDashboardPage({ resync }: { resync?: () => void }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { getMinigame, updateMinigame } = useMinigameStore()
  const { getClubData } = useClubDataStore()
  const mg = getMinigame(id!)
  const members = getClubData(clubId).members

  const memberName = useMemo(() => {
    const map: Record<string, string> = {}
    members.forEach(m => { map[m.id] = m.fullName })
    return map
  }, [members])

  const [tab, setTab] = useState<Tab>('teams')
  const [teams, setTeams] = useState<RosterTeam[]>([])
  const [matches, setMatches] = useState<FbMatch[]>([])
  const [mode, setMode] = useState<string | null>(null) // 'ROUND_ROBIN' | 'KNOCKOUT' | null
  const [loading, setLoading] = useState(true)

  // Form tạo đội mới
  const [newTeamName, setNewTeamName] = useState('')
  const [pickIds, setPickIds] = useState<string[]>([])
  const [guestName, setGuestName] = useState('')
  const [guests, setGuests] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  // Thêm cầu thủ vào đội đã có
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [addPickIds, setAddPickIds] = useState<string[]>([])
  const [addGuest, setAddGuest] = useState('')
  const addGuestRef = useRef<HTMLInputElement>(null)

  // Lịch thi đấu
  const [doubleLeg, setDoubleLeg] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [scoreEdits, setScoreEdits] = useState<Record<string, { a: string; b: string }>>({})

  const fetchDetail = useCallback(async () => {
    if (!id) return
    try {
      const res = await api.get(`/minigames/${id}`)
      const m = res.data?.data ?? res.data
      setTeams((m?.teams ?? []) as RosterTeam[])
      setMatches((m?.matches ?? []) as FbMatch[])
      setMode((m?.settings?.footballFormat as string) ?? null)
      // Đồng bộ trạng thái vào store để badge header không kẹt "Nháp" sau khi tạo lịch/nhập điểm.
      if (m?.status) updateMinigame(id, { status: normalizeMinigameStatus(m.status) })
    } catch {
      toast.error('Không tải được dữ liệu giải')
    } finally {
      setLoading(false)
    }
  }, [id, updateMinigame])

  useEffect(() => { void fetchDetail() }, [fetchDetail])

  const nameOf = (rm: RosterMember) =>
    rm.guestName?.trim() || (rm.memberId ? memberName[rm.memberId] ?? 'Thành viên' : 'Thành viên')

  const totalPlayers = teams.reduce((s, t) => s + (t.members?.length ?? 0), 0)
  const completedMatches = matches.filter(m => m.status === 'COMPLETED').length

  // ── Tạo đội mới ──
  const togglePick = (mid: string) =>
    setPickIds(ids => ids.includes(mid) ? ids.filter(x => x !== mid) : [...ids, mid])
  const addGuestToForm = () => {
    const n = guestName.trim(); if (!n) return
    setGuests(g => [...g, n]); setGuestName('')
  }
  const createTeam = async () => {
    const name = newTeamName.trim()
    if (!name) { toast.error('Nhập tên đội'); return }
    setSaving(true)
    try {
      await api.post(`/minigames/${id}/roster-teams`, {
        name, memberIds: pickIds, guests: guests.map(g => ({ name: g })),
      })
      toast.success(`Đã tạo đội "${name}"`)
      setNewTeamName(''); setPickIds([]); setGuests([]); setSearch('')
      await fetchDetail()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Tạo đội thất bại')
    } finally { setSaving(false) }
  }

  // ── Thêm cầu thủ vào đội ──
  const openAdd = (teamId: string) => {
    setAddingTo(teamId); setAddPickIds([]); setAddGuest('')
    setTimeout(() => addGuestRef.current?.focus(), 50)
  }
  const submitAdd = async (teamId: string) => {
    const guestList = addGuest.trim() ? [{ name: addGuest.trim() }] : []
    if (addPickIds.length === 0 && guestList.length === 0) { toast.error('Chọn cầu thủ hoặc nhập tên khách'); return }
    try {
      await api.post(`/minigames/roster-teams/${teamId}/members`, { memberIds: addPickIds, guests: guestList })
      toast.success('Đã thêm cầu thủ')
      setAddingTo(null); setAddPickIds([]); setAddGuest('')
      await fetchDetail()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Thêm cầu thủ thất bại')
    }
  }
  const removeMember = async (rosterMemberId: string) => {
    try { await api.delete(`/minigames/roster-members/${rosterMemberId}`); await fetchDetail() }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Xóa cầu thủ thất bại') }
  }
  const deleteTeam = async (teamId: string, name: string) => {
    if (!window.confirm(`Xóa đội "${name}" và toàn bộ cầu thủ trong đội?`)) return
    if (matches.length > 0) { toast.error('Hãy xóa lịch thi đấu trước khi đổi danh sách đội.'); return }
    try { await api.delete(`/minigames/${id}/teams/${teamId}`); toast.success('Đã xóa đội'); await fetchDetail() }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Xóa đội thất bại') }
  }

  // ── Lịch thi đấu ──
  const generateSchedule = async () => {
    if (teams.length < 2) { toast.error('Cần ít nhất 2 đội'); return }
    setGenLoading(true)
    try {
      await api.post(`/minigames/${id}/football/schedule`, { doubleRoundRobin: doubleLeg })
      toast.success('Đã tạo lịch thi đấu vòng tròn')
      await fetchDetail()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Tạo lịch thất bại')
    } finally { setGenLoading(false) }
  }
  const clearSchedule = async () => {
    if (!window.confirm('Xóa toàn bộ lịch & kết quả thi đấu? Bảng xếp hạng sẽ về 0.')) return
    try { await api.delete(`/minigames/${id}/schedule`); toast.success('Đã xóa lịch'); setScoreEdits({}); await fetchDetail() }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Xóa lịch thất bại') }
  }
  const saveScore = async (matchId: string) => {
    const e = scoreEdits[matchId]
    const a = parseInt(e?.a ?? '', 10); const b = parseInt(e?.b ?? '', 10)
    if (Number.isNaN(a) || Number.isNaN(b)) { toast.error('Nhập tỉ số hai đội'); return }
    try {
      await api.patch(`/minigames/matches/${matchId}/score`, { scoreA: a, scoreB: b })
      toast.success('Đã lưu tỉ số')
      await fetchDetail()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Lưu tỉ số thất bại')
    }
  }

  // ── Loại trực tiếp (knockout) ──
  const generateKnockout = async () => {
    if (teams.length < 2) { toast.error('Cần ít nhất 2 đội'); return }
    setGenLoading(true)
    try {
      await api.post(`/minigames/${id}/football/knockout`)
      toast.success('Đã tạo nhánh loại trực tiếp')
      await fetchDetail()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Tạo nhánh thất bại')
    } finally { setGenLoading(false) }
  }
  const advanceKnockout = async () => {
    try {
      await api.post(`/minigames/${id}/football/knockout/advance`)
      toast.success('Đã tạo vòng kế tiếp')
      await fetchDetail()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Không tạo được vòng kế tiếp')
    }
  }

  // ── Kết thúc giải ──
  const canFinish = mg && mg.status !== 'COMPLETED' && mg.status !== 'CANCELLED'
  const handleEnd = async () => {
    if (!id) return
    const remaining = matches.length - completedMatches
    const msg = remaining > 0
      ? `Còn ${remaining} trận chưa có tỉ số. Vẫn kết thúc giải đấu?`
      : 'Kết thúc giải đấu? Trạng thái chuyển "Hoàn Thành" và lưu vào lịch sử CLB.'
    if (!window.confirm(msg)) return
    try {
      await api.post(`/minigames/${id}/end`)
      resync?.()
      toast.success('Đã kết thúc giải đấu — đã lưu vào lịch sử CLB!')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi kết thúc giải đấu')
    }
  }

  // ── Xuất ảnh/PDF bảng xếp hạng ──
  const exportStandings = async (fmt: 'png' | 'pdf') => {
    const el = `std-${id}`
    const fname = `BXH-${mg?.name ?? 'giai-dau'}`.replace(/\s+/g, '-')
    // Loại trực tiếp: xuất PDF VECTOR sơ đồ nhánh (khổ ngang).
    if (fmt === 'pdf' && isKnockout) {
      try {
        await exportKnockoutPDF({
          clubName: getClubData(clubId).settings?.name ?? 'CLB',
          tournamentName: mg?.name ?? 'Giải đấu',
          sportLabel: ui.name,
          championName: champion ?? undefined,
          rounds: matchGroups.map(grp => ({
            label: koRoundLabel(grp.matches.length, grp.round),
            matches: grp.matches.map(m => ({
              teamA: m.teamA?.name,
              teamB: m.teamB?.name,
              scoreA: m.status === 'COMPLETED' ? m.scoreA : null,
              scoreB: m.status === 'COMPLETED' ? m.scoreB : null,
              winner: m.winnerId ? (m.winnerId === m.teamAId ? 'A' : m.winnerId === m.teamBId ? 'B' : null) : null,
              walkover: !m.teamBId,
            })),
          })),
        })
      } catch {
        toast.error('Xuất PDF thất bại')
      }
      return
    }
    // PDF vector chuẩn SaaS cho BXH vòng tròn (dùng chung mẫu báo cáo tài chính).
    if (fmt === 'pdf' && !isKnockout) {
      try {
        await exportStandingsPDF({
          clubName: getClubData(clubId).settings?.name ?? 'CLB',
          tournamentName: mg?.name ?? 'Giải đấu',
          sportLabel: ui.name,
          formatLabel: 'Vòng tròn tính điểm',
          rankNote: `Xếp theo: Điểm → Hiệu số → ${ui.scoreWord}. Điểm: thắng ${mg?.winPoints ?? 3} · hòa ${mg?.drawPoints ?? 1} · thua ${mg?.lossPoints ?? 0}.`,
          stats: [
            { label: 'Số đội', value: teams.length },
            { label: 'Tổng trận', value: matches.length },
            { label: 'Đã có kết quả', value: `${completedMatches}/${matches.length}` },
          ],
          columns: [
            { key: 'rank', label: '#', w: 8, align: 'left' },
            { key: 'name', label: 'ĐỘI', w: 56, align: 'left', bold: true },
            { key: 'P', label: 'T', w: 14, align: 'center' },
            { key: 'W', label: 'TH', w: 14, align: 'center', tone: 'win' },
            { key: 'D', label: 'H', w: 14, align: 'center', tone: 'muted' },
            { key: 'L', label: 'B', w: 14, align: 'center', tone: 'loss' },
            { key: 'gfga', label: ui.gfgaShort, w: 24, align: 'center', tone: 'muted' },
            { key: 'gd', label: 'HS', w: 18, align: 'center', tone: 'sign' },
            { key: 'pts', label: 'ĐIỂM', w: 24, align: 'right', tone: 'points' },
          ],
          rows: standings.map(s => ({
            name: s.name, P: s.P, W: s.W, D: s.D, L: s.L,
            gfga: `${s.GF}-${s.GA}`, gd: s.GD > 0 ? `+${s.GD}` : String(s.GD), pts: s.Pts,
          })),
        })
      } catch {
        toast.error('Xuất PDF thất bại')
      }
      return
    }
    // Còn lại: xuất ẢNH (PNG) — report brand chuẩn SaaS (header + bảng đóng khung + footer).
    try {
      await captureElementAsReportPng(el, fname, { title: 'Bảng xếp hạng', subtitle: mg?.name ?? '' })
    } catch {
      toast.error('Xuất ảnh thất bại')
    }
  }

  // ── Xuất ảnh/PDF LỊCH & KẾT QUẢ (tab schedule) — knockout dùng PDF sơ đồ nhánh, vòng tròn dùng bảng lịch ──
  const exportSchedule = async (fmt: 'png' | 'pdf') => {
    const el = `sched-${id}`
    const fname = `Lich-${mg?.name ?? 'giai-dau'}`.replace(/\s+/g, '-')
    if (fmt === 'pdf' && isKnockout) {
      try {
        await exportKnockoutPDF({
          clubName: getClubData(clubId).settings?.name ?? 'CLB',
          tournamentName: mg?.name ?? 'Giải đấu',
          sportLabel: ui.name,
          championName: champion ?? undefined,
          rounds: matchGroups.map(grp => ({
            label: koRoundLabel(grp.matches.length, grp.round),
            matches: grp.matches.map(m => ({
              teamA: m.teamA?.name,
              teamB: m.teamB?.name,
              scoreA: m.status === 'COMPLETED' ? m.scoreA : null,
              scoreB: m.status === 'COMPLETED' ? m.scoreB : null,
              winner: m.winnerId ? (m.winnerId === m.teamAId ? 'A' : m.winnerId === m.teamBId ? 'B' : null) : null,
              walkover: !m.teamBId,
            })),
          })),
        })
      } catch { toast.error('Xuất PDF thất bại') }
      return
    }
    if (fmt === 'pdf' && !isKnockout) {
      try {
        await exportSchedulePDF({
          clubName: getClubData(clubId).settings?.name ?? 'CLB',
          tournamentName: mg?.name ?? 'Giải đấu',
          sportLabel: ui.name,
          formatLabel: hasDoubleLeg ? 'Vòng tròn (lượt đi & về)' : 'Vòng tròn',
          rankNote: 'Tỷ số theo Đội 1 – Đội 2. Trận chưa đấu để dấu “–”.',
          stats: [
            { label: 'Số đội', value: teams.length },
            { label: 'Tổng trận', value: matches.length },
            { label: 'Đã hoàn thành', value: `${completedMatches}/${matches.length}` },
          ],
          columns: [
            { key: 'vong', label: 'VÒNG', w: 24, align: 'left', bold: true },
            { key: 't1', label: 'ĐỘI 1', w: 58, align: 'left' },
            { key: 'sc', label: 'TỶ SỐ', w: 22, align: 'center', bold: true },
            { key: 't2', label: 'ĐỘI 2', w: 58, align: 'left' },
            { key: 'st', label: 'TRẠNG THÁI', w: 24, align: 'right', tone: 'muted' },
          ],
          rows: matchGroups.flatMap(grp => grp.matches.map(m => ({
            vong: hasDoubleLeg ? `${grp.leg === 1 ? 'Đi' : 'Về'} · V${grp.round}` : `Vòng ${grp.round}`,
            t1: teamName(m, 'A'),
            sc: m.status === 'COMPLETED' ? `${m.scoreA} - ${m.scoreB}` : '–',
            t2: teamName(m, 'B'),
            st: m.status === 'COMPLETED' ? 'Đã xong' : 'Chờ',
          }))),
        })
      } catch { toast.error('Xuất PDF thất bại') }
      return
    }
    try {
      await captureElementAsReportPng(el, fname, { title: 'Lịch thi đấu', subtitle: mg?.name ?? '' })
    } catch { toast.error('Xuất ảnh thất bại') }
  }

  // ── Bảng xếp hạng (tính client từ matches đã hoàn thành) ──
  const standings = useMemo(() => {
    const stat: Record<string, { id: string; name: string; P: number; W: number; D: number; L: number; GF: number; GA: number }> = {}
    teams.forEach(t => { stat[t.id] = { id: t.id, name: t.name, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0 } })
    matches
      .filter(m => m.status === 'COMPLETED' && m.teamAId && m.teamBId && m.scoreA != null && m.scoreB != null)
      .forEach(m => {
        const a = stat[m.teamAId!]; const b = stat[m.teamBId!]
        if (!a || !b) return
        const sa = m.scoreA!; const sb = m.scoreB!
        a.P++; b.P++; a.GF += sa; a.GA += sb; b.GF += sb; b.GA += sa
        if (sa > sb) { a.W++; b.L++ } else if (sa < sb) { b.W++; a.L++ } else { a.D++; b.D++ }
      })
    const win = mg?.winPoints ?? 3, draw = mg?.drawPoints ?? 1, loss = mg?.lossPoints ?? 0
    return Object.values(stat)
      .map(s => ({ ...s, GD: s.GF - s.GA, Pts: s.W * win + s.D * draw + s.L * loss }))
      .sort((x, y) => y.Pts - x.Pts || y.GD - x.GD || y.GF - x.GF || x.name.localeCompare(y.name))
  }, [teams, matches, mg])

  // Nhóm trận theo lượt → vòng để hiển thị
  const matchGroups = useMemo(() => {
    const byLegRound: Record<string, FbMatch[]> = {}
    matches.forEach(m => {
      const key = `${m.leg}-${m.round}`
      ;(byLegRound[key] ??= []).push(m)
    })
    return Object.entries(byLegRound)
      .map(([key, ms]) => {
        const [leg, round] = key.split('-').map(Number)
        return { leg, round, matches: ms }
      })
      .sort((a, b) => a.leg - b.leg || a.round - b.round)
  }, [matches])

  const hasDoubleLeg = matches.some(m => m.leg === 2)
  const isKnockout = mode === 'KNOCKOUT'

  // Nhãn vòng loại trực tiếp theo số trận trong vòng: 1=Chung kết, 2=Bán kết, 4=Tứ kết...
  const koRoundLabel = (matchCount: number, roundIdx: number) => {
    if (matchCount === 1) return 'Chung kết'
    if (matchCount === 2) return 'Bán kết'
    if (matchCount === 4) return 'Tứ kết'
    return `Vòng ${roundIdx} (1/${matchCount})`
  }

  // Vòng hiện tại (cao nhất) của nhánh loại trực tiếp + trạng thái để mở nút "Tạo vòng kế tiếp".
  const maxRound = matches.length ? Math.max(...matches.map(m => m.round)) : 0
  const currentRoundMatches = matches.filter(m => m.round === maxRound)
  const currentComplete = currentRoundMatches.length > 0 &&
    currentRoundMatches.every(m => m.status === 'COMPLETED' && m.winnerId)
  const isFinalReached = currentRoundMatches.length === 1
  const canAdvance = isKnockout && !isFinalReached && currentComplete
  const champion = isKnockout && isFinalReached && currentComplete
    ? (currentRoundMatches[0].winnerId === currentRoundMatches[0].teamAId
        ? currentRoundMatches[0].teamA?.name
        : currentRoundMatches[0].teamB?.name) ?? null
    : null

  if (!mg) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="[color:var(--pf-color-muted)]">Không tìm thấy giải đấu</p>
      </div>
    )
  }

  // Nhãn theo bộ môn (bóng đá / bóng rổ) — cùng engine đội-roster.
  const ui = SPORT_UI[mg.sport ?? 'FOOTBALL'] ?? SPORT_UI.FOOTBALL

  const filteredMembers = members.filter(m =>
    !search.trim() || m.fullName.toLowerCase().includes(search.trim().toLowerCase()))

  const teamName = (m: FbMatch, side: 'A' | 'B') =>
    (side === 'A' ? m.teamA?.name : m.teamB?.name) ?? 'Đội'

  const TABS: Array<{ key: Tab; label: string; icon: ReactNode }> = [
    { key: 'teams', label: ui.teamTab, icon: <Shield size={16} /> },
    { key: 'schedule', label: 'Lịch & Kết quả', icon: <CalendarDays size={16} /> },
    { key: 'standings', label: 'Bảng xếp hạng', icon: <BarChart2 size={16} /> },
  ]

  return (
    <div className="flex-1 overflow-y-auto [background:var(--pf-bg)]">
      {/* Header */}
      <div className="sticky top-0 z-10 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 sm:px-6 py-4">
        <button onClick={() => navigate('/minigames')} className="flex items-center gap-1.5 text-sm [color:var(--pf-color-muted)] hover:[color:var(--pf-text)] transition-colors w-fit">
          <ArrowLeft size={14} /> Danh Sách Minigame
        </button>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold [color:var(--pf-text)]">{mg.name}</h1>
              <StatusBadge status={mg.status as 'IN_PROGRESS' | 'COMPLETED' | 'DRAFT' | 'GROUPED' | 'SCHEDULED' | 'CANCELLED'} />
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700">{ui.emoji} {ui.name}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap text-sm [color:var(--pf-color-muted)]">
              <span className="flex items-center gap-1.5"><Calendar size={14} />{mg.startDate}{mg.endDate ? ` — ${mg.endDate}` : ''}</span>
            </div>
          </div>
          {canFinish && (
            <button onClick={handleEnd} className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors md:w-auto" style={{ background: '#16A34A' }}>
              <Trophy size={16} /> Kết thúc giải đấu
            </button>
          )}
        </div>

        {/* Tab pills */}
        <div className="mt-3 flex gap-2 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                tab === t.key ? 'text-white [background:var(--pf-primary)]' : '[color:var(--pf-color-muted)] [background:var(--pf-color-muted-soft)] hover:bg-slate-200',
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-[1280px] mx-auto flex flex-col gap-5">
        {/* KPI */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 sm:max-w-xl">
          <div className="rounded-[18px] border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
            <div className="flex items-center gap-2 text-xs [color:var(--pf-color-muted)]"><Shield size={16} /> Số đội</div>
            <p className="mt-1 text-2xl font-bold [color:var(--pf-text)]">{teams.length}</p>
          </div>
          <div className="rounded-[18px] border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
            <div className="flex items-center gap-2 text-xs [color:var(--pf-color-muted)] capitalize"><Users size={16} /> {ui.player}</div>
            <p className="mt-1 text-2xl font-bold [color:var(--pf-text)]">{totalPlayers}</p>
          </div>
          <div className="rounded-[18px] border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
            <div className="flex items-center gap-2 text-xs [color:var(--pf-color-muted)]"><ListChecks size={16} /> Trận</div>
            <p className="mt-1 text-2xl font-bold [color:var(--pf-text)]">{completedMatches}/{matches.length}</p>
          </div>
        </div>

        {/* ══ TAB: ĐỘI BÓNG ══ */}
        {tab === 'teams' && (
          <>
            {/* Tạo đội mới */}
            <div className="rounded-[18px] border p-4 sm:p-5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
              <h2 className="flex items-center gap-2 font-semibold [color:var(--pf-text)]"><Plus size={18} /> Tạo đội mới</h2>
              <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="Tên đội (vd: FC Sấm Sét)"
                className="mt-3 w-full rounded-xl border border-[color:var(--pf-border)] px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--pf-primary)]" />
              <div className="mt-3">
                <div className="flex items-center gap-2 text-xs font-medium [color:var(--pf-color-muted)]">
                  <Users size={14} /> <span className="capitalize">{ui.player}</span> là thành viên CLB {pickIds.length > 0 && <span className="[color:var(--pf-primary)]">({pickIds.length} đã chọn)</span>}
                </div>
                <div className="mt-2 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)]" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm thành viên..."
                    className="w-full rounded-xl border border-[color:var(--pf-border)] pl-8 pr-3 py-2 text-sm outline-none focus:border-[color:var(--pf-primary)]" />
                </div>
                <div className="mt-2 flex flex-wrap gap-2 max-h-44 overflow-y-auto">
                  {filteredMembers.map(m => (
                    <button key={m.id} onClick={() => togglePick(m.id)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                        pickIds.includes(m.id) ? 'text-white [background:var(--pf-primary)] border-transparent' : '[color:var(--pf-color-muted)] [background:var(--pf-surface)] border-[color:var(--pf-border)] hover:border-slate-300'
                      }`}>
                      {pickIds.includes(m.id) && <X size={12} />} {m.fullName}
                    </button>
                  ))}
                  {filteredMembers.length === 0 && <p className="text-xs [color:var(--pf-color-muted)] py-1">Không có thành viên phù hợp</p>}
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-2 text-xs font-medium [color:var(--pf-color-muted)]"><UserPlus size={14} /> Khách mời (ngoài CLB)</div>
                <div className="mt-2 flex gap-2">
                  <input value={guestName} onChange={e => setGuestName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGuestToForm() } }}
                    placeholder="Tên khách" className="flex-1 rounded-xl border border-[color:var(--pf-border)] px-3.5 py-2 text-sm outline-none focus:border-[color:var(--pf-primary)]" />
                  <button onClick={addGuestToForm} className="rounded-xl px-3 py-2 text-sm font-semibold text-white [background:var(--pf-primary)]">Thêm</button>
                </div>
                {guests.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {guests.map((g, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-3 py-1 text-xs">
                        {g}<button onClick={() => setGuests(gs => gs.filter((_, j) => j !== i))}><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={createTeam} disabled={saving}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm [background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)] disabled:opacity-60">
                <Plus size={16} /> {saving ? 'Đang tạo...' : 'Tạo đội'}
              </button>
            </div>

            {/* Danh sách đội */}
            {loading ? (
              <p className="text-sm [color:var(--pf-color-muted)]">Đang tải danh sách đội...</p>
            ) : teams.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-[color:var(--pf-border)] p-8 text-center">
                <Shield size={28} className="mx-auto [color:var(--pf-color-muted)]" />
                <p className="mt-2 text-sm [color:var(--pf-color-muted)]">Chưa có đội nào. Tạo đội đầu tiên phía trên.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {teams.map(team => (
                  <div key={team.id} className="rounded-[18px] border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold [color:var(--pf-text)] truncate flex items-center gap-1.5"><Shield size={16} className="text-emerald-600" /> {team.name}</p>
                        <p className="mt-0.5 text-xs [color:var(--pf-color-muted)]">{team.members?.length ?? 0} {ui.player}</p>
                      </div>
                      <button onClick={() => deleteTeam(team.id, team.name)} className="[color:var(--pf-color-muted)] hover:text-red-500 transition-colors" title="Xóa đội"><Trash2 size={16} /></button>
                    </div>
                    <ul className="mt-3 flex flex-col gap-1.5">
                      {(team.members ?? []).map(rm => (
                        <li key={rm.id} className="flex items-center justify-between gap-2 rounded-lg [background:var(--pf-surface-muted)] px-3 py-1.5 text-sm">
                          <span className="[color:var(--pf-text)] truncate">
                            {nameOf(rm)}{rm.guestName && <span className="ml-1.5 text-[10px] rounded bg-amber-100 text-amber-700 px-1.5 py-0.5">Khách</span>}
                          </span>
                          <button onClick={() => removeMember(rm.id)} className="[color:var(--pf-color-muted)] hover:text-red-500" title="Bỏ khỏi đội"><X size={14} /></button>
                        </li>
                      ))}
                      {(team.members?.length ?? 0) === 0 && <li className="text-xs [color:var(--pf-color-muted)] px-1">Chưa có {ui.player}</li>}
                    </ul>
                    {addingTo === team.id ? (
                      <div className="mt-3 rounded-xl border border-[color:var(--pf-border)] p-3">
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                          {members.map(m => (
                            <button key={m.id} onClick={() => setAddPickIds(ids => ids.includes(m.id) ? ids.filter(x => x !== m.id) : [...ids, m.id])}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border transition-colors ${
                                addPickIds.includes(m.id) ? 'text-white [background:var(--pf-primary)] border-transparent' : '[color:var(--pf-color-muted)] [background:var(--pf-surface)] border-[color:var(--pf-border)]'
                              }`}>{m.fullName}</button>
                          ))}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <input ref={addGuestRef} value={addGuest} onChange={e => setAddGuest(e.target.value)} placeholder="hoặc tên khách"
                            className="flex-1 rounded-lg border border-[color:var(--pf-border)] px-3 py-1.5 text-sm outline-none focus:border-[color:var(--pf-primary)]" />
                          <button onClick={() => submitAdd(team.id)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white [background:var(--pf-primary)]">Lưu</button>
                          <button onClick={() => setAddingTo(null)} className="rounded-lg px-3 py-1.5 text-sm [color:var(--pf-color-muted)] [background:var(--pf-color-muted-soft)]">Hủy</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => openAdd(team.id)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold [color:var(--pf-primary)] hover:underline">
                        <UserPlus size={14} /> Thêm {ui.player}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ TAB: LỊCH & KẾT QUẢ ══ */}
        {tab === 'schedule' && (
          <>
            {matches.length === 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Vòng tròn */}
                <div className="rounded-[18px] border p-5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
                  <h2 className="flex items-center gap-2 font-semibold [color:var(--pf-text)]"><CalendarDays size={18} /> Vòng tròn</h2>
                  <p className="mt-1 text-sm [color:var(--pf-color-muted)]">Mỗi đội gặp tất cả các đội còn lại — tính bảng xếp hạng. Cần ít nhất 2 đội ({teams.length} đội hiện có).</p>
                  <label className="mt-3 flex items-center gap-2 text-sm [color:var(--pf-text)] cursor-pointer w-fit">
                    <input type="checkbox" checked={doubleLeg} onChange={e => setDoubleLeg(e.target.checked)} className="accent-[color:var(--pf-primary)]" />
                    Đá lượt đi & lượt về (mỗi cặp gặp nhau 2 lần)
                  </label>
                  <button onClick={generateSchedule} disabled={genLoading || teams.length < 2}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm [background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)] disabled:opacity-50">
                    <CalendarDays size={16} /> {genLoading ? 'Đang tạo...' : 'Tạo lịch vòng tròn'}
                  </button>
                </div>
                {/* Loại trực tiếp */}
                <div className="rounded-[18px] border p-5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
                  <h2 className="flex items-center gap-2 font-semibold [color:var(--pf-text)]"><Swords size={18} /> Loại trực tiếp</h2>
                  <p className="mt-1 text-sm [color:var(--pf-color-muted)]">Đấu loại một trận, đội thắng đi tiếp tới khi tìm ra nhà vô địch. Đội lẻ sẽ có suất đi tiếp (BYE) ở vòng 1.</p>
                  <button onClick={generateKnockout} disabled={genLoading || teams.length < 2}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm bg-slate-800 hover:bg-slate-900 disabled:opacity-50">
                    <Swords size={16} /> {genLoading ? 'Đang tạo...' : 'Tạo nhánh loại trực tiếp'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {champion && (
                  <div className="rounded-[18px] border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 flex items-center gap-3">
                    <Crown size={28} className="text-amber-500" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Nhà vô địch</p>
                      <p className="text-lg font-bold text-amber-900">{champion}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm [color:var(--pf-color-muted)]">
                    {isKnockout ? 'Loại trực tiếp' : `Vòng tròn${hasDoubleLeg ? ' (lượt đi & về)' : ''}`} · {matches.length} trận · đã có kết quả {completedMatches}/{matches.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => exportSchedule('png')} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold [color:var(--pf-text)] [background:var(--pf-color-muted-soft)] hover:bg-slate-200 transition-colors"><ImageIcon size={14} /> Xuất ảnh</button>
                    <button onClick={() => exportSchedule('pdf')} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold [color:var(--pf-text)] [background:var(--pf-color-muted-soft)] hover:bg-slate-200 transition-colors"><FileDown size={14} /> Xuất PDF</button>
                    {canAdvance && (
                      <button onClick={advanceKnockout} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white [background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)] transition-colors">
                        <ChevronRight size={14} /> Tạo vòng kế tiếp
                      </button>
                    )}
                    <button onClick={clearSchedule} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                      <Trash2 size={14} /> Xóa lịch & tạo lại
                    </button>
                  </div>
                </div>
                <div id={`sched-${id}`} className="flex flex-col gap-4">
                {matchGroups.map(grp => (
                  <div key={`${grp.leg}-${grp.round}`}>
                    <p className="text-xs font-semibold uppercase tracking-wide [color:var(--pf-color-muted)] mb-2">
                      {isKnockout
                        ? koRoundLabel(grp.matches.length, grp.round)
                        : `${hasDoubleLeg ? `Lượt ${grp.leg === 1 ? 'đi' : 'về'} · ` : ''}Vòng ${grp.round}`}
                    </p>
                    <div className="flex flex-col gap-2">
                      {grp.matches.map(m => {
                        const done = m.status === 'COMPLETED'
                        const walkover = isKnockout && !m.teamBId
                        const edit = scoreEdits[m.id] ?? { a: done ? String(m.scoreA ?? '') : '', b: done ? String(m.scoreB ?? '') : '' }
                        return (
                          <div key={m.id} className="rounded-[14px] border p-3 [background:var(--pf-surface)] border-[color:var(--pf-border)] flex items-center gap-2 sm:gap-3">
                            <span className={cn('flex-1 text-right text-sm font-medium truncate', done && m.winnerId === m.teamAId ? 'text-emerald-600 font-bold' : '[color:var(--pf-text)]')}>{teamName(m, 'A')}</span>
                            {walkover ? (
                              <span className="text-xs [color:var(--pf-color-muted)] px-3">được đi tiếp</span>
                            ) : (
                              <>
                                <input inputMode="numeric" value={edit.a}
                                  onChange={e => setScoreEdits(s => ({ ...s, [m.id]: { a: e.target.value.replace(/\D/g, ''), b: (s[m.id]?.b ?? (done ? String(m.scoreB ?? '') : '')) } }))}
                                  className="w-11 rounded-lg border border-[color:var(--pf-border)] py-1.5 text-center text-sm outline-none focus:border-[color:var(--pf-primary)]" />
                                <span className="[color:var(--pf-color-muted)] text-xs">-</span>
                                <input inputMode="numeric" value={edit.b}
                                  onChange={e => setScoreEdits(s => ({ ...s, [m.id]: { a: (s[m.id]?.a ?? (done ? String(m.scoreA ?? '') : '')), b: e.target.value.replace(/\D/g, '') } }))}
                                  className="w-11 rounded-lg border border-[color:var(--pf-border)] py-1.5 text-center text-sm outline-none focus:border-[color:var(--pf-primary)]" />
                              </>
                            )}
                            <span className={cn('flex-1 text-left text-sm font-medium truncate', done && m.winnerId === m.teamBId ? 'text-emerald-600 font-bold' : '[color:var(--pf-text)]')}>{walkover ? '—' : teamName(m, 'B')}</span>
                            {!walkover && (
                              <button onClick={() => saveScore(m.id)} title="Lưu tỉ số"
                                className={cn('shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white transition-colors', done ? 'bg-emerald-500 hover:bg-emerald-500' : '[background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)]')}>
                                <Save size={14} />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
                </div>
                {isKnockout && !canAdvance && !isFinalReached && !currentComplete && (
                  <p className="text-xs [color:var(--pf-color-muted)]">Nhập đủ tỉ số (có đội thắng) cho vòng hiện tại để mở vòng kế tiếp.</p>
                )}
              </>
            )}
          </>
        )}

        {/* ══ TAB: BẢNG XẾP HẠNG ══ */}
        {tab === 'standings' && (
          teams.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-[color:var(--pf-border)] p-8 text-center">
              <BarChart2 size={28} className="mx-auto [color:var(--pf-color-muted)]" />
              <p className="mt-2 text-sm [color:var(--pf-color-muted)]">Chưa có đội. Tạo đội và lịch thi đấu để có bảng xếp hạng.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-end gap-2">
                <button onClick={() => exportStandings('png')} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold [color:var(--pf-text)] [background:var(--pf-color-muted-soft)] hover:bg-slate-200 transition-colors"><ImageIcon size={14} /> Xuất ảnh</button>
                <button onClick={() => exportStandings('pdf')} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold [color:var(--pf-text)] [background:var(--pf-color-muted-soft)] hover:bg-slate-200 transition-colors"><FileDown size={14} /> Xuất PDF</button>
              </div>
              {isKnockout ? (
            <div id={`std-${id}`} className="rounded-[18px] border p-5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
              {champion ? (
                <div className="flex items-center gap-3 rounded-[14px] border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4">
                  <Crown size={30} className="text-amber-500" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Nhà vô địch</p>
                    <p className="text-xl font-bold text-amber-900">{champion}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm [color:var(--pf-color-muted)]">Giải loại trực tiếp đang diễn ra — nhà vô địch sẽ hiện khi chung kết có kết quả. Xem nhánh đấu ở tab <strong>Lịch &amp; Kết quả</strong>.</p>
              )}
              {matchGroups.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {matchGroups.map(grp => (
                    <div key={`s-${grp.round}`} className="flex items-center gap-2 text-sm">
                      <span className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide [color:var(--pf-color-muted)]">{koRoundLabel(grp.matches.length, grp.round)}</span>
                      <span className="[color:var(--pf-color-muted)]">{grp.matches.filter(m => m.status === 'COMPLETED').length}/{grp.matches.length} trận xong</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
              ) : (
            <div id={`std-${id}`} className="rounded-[18px] border overflow-hidden [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide [color:var(--pf-color-muted)] border-b border-[color:var(--pf-border)]">
                      <th className="text-left font-semibold px-3 py-2.5">#</th>
                      <th className="text-left font-semibold px-3 py-2.5">Đội</th>
                      <th className="text-center font-semibold px-2 py-2.5" title="Số trận">T</th>
                      <th className="text-center font-semibold px-2 py-2.5" title="Thắng">Th</th>
                      <th className="text-center font-semibold px-2 py-2.5" title="Hòa">H</th>
                      <th className="text-center font-semibold px-2 py-2.5" title="Thua">B</th>
                      <th className="text-center font-semibold px-2 py-2.5" title={ui.gfgaTitle}>{ui.gfgaShort}</th>
                      <th className="text-center font-semibold px-2 py-2.5" title="Hiệu số">HS</th>
                      <th className="text-center font-semibold px-3 py-2.5" title="Điểm">Điểm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, i) => (
                      <tr key={s.id} className={cn('border-b last:border-0 border-[color:var(--pf-border)]', i < 3 && 'bg-emerald-50/40')}>
                        <td className="px-3 py-2.5 [color:var(--pf-color-muted)]">{i + 1}</td>
                        <td className="px-3 py-2.5 font-medium [color:var(--pf-text)]">{s.name}</td>
                        <td className="text-center px-2 py-2.5">{s.P}</td>
                        <td className="text-center px-2 py-2.5 text-emerald-600 font-medium">{s.W}</td>
                        <td className="text-center px-2 py-2.5 [color:var(--pf-color-muted)]">{s.D}</td>
                        <td className="text-center px-2 py-2.5 text-red-500">{s.L}</td>
                        <td className="text-center px-2 py-2.5 [color:var(--pf-color-muted)]">{s.GF}-{s.GA}</td>
                        <td className={cn('text-center px-2 py-2.5 font-medium', s.GD > 0 ? 'text-emerald-600' : s.GD < 0 ? 'text-red-500' : '[color:var(--pf-color-muted)]')}>{s.GD > 0 ? `+${s.GD}` : s.GD}</td>
                        <td className="text-center px-3 py-2.5 font-bold [color:var(--pf-primary)]">{s.Pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-3 py-2 text-[11px] [color:var(--pf-color-muted)] border-t border-[color:var(--pf-border)]">
                Xếp theo: Điểm → Hiệu số → {ui.scoreWord}. Điểm: thắng {mg.winPoints} · hòa {mg.drawPoints} · thua {mg.lossPoints}.
              </p>
            </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  )
}
