/**
 * GolfDashboardPage (Pha 2) — Dashboard bộ môn GOLF (stroke-play / leaderboard).
 * 3 tab: Golfer (cá nhân: member CLB + khách) · Nhập điểm (số gậy từng vòng) ·
 * Bảng xếp hạng (tổng gậy nhỏ nhất đứng đầu). Tính leaderboard client từ scores.
 * Endpoint: POST :id/golfers · DELETE golfers/:id · PATCH golfers/:id/score.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Calendar, Users, Trophy, UserPlus, X, Plus, Trash2, Search,
  BarChart2, ClipboardList, Save, Crown, Flag, Image as ImageIcon, FileDown,
} from 'lucide-react'
import { exportInfographicAsPng } from '../../../components/reports/infographic/infographic.utils'
import { exportStandingsPDF } from '../../../lib/export'
import toast from 'react-hot-toast'
import { StatusBadge } from '../../../components/minigame/v2/StatusBadge'
import { useMinigameStore } from '../../../store/minigameStore'
import { useClubDataStore } from '../../../store/clubDataStore'
import { useAuthStore } from '../../../store/authStore'
import api from '../../../lib/api'
import { cn } from '../../../lib/utils'

interface GolfScore { id?: string; round: number; strokes: number }
interface Golfer { id: string; memberId?: string | null; guestName?: string | null; scores: GolfScore[] }
type Tab = 'golfers' | 'scores' | 'leaderboard'

export function GolfDashboardPage({ resync }: { resync?: () => void }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { getMinigame } = useMinigameStore()
  const { getClubData } = useClubDataStore()
  const mg = getMinigame(id!)
  const members = getClubData(clubId).members

  const memberName = useMemo(() => {
    const map: Record<string, string> = {}
    members.forEach(m => { map[m.id] = m.fullName })
    return map
  }, [members])

  const [tab, setTab] = useState<Tab>('golfers')
  const [golfers, setGolfers] = useState<Golfer[]>([])
  const [rounds, setRounds] = useState(1)
  const [loading, setLoading] = useState(true)

  // Thêm golfer
  const [pickIds, setPickIds] = useState<string[]>([])
  const [guestName, setGuestName] = useState('')
  const [guests, setGuests] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  // Nhập điểm: map `${golferId}:${round}` → chuỗi số gậy
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [savingScores, setSavingScores] = useState(false)

  const fetchDetail = useCallback(async () => {
    if (!id) return
    try {
      const res = await api.get(`/minigames/${id}`)
      const m = res.data?.data ?? res.data
      setGolfers((m?.golfers ?? []) as Golfer[])
      setRounds(Math.max(1, Number(m?.settings?.rounds) || 1))
    } catch {
      toast.error('Không tải được dữ liệu giải')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void fetchDetail() }, [fetchDetail])

  const nameOf = (g: Golfer) =>
    g.guestName?.trim() || (g.memberId ? memberName[g.memberId] ?? 'Thành viên' : 'Thành viên')

  const roundList = useMemo(() => Array.from({ length: rounds }, (_, i) => i + 1), [rounds])

  // ── Thêm golfer ──
  const togglePick = (mid: string) =>
    setPickIds(ids => ids.includes(mid) ? ids.filter(x => x !== mid) : [...ids, mid])
  const addGuestToForm = () => {
    const n = guestName.trim(); if (!n) return
    setGuests(g => [...g, n]); setGuestName('')
  }
  const addGolfers = async () => {
    if (pickIds.length === 0 && guests.length === 0) { toast.error('Chọn golfer hoặc nhập khách'); return }
    setSaving(true)
    try {
      await api.post(`/minigames/${id}/golfers`, {
        memberIds: pickIds, guests: guests.map(g => ({ name: g })),
      })
      toast.success('Đã thêm golfer')
      setPickIds([]); setGuests([]); setSearch('')
      await fetchDetail()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Thêm golfer thất bại')
    } finally { setSaving(false) }
  }
  const removeGolfer = async (golferId: string, name: string) => {
    if (!window.confirm(`Xóa golfer "${name}" khỏi giải?`)) return
    try { await api.delete(`/minigames/golfers/${golferId}`); toast.success('Đã xóa golfer'); await fetchDetail() }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Xóa golfer thất bại') }
  }

  // ── Nhập điểm ──
  const cellValue = (g: Golfer, round: number) => {
    const key = `${g.id}:${round}`
    if (key in edits) return edits[key]
    const s = g.scores.find(x => x.round === round)
    return s ? String(s.strokes) : ''
  }
  const saveScores = async () => {
    const entries = Object.entries(edits).filter(([, v]) => v.trim() !== '')
    if (entries.length === 0) { toast('Chưa có thay đổi điểm', { icon: 'ℹ️' }); return }
    setSavingScores(true)
    try {
      for (const [key, v] of entries) {
        const [golferId, roundStr] = key.split(':')
        const strokes = parseInt(v, 10)
        if (Number.isNaN(strokes) || strokes < 1) continue
        await api.patch(`/minigames/golfers/${golferId}/score`, { round: Number(roundStr), strokes })
      }
      toast.success('Đã lưu điểm')
      setEdits({})
      await fetchDetail()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lưu điểm thất bại')
    } finally { setSavingScores(false) }
  }

  // ── Kết thúc giải ──
  const canFinish = mg && mg.status !== 'COMPLETED' && mg.status !== 'CANCELLED'
  const handleEnd = async () => {
    if (!id) return
    if (!window.confirm('Kết thúc giải golf? Trạng thái chuyển "Hoàn Thành" và lưu vào lịch sử CLB.')) return
    try {
      await api.post(`/minigames/${id}/end`)
      resync?.()
      toast.success('Đã kết thúc giải — đã lưu vào lịch sử CLB!')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi kết thúc giải')
    }
  }

  // ── Xuất ảnh/PDF bảng xếp hạng ──
  const exportLeaderboard = async (fmt: 'png' | 'pdf') => {
    const el = `golf-lb-${id}`
    const fname = `BXH-golf-${mg?.name ?? 'giai-dau'}`.replace(/\s+/g, '-')
    // PDF vector chuẩn SaaS cho bảng điểm golf (dùng chung mẫu báo cáo tài chính).
    if (fmt === 'pdf') {
      try {
        await exportStandingsPDF({
          clubName: getClubData(clubId).settings?.name ?? 'CLB',
          tournamentName: mg?.name ?? 'Giải golf',
          sportLabel: 'Golf',
          formatLabel: `Stroke-play · ${rounds} vòng`,
          rankNote: 'Xếp theo: tổng gậy nhỏ nhất. Golfer chưa ghi điểm xếp cuối.',
          stats: [
            { label: 'Golfer', value: golfers.length },
            { label: 'Số vòng', value: rounds },
          ],
          columns: [
            { key: 'rank', label: '#', w: 12, align: 'left' },
            { key: 'name', label: 'GOLFER', w: 96, align: 'left', bold: true },
            { key: 'played', label: 'VÒNG', w: 36, align: 'center', tone: 'muted' },
            { key: 'total', label: 'TỔNG GẬY', w: 42, align: 'right', tone: 'points' },
          ],
          rows: leaderboard.map(s => ({
            name: s.name,
            played: `${s.played}/${rounds}`,
            total: s.played > 0 ? s.total : '—',
          })),
        })
      } catch {
        toast.error('Xuất PDF thất bại')
      }
      return
    }
    try {
      await exportInfographicAsPng(el, fname)
    } catch {
      toast.error('Xuất thất bại')
    }
  }

  // ── Bảng xếp hạng (tổng gậy nhỏ nhất) ──
  const leaderboard = useMemo(() => {
    return golfers
      .map(g => {
        const played = g.scores.length
        const total = g.scores.reduce((s, x) => s + x.strokes, 0)
        return { id: g.id, name: nameOf(g), played, total, scores: g.scores }
      })
      .sort((a, b) => {
        if ((a.played > 0) !== (b.played > 0)) return a.played > 0 ? -1 : 1 // chưa có điểm xuống cuối
        return a.total - b.total // tổng gậy nhỏ hơn đứng trên
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [golfers, memberName])

  if (!mg) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-slate-500">Không tìm thấy giải đấu</p></div>
  }

  const filteredMembers = members.filter(m =>
    !search.trim() || m.fullName.toLowerCase().includes(search.trim().toLowerCase()))

  const TABS: Array<{ key: Tab; label: string; icon: ReactNode }> = [
    { key: 'golfers', label: 'Golfer', icon: <Users size={16} /> },
    { key: 'scores', label: 'Nhập điểm', icon: <ClipboardList size={16} /> },
    { key: 'leaderboard', label: 'Bảng xếp hạng', icon: <BarChart2 size={16} /> },
  ]

  return (
    <div className="flex-1 overflow-y-auto [background:var(--pf-bg)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 sm:px-6 py-4">
        <button onClick={() => navigate('/minigames')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors w-fit">
          <ArrowLeft size={14} /> Danh Sách Minigame
        </button>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{mg.name}</h1>
              <StatusBadge status={mg.status as 'IN_PROGRESS' | 'COMPLETED' | 'DRAFT' | 'GROUPED' | 'SCHEDULED' | 'CANCELLED'} />
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700">⛳ Golf</span>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">{rounds} vòng</span>
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap text-sm text-slate-500">
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
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                tab === t.key ? 'text-white [background:var(--pf-primary)]' : 'text-slate-600 bg-slate-100 hover:bg-slate-200')}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-[1280px] mx-auto flex flex-col gap-5">
        {/* KPI */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:max-w-md">
          <div className="rounded-[18px] border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
            <div className="flex items-center gap-2 text-xs [color:var(--pf-color-muted)]"><Users size={16} /> Golfer</div>
            <p className="mt-1 text-2xl font-bold [color:var(--pf-text)]">{golfers.length}</p>
          </div>
          <div className="rounded-[18px] border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
            <div className="flex items-center gap-2 text-xs [color:var(--pf-color-muted)]"><Flag size={16} /> Số vòng</div>
            <p className="mt-1 text-2xl font-bold [color:var(--pf-text)]">{rounds}</p>
          </div>
        </div>

        {/* ══ TAB: GOLFER ══ */}
        {tab === 'golfers' && (
          <>
            <div className="rounded-[18px] border p-4 sm:p-5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
              <h2 className="flex items-center gap-2 font-semibold [color:var(--pf-text)]"><Plus size={18} /> Thêm golfer</h2>
              <div className="mt-3">
                <div className="flex items-center gap-2 text-xs font-medium [color:var(--pf-color-muted)]">
                  <Users size={14} /> Thành viên CLB {pickIds.length > 0 && <span className="[color:var(--pf-primary)]">({pickIds.length} đã chọn)</span>}
                </div>
                <div className="mt-2 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm thành viên..."
                    className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-sm outline-none focus:border-[color:var(--pf-primary)]" />
                </div>
                <div className="mt-2 flex flex-wrap gap-2 max-h-44 overflow-y-auto">
                  {filteredMembers.map(m => (
                    <button key={m.id} onClick={() => togglePick(m.id)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                        pickIds.includes(m.id) ? 'text-white [background:var(--pf-primary)] border-transparent' : 'text-slate-600 bg-white border-slate-200 hover:border-slate-300'
                      }`}>
                      {pickIds.includes(m.id) && <X size={12} />} {m.fullName}
                    </button>
                  ))}
                  {filteredMembers.length === 0 && <p className="text-xs text-slate-400 py-1">Không có thành viên phù hợp</p>}
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-2 text-xs font-medium [color:var(--pf-color-muted)]"><UserPlus size={14} /> Khách mời (ngoài CLB)</div>
                <div className="mt-2 flex gap-2">
                  <input value={guestName} onChange={e => setGuestName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGuestToForm() } }}
                    placeholder="Tên khách" className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-[color:var(--pf-primary)]" />
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
              <button onClick={addGolfers} disabled={saving}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm [background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)] disabled:opacity-60">
                <Plus size={16} /> {saving ? 'Đang thêm...' : 'Thêm golfer'}
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-slate-400">Đang tải danh sách golfer...</p>
            ) : golfers.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-slate-200 p-8 text-center">
                <Users size={28} className="mx-auto text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">Chưa có golfer nào. Thêm golfer phía trên.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {golfers.map(g => (
                  <div key={g.id} className="rounded-[14px] border p-3 [background:var(--pf-surface)] border-[color:var(--pf-border)] flex items-center justify-between gap-2">
                    <span className="[color:var(--pf-text)] truncate text-sm font-medium">
                      {nameOf(g)}{g.guestName && <span className="ml-1.5 text-[10px] rounded bg-amber-100 text-amber-700 px-1.5 py-0.5">Khách</span>}
                    </span>
                    <button onClick={() => removeGolfer(g.id, nameOf(g))} className="text-slate-400 hover:text-red-500" title="Xóa golfer"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ TAB: NHẬP ĐIỂM ══ */}
        {tab === 'scores' && (
          golfers.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-slate-200 p-8 text-center">
              <ClipboardList size={28} className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">Chưa có golfer. Thêm golfer ở tab Golfer trước.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm [color:var(--pf-color-muted)]">Nhập số gậy mỗi golfer theo từng vòng.</p>
                <button onClick={saveScores} disabled={savingScores}
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white [background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)] disabled:opacity-60 transition-colors">
                  <Save size={15} /> {savingScores ? 'Đang lưu...' : 'Lưu điểm'}
                </button>
              </div>
              <div className="rounded-[18px] border overflow-hidden [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide [color:var(--pf-color-muted)] border-b border-[color:var(--pf-border)]">
                        <th className="text-left font-semibold px-3 py-2.5 sticky left-0 bg-[color:var(--pf-surface)]">Golfer</th>
                        {roundList.map(r => <th key={r} className="text-center font-semibold px-2 py-2.5 min-w-[64px]">V{r}</th>)}
                        <th className="text-center font-semibold px-3 py-2.5">Tổng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {golfers.map(g => {
                        const total = g.scores.reduce((s, x) => s + x.strokes, 0)
                        return (
                          <tr key={g.id} className="border-b last:border-0 border-[color:var(--pf-border)]">
                            <td className="px-3 py-2 font-medium [color:var(--pf-text)] sticky left-0 bg-[color:var(--pf-surface)] whitespace-nowrap">{nameOf(g)}</td>
                            {roundList.map(r => (
                              <td key={r} className="px-1.5 py-1.5 text-center">
                                <input inputMode="numeric" value={cellValue(g, r)}
                                  onChange={e => setEdits(s => ({ ...s, [`${g.id}:${r}`]: e.target.value.replace(/\D/g, '') }))}
                                  className="w-12 rounded-lg border border-slate-200 py-1.5 text-center text-sm outline-none focus:border-[color:var(--pf-primary)]" />
                              </td>
                            ))}
                            <td className="px-3 py-2 text-center font-bold [color:var(--pf-primary)]">{total || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
        )}

        {/* ══ TAB: BẢNG XẾP HẠNG ══ */}
        {tab === 'leaderboard' && (
          golfers.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-slate-200 p-8 text-center">
              <BarChart2 size={28} className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">Chưa có golfer để xếp hạng.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-end gap-2">
                <button onClick={() => exportLeaderboard('png')} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"><ImageIcon size={14} /> Xuất ảnh</button>
                <button onClick={() => exportLeaderboard('pdf')} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"><FileDown size={14} /> Xuất PDF</button>
              </div>
            <div id={`golf-lb-${id}`} className="rounded-[18px] border overflow-hidden [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide [color:var(--pf-color-muted)] border-b border-[color:var(--pf-border)]">
                      <th className="text-left font-semibold px-3 py-2.5">#</th>
                      <th className="text-left font-semibold px-3 py-2.5">Golfer</th>
                      <th className="text-center font-semibold px-2 py-2.5" title="Số vòng đã ghi">Vòng</th>
                      <th className="text-center font-semibold px-3 py-2.5" title="Tổng gậy">Tổng gậy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((s, i) => (
                      <tr key={s.id} className={cn('border-b last:border-0 border-[color:var(--pf-border)]', i === 0 && s.played > 0 && 'bg-amber-50/50')}>
                        <td className="px-3 py-2.5 [color:var(--pf-color-muted)]">
                          {i === 0 && s.played > 0 ? <Crown size={16} className="text-amber-500" /> : i + 1}
                        </td>
                        <td className="px-3 py-2.5 font-medium [color:var(--pf-text)]">{s.name}</td>
                        <td className="text-center px-2 py-2.5 [color:var(--pf-color-muted)]">{s.played}/{rounds}</td>
                        <td className="text-center px-3 py-2.5 font-bold [color:var(--pf-primary)]">{s.played > 0 ? s.total : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-3 py-2 text-[11px] [color:var(--pf-color-muted)] border-t border-[color:var(--pf-border)]">
                Stroke-play: <b>tổng gậy nhỏ nhất</b> đứng đầu. Golfer chưa ghi điểm xếp cuối.
              </p>
            </div>
            </>
          )
        )}
      </div>
    </div>
  )
}
