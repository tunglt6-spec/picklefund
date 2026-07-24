/**
 * FootballDashboardPage (Pha 1b) — Dashboard bộ môn BÓNG ĐÁ.
 * Khác pickleball: đội có NHIỀU cầu thủ (roster) gồm thành viên CLB + khách tự do.
 * Màn này quản lý ĐỘI & CẦU THỦ (tạo đội, thêm/bớt cầu thủ, xóa đội) dùng endpoint
 * roster Pha 1a. Lịch thi đấu + BXH bóng đá sẽ bổ sung ở Pha 1c.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Calendar, Users, Trophy, UserPlus, X, Plus, Trash2, Shield, Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { StatusBadge } from '../../../components/minigame/v2/StatusBadge'
import { useMinigameStore } from '../../../store/minigameStore'
import { useClubDataStore } from '../../../store/clubDataStore'
import { useAuthStore } from '../../../store/authStore'
import api from '../../../lib/api'

interface RosterMember { id: string; memberId?: string | null; guestName?: string | null; role?: string | null }
interface RosterTeam { id: string; name: string; members: RosterMember[] }

export function FootballDashboardPage({ resync }: { resync?: () => void }) {
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

  const [teams, setTeams] = useState<RosterTeam[]>([])
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

  const fetchDetail = useCallback(async () => {
    if (!id) return
    try {
      const res = await api.get(`/minigames/${id}`)
      const m = res.data?.data ?? res.data
      setTeams((m?.teams ?? []) as RosterTeam[])
    } catch {
      toast.error('Không tải được danh sách đội')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void fetchDetail() }, [fetchDetail])

  const nameOf = (rm: RosterMember) =>
    rm.guestName?.trim() || (rm.memberId ? memberName[rm.memberId] ?? 'Thành viên' : 'Thành viên')

  const totalPlayers = teams.reduce((s, t) => s + (t.members?.length ?? 0), 0)

  // ── Tạo đội mới ──
  const togglePick = (mid: string) =>
    setPickIds(ids => ids.includes(mid) ? ids.filter(x => x !== mid) : [...ids, mid])

  const addGuestToForm = () => {
    const n = guestName.trim()
    if (!n) return
    setGuests(g => [...g, n]); setGuestName('')
  }

  const createTeam = async () => {
    const name = newTeamName.trim()
    if (!name) { toast.error('Nhập tên đội'); return }
    setSaving(true)
    try {
      await api.post(`/minigames/${id}/roster-teams`, {
        name,
        memberIds: pickIds,
        guests: guests.map(g => ({ name: g })),
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
      await api.post(`/minigames/roster-teams/${teamId}/members`, {
        memberIds: addPickIds,
        guests: guestList,
      })
      toast.success('Đã thêm cầu thủ')
      setAddingTo(null); setAddPickIds([]); setAddGuest('')
      await fetchDetail()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Thêm cầu thủ thất bại')
    }
  }

  const removeMember = async (rosterMemberId: string) => {
    try {
      await api.delete(`/minigames/roster-members/${rosterMemberId}`)
      await fetchDetail()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Xóa cầu thủ thất bại')
    }
  }

  const deleteTeam = async (teamId: string, name: string) => {
    if (!window.confirm(`Xóa đội "${name}" và toàn bộ cầu thủ trong đội?`)) return
    try {
      await api.delete(`/minigames/${id}/teams/${teamId}`)
      toast.success('Đã xóa đội')
      await fetchDetail()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Xóa đội thất bại')
    }
  }

  // ── Kết thúc giải đấu ──
  const canFinish = mg && mg.status !== 'COMPLETED' && mg.status !== 'CANCELLED'
  const handleEnd = async () => {
    if (!id) return
    if (!window.confirm('Kết thúc giải đấu? Trạng thái chuyển "Hoàn Thành" và lưu vào lịch sử CLB.')) return
    try {
      await api.post(`/minigames/${id}/end`)
      resync?.()
      toast.success('Đã kết thúc giải đấu — đã lưu vào lịch sử CLB!')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi kết thúc giải đấu')
    }
  }

  if (!mg) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">Không tìm thấy giải đấu</p>
      </div>
    )
  }

  const filteredMembers = members.filter(m =>
    !search.trim() || m.fullName.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div className="flex-1 overflow-y-auto [background:var(--pf-bg)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 sm:px-6 py-4">
        <button
          onClick={() => navigate('/minigames')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors w-fit"
        >
          <ArrowLeft size={14} /> Danh Sách Minigame
        </button>

        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{mg.name}</h1>
              <StatusBadge status={mg.status as 'IN_PROGRESS' | 'COMPLETED' | 'DRAFT' | 'GROUPED' | 'SCHEDULED' | 'CANCELLED'} />
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700">
                ⚽ Bóng Đá
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {mg.startDate}{mg.endDate ? ` — ${mg.endDate}` : ''}
              </span>
            </div>
          </div>

          {canFinish && (
            <button
              onClick={handleEnd}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors md:w-auto"
              style={{ background: '#16A34A' }}
            >
              <Trophy size={16} /> Kết thúc giải đấu
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-[1280px] mx-auto flex flex-col gap-5">
        {/* KPI */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:max-w-md">
          <div className="rounded-[18px] border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
            <div className="flex items-center gap-2 text-xs [color:var(--pf-color-muted)]"><Shield size={16} /> Số đội</div>
            <p className="mt-1 text-2xl font-bold [color:var(--pf-text)]">{teams.length}</p>
          </div>
          <div className="rounded-[18px] border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
            <div className="flex items-center gap-2 text-xs [color:var(--pf-color-muted)]"><Users size={16} /> Tổng cầu thủ</div>
            <p className="mt-1 text-2xl font-bold [color:var(--pf-text)]">{totalPlayers}</p>
          </div>
        </div>

        {/* Tạo đội mới */}
        <div className="rounded-[18px] border p-4 sm:p-5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
          <h2 className="flex items-center gap-2 font-semibold [color:var(--pf-text)]"><Plus size={18} /> Tạo đội mới</h2>
          <input
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
            placeholder="Tên đội (vd: FC Sấm Sét)"
            className="mt-3 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--pf-primary)]"
          />

          {/* chọn thành viên CLB */}
          <div className="mt-3">
            <div className="flex items-center gap-2 text-xs font-medium [color:var(--pf-color-muted)]">
              <Users size={14} /> Cầu thủ là thành viên CLB {pickIds.length > 0 && <span className="[color:var(--pf-primary)]">({pickIds.length} đã chọn)</span>}
            </div>
            <div className="mt-2 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm thành viên..."
                className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-sm outline-none focus:border-[color:var(--pf-primary)]"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2 max-h-44 overflow-y-auto">
              {filteredMembers.map(m => (
                <button
                  key={m.id}
                  onClick={() => togglePick(m.id)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                    pickIds.includes(m.id)
                      ? 'text-white [background:var(--pf-primary)] border-transparent'
                      : 'text-slate-600 bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {pickIds.includes(m.id) && <X size={12} />} {m.fullName}
                </button>
              ))}
              {filteredMembers.length === 0 && <p className="text-xs text-slate-400 py-1">Không có thành viên phù hợp</p>}
            </div>
          </div>

          {/* khách tự do */}
          <div className="mt-3">
            <div className="flex items-center gap-2 text-xs font-medium [color:var(--pf-color-muted)]"><UserPlus size={14} /> Khách mời (ngoài CLB)</div>
            <div className="mt-2 flex gap-2">
              <input
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGuestToForm() } }}
                placeholder="Tên khách"
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-[color:var(--pf-primary)]"
              />
              <button onClick={addGuestToForm} className="rounded-xl px-3 py-2 text-sm font-semibold text-white [background:var(--pf-primary)]">Thêm</button>
            </div>
            {guests.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {guests.map((g, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-3 py-1 text-xs">
                    {g}
                    <button onClick={() => setGuests(gs => gs.filter((_, j) => j !== i))}><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={createTeam}
            disabled={saving}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm [background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)] disabled:opacity-60"
          >
            <Plus size={16} /> {saving ? 'Đang tạo...' : 'Tạo đội'}
          </button>
        </div>

        {/* Danh sách đội */}
        {loading ? (
          <p className="text-sm text-slate-400">Đang tải danh sách đội...</p>
        ) : teams.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 p-8 text-center">
            <Shield size={28} className="mx-auto text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">Chưa có đội nào. Tạo đội đầu tiên phía trên.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {teams.map(team => (
              <div key={team.id} className="rounded-[18px] border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold [color:var(--pf-text)] truncate flex items-center gap-1.5"><Shield size={16} className="text-emerald-600" /> {team.name}</p>
                    <p className="mt-0.5 text-xs [color:var(--pf-color-muted)]">{team.members?.length ?? 0} cầu thủ</p>
                  </div>
                  <button onClick={() => deleteTeam(team.id, team.name)} className="text-slate-400 hover:text-red-500 transition-colors" title="Xóa đội">
                    <Trash2 size={16} />
                  </button>
                </div>

                <ul className="mt-3 flex flex-col gap-1.5">
                  {(team.members ?? []).map(rm => (
                    <li key={rm.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                      <span className="[color:var(--pf-text)] truncate">
                        {nameOf(rm)}
                        {rm.guestName && <span className="ml-1.5 text-[10px] rounded bg-amber-100 text-amber-700 px-1.5 py-0.5">Khách</span>}
                      </span>
                      <button onClick={() => removeMember(rm.id)} className="text-slate-400 hover:text-red-500" title="Bỏ khỏi đội"><X size={14} /></button>
                    </li>
                  ))}
                  {(team.members?.length ?? 0) === 0 && <li className="text-xs text-slate-400 px-1">Chưa có cầu thủ</li>}
                </ul>

                {addingTo === team.id ? (
                  <div className="mt-3 rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {members.map(m => (
                        <button
                          key={m.id}
                          onClick={() => setAddPickIds(ids => ids.includes(m.id) ? ids.filter(x => x !== m.id) : [...ids, m.id])}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border transition-colors ${
                            addPickIds.includes(m.id) ? 'text-white [background:var(--pf-primary)] border-transparent' : 'text-slate-600 bg-white border-slate-200'
                          }`}
                        >
                          {m.fullName}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        ref={addGuestRef}
                        value={addGuest}
                        onChange={e => setAddGuest(e.target.value)}
                        placeholder="hoặc tên khách"
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-[color:var(--pf-primary)]"
                      />
                      <button onClick={() => submitAdd(team.id)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white [background:var(--pf-primary)]">Lưu</button>
                      <button onClick={() => setAddingTo(null)} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 bg-slate-100">Hủy</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => openAdd(team.id)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold [color:var(--pf-primary)] hover:underline"
                  >
                    <UserPlus size={14} /> Thêm cầu thủ
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Ghi chú Pha 1c */}
        <div className="rounded-[14px] border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-800">
          Lịch thi đấu &amp; Bảng xếp hạng bóng đá (nhập tỉ số, tính Thắng-Hòa-Thua & hiệu số) sẽ được bổ sung ở bước tiếp theo.
        </div>
      </div>
    </div>
  )
}
