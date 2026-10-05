/**
 * PairBuilder — trình chọn VĐV / ghép cặp CHUẨN SaaS dùng CHUNG cho MỌI nội dung ở mọi thể thức
 * (Vòng bảng · Loại trực tiếp · Đôi cố định vòng tròn) và mọi môn.
 *
 * 2 chế độ (mode):
 *  - 'pair'  (ĐÔI): chọn người (thành viên + khách mới + khách đã lưu chưa ghép) → Ghép cặp tự động
 *    (BỔ SUNG, không phá cặp cũ) hoặc thủ công (ĐÚNG 2 người bất kỳ) → danh sách cặp (Vòng bảng: xem trước theo bảng).
 *  - 'single'(ĐƠN): chọn người → Thêm vận động viên (participants) → danh sách VĐV.
 *
 * Self-contained: tự lấy thành viên CLB (clubData), tự fetch dữ liệu giải (GET /minigames/:id),
 * tự gọi API. Parent chỉ truyền minigameId + cấu hình + onChanged (refresh KPI/lịch của parent).
 */
import { useCallback, useEffect, useState } from 'react'
import { Users, Search, UserPlus, X, Plus, Trash2, UserCheck } from 'lucide-react'
import { buildAutoPayload, buildManualPayload, collectPicks, describeAutoResult, nextPairName, resolveGuestName, takenPlayerKeys, unpairedSavedGuests } from './pairBuilder.logic'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import { useClubDataStore } from '../../store/clubDataStore'

interface PairTeam {
  id: string
  name: string
  player1?: { id: string; fullName: string } | null
  player2?: { id: string; fullName: string } | null
  player1Name?: string | null
  player2Name?: string | null
  player1GuestId?: string | null
  player2GuestId?: string | null
  player1Id?: string | null
  player2Id?: string | null
}
interface Entrant { key: string; name: string; isGuest: boolean }

interface PairBuilderProps {
  minigameId: string
  /** 'pair' (đôi, mặc định) | 'single' (đơn/cá nhân). */
  mode?: 'pair' | 'single'
  /** Vòng bảng → xem trước cặp gom theo bảng (fill-first). Chỉ dùng khi mode='pair'. */
  isGroupStage?: boolean
  groupSize?: number
  /** Gọi sau khi thay đổi để parent làm mới KPI/lịch. */
  onChanged?: () => void
}

export function PairBuilder({ minigameId, mode = 'pair', isGroupStage = false, groupSize = 4, onChanged }: PairBuilderProps) {
  const isSingle = mode === 'single'
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { getClubData } = useClubDataStore()
  const members = getClubData(clubId).members

  const [pairs, setPairs] = useState<PairTeam[]>([])
  const [entrants, setEntrants] = useState<Entrant[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [pickIds, setPickIds] = useState<string[]>([])
  const [guests, setGuests] = useState<string[]>([])
  const [savedPickIds, setSavedPickIds] = useState<string[]>([])
  const [guestName, setGuestName] = useState('')
  const [search, setSearch] = useState('')
  const [pairingMode, setPairingMode] = useState<'RANDOM_PAIRING' | 'BALANCED_SKILL_PAIRING'>('RANDOM_PAIRING')
  const [saving, setSaving] = useState(false)

  /** Trả về danh sách khách MỚI NHẤT từ server (null nếu tải lỗi) — dùng cho luồng "authoritative guests". */
  const fetchData = useCallback(async (): Promise<{ id: string; name: string; phone?: string | null }[] | null> => {
    try {
      const res = await api.get(`/minigames/${minigameId}`)
      const m = res.data?.data ?? res.data
      setPairs((m?.teams ?? []) as PairTeam[])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: Entrant[] = (m?.participants ?? []).map((p: any) => ({ key: p.memberId ?? p.member?.id, name: p.member?.fullName ?? p.memberName ?? 'Thành viên', isGuest: false }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gsts: Entrant[] = (m?.settings?.guests ?? []).map((g: any) => ({ key: g.id, name: g.name ?? 'Khách', isGuest: true }))
      setEntrants([...parts, ...gsts])
      setLoadError(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (m?.settings?.guests ?? []).map((g: any) => ({ id: g.id, name: g.name ?? 'Khách', phone: g.phone ?? null }))
    } catch { setLoadError(true); return null } finally { setLoading(false) }
  }, [minigameId])
  useEffect(() => { void fetchData() }, [fetchData])

  const refresh = async () => { await fetchData(); onChanged?.() }
  const retryLoad = () => { setLoading(true); void fetchData() }

  // Người đã tham gia (đã ghép cặp / đã là VĐV) → LOẠI khỏi pool chọn.
  const usedIds = isSingle
    ? new Set(entrants.filter(e => !e.isGuest).map(e => e.key))
    : takenPlayerKeys(pairs)
  const available = members.filter(m =>
    (!search.trim() || m.fullName.toLowerCase().includes(search.trim().toLowerCase())) && !usedIds.has(m.id),
  )
  // Khách ĐÃ LƯU chưa thuộc cặp nào (chỉ ở chế độ đôi) → chọn lại được.
  const savedGuests = entrants.filter(e => e.isGuest).map(e => ({ id: e.key, name: e.name }))
  const pendingSaved = isSingle ? [] : unpairedSavedGuests(savedGuests, pairs)
  const togglePick = (mid: string) => setPickIds(ids => ids.includes(mid) ? ids.filter(x => x !== mid) : [...ids, mid])
  const toggleSaved = (gid: string) => setSavedPickIds(ids => ids.includes(gid) ? ids.filter(x => x !== gid) : [...ids, gid])
  const addGuest = () => {
    const r = resolveGuestName(guestName, savedGuests, isSingle ? [] : pairs)
    if (r.action === 'empty') return
    if (r.action === 'taken') {
      toast.error(`Khách '${r.name}' đã thuộc một cặp. Hãy đặt tên khác (ví dụ thêm số/hậu tố)`)
      return
    }
    if (r.action === 'select-saved' && isSingle) {
      toast(`Khách ${r.name} đã có trong giải`, { icon: 'ℹ️' })
      setGuestName('')
      return
    }
    if (r.action === 'select-saved') {
      setSavedPickIds(ids => ids.includes(r.id) ? ids : [...ids, r.id])
      toast(`Đã chọn khách ${r.name} có sẵn`, { icon: 'ℹ️' })
      setGuestName('')
      return
    }
    setGuests(g => g.some(x => x.toLowerCase() === r.name.toLowerCase()) ? g : [...g, r.name])
    setGuestName('')
  }
  const clearSel = () => { setPickIds([]); setGuests([]); setSavedPickIds([]); setSearch('') }
  const guestTag = <span className="text-xs font-medium px-1.5 py-0.5 rounded-full [background:var(--pf-color-warning-soft)] [color:var(--pf-color-warning)]">Khách</span>
  const slotName = (p: { fullName: string } | null | undefined, name: string | null | undefined, guestId: string | null | undefined) =>
    <span className="inline-flex items-center gap-1">{p?.fullName ?? name ?? '—'}{guestId && guestTag}</span>
  const picks = collectPicks(members, pickIds, savedGuests, savedPickIds.filter(id => pendingSaved.some(g => g.id === id)), guests)
  const selectedCount = picks.length

  // ── ĐÔI ──
  const autoPair = async () => {
    if (saving) return
    if (selectedCount < 2) { toast.error('Chọn tối thiểu 2 người để ghép'); return }
    setSaving(true)
    try {
      const res = await api.post(`/minigames/${minigameId}/pairs/auto`, buildAutoPayload(picks, pairingMode))
      const body = res.data?.data ?? res.data
      await refresh(); toast.success(describeAutoResult(body)); clearSel()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Ghép cặp thất bại') }
    finally { setSaving(false) }
  }
  const manualPair = async () => {
    if (saving) return
    const payload = buildManualPayload(nextPairName(pairs.map(t => t.name)), picks)
    if (!payload) { toast.error('Chọn đúng 2 người để tạo cặp thủ công'); return }
    setSaving(true)
    try {
      await api.post(`/minigames/${minigameId}/teams`, payload)
      await refresh(); toast.success('Đã tạo cặp'); clearSel()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Tạo cặp thất bại') }
    finally { setSaving(false) }
  }
  const deletePair = async (teamId: string) => {
    if (saving) return
    if (!window.confirm('Xóa cặp này?')) return
    setSaving(true)
    try { await api.delete(`/minigames/${minigameId}/teams/${teamId}`); await refresh(); toast.success('Đã xóa cặp') }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Xóa cặp thất bại') }
    finally { setSaving(false) }
  }
  const deleteAllPairs = async () => {
    if (pairs.length === 0 || saving) return
    if (!window.confirm(`Xóa hết ${pairs.length} cặp để ghép lại từ đầu? (Không xóa thành viên/khách)`)) return
    setSaving(true)
    try {
      await api.delete(`/minigames/${minigameId}/teams`)
      await refresh(); toast.success('Đã xóa hết cặp')
    } catch (e: any) { await refresh(); toast.error(e?.response?.data?.message ?? 'Xóa cặp thất bại') }
    finally { setSaving(false) }
  }

  // ── ĐƠN ──
  const addEntrants = async () => {
    if (saving) return
    if (selectedCount === 0) { toast.error('Chọn ít nhất 1 vận động viên'); return }
    setSaving(true)
    try {
      // Backend thay thế toàn bộ settings.guests khi có field guests → LUÔN lấy danh sách khách mới nhất
      // từ server ngay trước khi gửi (tránh ghi đè mất khách do thiết bị/tab khác vừa thêm).
      const fresh = await fetchData()
      if (fresh === null) { toast.error('Không tải được danh sách khách mới nhất — thử lại'); return }
      await api.post(`/minigames/${minigameId}/participants`, {
        memberIds: pickIds,
        guests: [...fresh, ...guests.map(name => ({ name }))],
      })
      await refresh(); toast.success('Đã thêm vận động viên'); clearSel()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Thêm vận động viên thất bại') }
    finally { setSaving(false) }
  }
  const deleteEntrant = async (key: string) => {
    if (saving) return
    if (!window.confirm('Xóa vận động viên này khỏi giải?')) return
    setSaving(true)
    try { await api.delete(`/minigames/${minigameId}/participants/${key}`); await refresh(); toast.success('Đã xóa vận động viên') }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Xóa thất bại') }
    finally { setSaving(false) }
  }

  const pairGroupSize = Math.max(2, groupSize)
  const renderPairCard = (t: PairTeam, idx: number) => (
    <div key={t.id} className="rounded-[14px] border p-3.5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)] flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide [color:var(--pf-primary-text)]">{t.name || `Đôi ${idx + 1}`}</p>
        <p className="mt-0.5 text-sm font-medium [color:var(--pf-text)] flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          {slotName(t.player1, t.player1Name, t.player1GuestId)}<span className="[color:var(--pf-color-muted)]">&amp;</span>{slotName(t.player2, t.player2Name, t.player2GuestId)}
        </p>
      </div>
      <button onClick={() => deletePair(t.id)} disabled={saving} aria-label={`Xóa cặp ${t.name || idx + 1}`} className="shrink-0 disabled:opacity-50 [color:var(--pf-color-muted)] hover:[color:var(--pf-color-danger)] transition-colors" title="Xóa cặp"><Trash2 size={16} /></button>
    </div>
  )

  // Còn người CHƯA GHÉP (thành viên đã vào giải + khách đã lưu) → cảnh báo trước khi tạo lịch.
  const unpairedNames = isSingle ? [] : [
    ...entrants.filter(e => !e.isGuest && !usedIds.has(e.key)).map(e => e.name),
    ...pendingSaved.map(g => g.name),
  ]
  const unpairedBanner = unpairedNames.length > 0 && pairs.length > 0 && (
    <div role="status" className="rounded-xl border px-3 py-2 text-xs font-medium [background:var(--pf-color-warning-soft)] [color:var(--pf-color-warning)] border-[color:var(--pf-color-warning)]">
      Còn {unpairedNames.length} người chưa ghép cặp: {unpairedNames.join(', ')}. Người chưa ghép sẽ không có trong lịch thi đấu.
    </div>
  )

  const deleteAllBar = (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <span className="text-xs font-bold uppercase tracking-wide [color:var(--pf-color-muted)]">{pairs.length} cặp</span>
      <button onClick={deleteAllPairs} disabled={saving}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border [color:var(--pf-color-danger)] border-[color:var(--pf-color-danger)] [background:var(--pf-surface)] hover:opacity-80 disabled:opacity-50 transition">
        <Trash2 size={14} /> Xóa hết cặp
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Card chọn/ghép */}
      <div className="pf-glass rounded-[16px] p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-semibold [color:var(--pf-text)]">
          {isSingle ? <UserCheck size={18} /> : <Users size={18} />} {isSingle ? 'Vận động viên thi đấu' : 'Ghép cặp thi đấu'}
        </h2>

        {/* Pool thành viên CLB */}
        <div className="mt-3">
          <div className="flex items-center gap-2 text-xs font-medium [color:var(--pf-color-muted)]">
            <Users size={14} /> Vận động viên là thành viên CLB {selectedCount > 0 && <span className="[color:var(--pf-primary-text)]">({selectedCount} đã chọn)</span>}
          </div>
          <div className="mt-2 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm thành viên..."
              className="w-full rounded-xl border border-[color:var(--pf-border)] pl-8 pr-3 py-2 text-sm outline-none focus:border-[color:var(--pf-primary-text)]" />
          </div>
          <div className="mt-2 flex flex-wrap gap-2 max-h-44 overflow-y-auto">
            {available.map(m => (
              <button key={m.id} onClick={() => togglePick(m.id)} aria-pressed={pickIds.includes(m.id)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                  pickIds.includes(m.id) ? 'text-white [background:var(--pf-primary)] border-transparent' : '[color:var(--pf-color-muted)] [background:var(--pf-surface)] border-[color:var(--pf-border)]'
                }`}>
                {pickIds.includes(m.id) && <X size={12} />} {m.fullName}
              </button>
            ))}
            {available.length === 0 && (
              <p className="text-xs [color:var(--pf-color-muted)] py-1">
                {usedIds.size > 0 ? 'Tất cả thành viên đã tham gia — thêm khách hoặc xóa bớt để chọn lại.' : 'Không có thành viên phù hợp.'}
              </p>
            )}
          </div>
        </div>

        {/* Khách mời */}
        <div className="mt-3">
          <div className="flex items-center gap-2 text-xs font-medium [color:var(--pf-color-muted)]"><UserPlus size={14} /> Khách mời (ngoài CLB)</div>
          <div className="mt-2 flex gap-2">
            <input value={guestName} onChange={e => setGuestName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGuest() } }}
              placeholder="Tên khách" className="flex-1 rounded-xl border border-[color:var(--pf-border)] px-3.5 py-2 text-sm outline-none focus:border-[color:var(--pf-primary-text)]" />
            <button onClick={addGuest} className="rounded-xl px-3 py-2 text-sm font-semibold text-white [background:var(--pf-primary)]">Thêm</button>
          </div>
          {guests.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {guests.map((g, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full [background:var(--pf-color-warning-soft)] [color:var(--pf-color-warning)] px-3 py-1 text-xs">
                  {g}<button onClick={() => setGuests(gs => gs.filter((_, j) => j !== i))} title="Bỏ khách" aria-label={`Bỏ khách ${g}`}><X size={12} /></button>
                </span>
              ))}
            </div>
          )}
          {pendingSaved.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-medium [color:var(--pf-color-muted)]">Khách đã thêm (chưa ghép cặp) — bấm để chọn</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {pendingSaved.map(g => {
                  const on = savedPickIds.includes(g.id)
                  return (
                    <button key={g.id} onClick={() => toggleSaved(g.id)} aria-pressed={on}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                        on ? 'text-white [background:var(--pf-primary)] border-transparent' : '[color:var(--pf-color-muted)] [background:var(--pf-surface)] border-[color:var(--pf-border)]'
                      }`}>
                      {on && <X size={12} />} {g.name}
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', on ? 'bg-white/25 text-white' : '[background:var(--pf-color-warning-soft)] [color:var(--pf-color-warning)]')}>Khách</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Tóm tắt lựa chọn thống nhất (thành viên + khách) */}
        {selectedCount > 0 && (
          <div className="mt-3 rounded-[14px] border border-[color:var(--pf-border)] [background:var(--pf-primary-soft)] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold [color:var(--pf-primary-text)]">Đã chọn ({selectedCount}): {picks.map(x => x.name).join(' + ')}</span>
              <button onClick={clearSel} className="shrink-0 text-xs font-semibold [color:var(--pf-color-muted)] hover:[color:var(--pf-color-danger)] transition-colors">Bỏ chọn tất cả</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {picks.map((x, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full [background:var(--pf-surface)] border border-[color:var(--pf-border)] px-2.5 py-1 text-xs font-medium [color:var(--pf-text)]">
                  {x.name}{x.kind !== 'member' && guestTag}
                </span>
              ))}
            </div>
          </div>
        )}

        {isSingle ? (
          /* ── ĐƠN: thêm VĐV ── */
          <>
            <div className="mt-4">
              <button onClick={addEntrants} disabled={saving || selectedCount === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm [background:var(--pf-primary)] hover:[filter:brightness(0.94)] disabled:opacity-50 disabled:cursor-not-allowed transition">
                <Plus size={16} /> {saving ? 'Đang thêm…' : `Thêm vận động viên${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
              </button>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed [color:var(--pf-color-muted)]">Chọn thành viên/khách rồi bấm Thêm để đưa vào giải. Người đã tham gia tự ẩn khỏi danh sách. Sau khi đủ VĐV, chia bảng/tạo nhánh ở các bước tiếp theo.</p>
          </>
        ) : (
          /* ── ĐÔI: chế độ + 2 nút song song ── */
          <>
            <div className="mt-4">
              <div className="text-xs font-medium [color:var(--pf-color-muted)] mb-2">Cách chia (khi ghép tự động)</div>
              <div className="inline-flex rounded-xl border border-[color:var(--pf-border)] p-1 gap-1">
                {([['RANDOM_PAIRING', 'Ngẫu nhiên'], ['BALANCED_SKILL_PAIRING', 'Cân bằng trình độ']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setPairingMode(val)}
                    className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors', pairingMode === val ? 'text-white [background:var(--pf-primary)]' : '[color:var(--pf-color-muted)] hover:[color:var(--pf-text)]')}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button onClick={autoPair} disabled={saving || selectedCount < 2}
                title={selectedCount < 2 ? 'Chọn ít nhất 2 người' : undefined}
                className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-sm [background:var(--pf-primary)] hover:[filter:brightness(0.94)] disabled:opacity-50 disabled:cursor-not-allowed transition">
                <Users size={16} /> {saving ? 'Đang ghép…' : `Ghép cặp tự động${selectedCount >= 2 ? ` · ${Math.floor(selectedCount / 2)} cặp` : ''}`}
              </button>
              <button onClick={manualPair} disabled={saving || selectedCount !== 2}
                title={selectedCount !== 2 ? 'Chọn đúng 2 người' : undefined}
                className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold border [color:var(--pf-primary-text)] [background:var(--pf-primary-soft)] border-[color:var(--pf-primary-soft)] hover:[background:var(--pf-primary)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <Plus size={16} /> Tạo cặp thủ công · {selectedCount} người
              </button>
            </div>
            {selectedCount !== 2 && selectedCount > 0 && (
              <p className="mt-1.5 text-xs [color:var(--pf-color-muted)]">Tạo cặp thủ công cần chọn đúng 2 người{selectedCount === 1 ? ' (chọn thêm 1)' : ` (đang chọn ${selectedCount})`}.</p>
            )}
            {selectedCount >= 3 && selectedCount % 2 === 1 && (
              <p className="mt-1 text-xs [color:var(--pf-color-muted)]">Số người lẻ — ghép tự động sẽ để lại 1 người chưa ghép.</p>
            )}
            <p className="mt-2.5 text-xs leading-relaxed [color:var(--pf-color-muted)]">
              <b className="[color:var(--pf-text)]">Thủ công:</b> chọn đúng 2 người bất kỳ (thành viên, khách hoặc cả hai) → tạo 1 cặp.
              <b className="[color:var(--pf-text)] ml-1">Tự động:</b> chọn nhiều người (từ 2) → chia cặp ngẫu nhiên/cân bằng; ghép bổ sung, KHÔNG ảnh hưởng cặp đã có. Người đã ghép tự ẩn khỏi danh sách; muốn làm lại hãy xóa cặp (hoặc "Xóa hết cặp").
            </p>
          </>
        )}
      </div>

      {/* Danh sách */}
      {loading ? (
        <p className="text-sm [color:var(--pf-color-muted)]">Đang tải danh sách...</p>
      ) : loadError ? (
        <div role="alert" className="rounded-[18px] border border-[color:var(--pf-color-danger)] p-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm [color:var(--pf-color-danger)]">Không tải được danh sách. Kiểm tra kết nối rồi thử lại.</p>
          <button onClick={retryLoad} className="rounded-full px-4 py-2 text-sm font-semibold text-white [background:var(--pf-primary)]">Thử lại</button>
        </div>
      ) : isSingle ? (
        entrants.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-[color:var(--pf-border)] p-8 text-center">
            <UserCheck size={28} className="mx-auto [color:var(--pf-color-muted)]" />
            <p className="mt-2 text-sm [color:var(--pf-color-muted)]">Chưa có vận động viên. Chọn thành viên rồi bấm "Thêm vận động viên".</p>
          </div>
        ) : (
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide [color:var(--pf-color-muted)]">{entrants.length} vận động viên</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {entrants.map(e => (
                <div key={e.key} className="rounded-[12px] border p-2.5 [background:var(--pf-surface)] border-[color:var(--pf-border)] flex items-center justify-between gap-2">
                  <span className="text-sm font-medium [color:var(--pf-text)] truncate flex items-center gap-1.5">
                    {e.name}{e.isGuest && <span className="text-xs font-medium px-1.5 py-0.5 rounded-full [background:var(--pf-color-warning-soft)] [color:var(--pf-color-warning)]">Khách</span>}
                  </span>
                  <button onClick={() => deleteEntrant(e.key)} disabled={saving} aria-label={`Xóa vận động viên ${e.name}`} className="shrink-0 disabled:opacity-50 [color:var(--pf-color-muted)] hover:[color:var(--pf-color-danger)] transition-colors" title="Xóa VĐV"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </div>
        )
      ) : pairs.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[color:var(--pf-border)] p-8 text-center">
          <Users size={28} className="mx-auto [color:var(--pf-color-muted)]" />
          <p className="mt-2 text-sm [color:var(--pf-color-muted)]">Chưa có cặp nào. Chọn thành viên/khách rồi bấm "Ghép cặp tự động" hoặc "Tạo cặp thủ công".</p>
        </div>
      ) : isGroupStage ? (
        <div className="flex flex-col gap-4">
          {deleteAllBar}
          {unpairedBanner}
          {Array.from({ length: Math.ceil(pairs.length / pairGroupSize) }, (_, gi) => {
            const slice = pairs.slice(gi * pairGroupSize, gi * pairGroupSize + pairGroupSize)
            const full = slice.length >= pairGroupSize
            return (
              <div key={gi}>
                <div className="mb-2 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold [background:var(--pf-primary-soft)] [color:var(--pf-primary-text)]">Bảng {String.fromCharCode(65 + gi)}</span>
                  <span className={cn('text-xs font-semibold', full ? '[color:var(--pf-color-success)]' : '[color:var(--pf-color-muted)]')}>
                    {full ? `đủ ${pairGroupSize}/${pairGroupSize} cặp` : `${slice.length}/${pairGroupSize} cặp`}
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {slice.map((t, i) => renderPairCard(t, gi * pairGroupSize + i))}
                </div>
              </div>
            )
          })}
          <p className="text-xs [color:var(--pf-color-muted)]">Xem trước theo bảng ({pairGroupSize} cặp/bảng). Chia bảng chính thức áp dụng đúng thứ tự này khi tạo lịch.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {deleteAllBar}
          {unpairedBanner}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {pairs.map((t, i) => renderPairCard(t, i))}
          </div>
        </div>
      )}
    </div>
  )
}
