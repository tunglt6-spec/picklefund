/**
 * PairBuilder — trình ghép cặp CHUẨN SaaS dùng CHUNG cho MỌI nội dung ĐÔI (đôi nam/nữ/nam-nữ) ở
 * mọi thể thức (Vòng bảng · Loại trực tiếp · Đôi cố định vòng tròn) và mọi môn vợt.
 *
 * Self-contained: tự lấy thành viên CLB (clubData), tự fetch danh sách cặp (GET /minigames/:id →
 * teams player1/player2), tự gọi API ghép/xóa. Parent chỉ truyền minigameId + cấu hình hiển thị +
 * onChanged (để parent refresh KPI/lịch của nó). 2 cách ghép SONG SONG:
 *  - Tự động: chọn ≥4 người → POST /pairs/auto (ngẫu nhiên / cân bằng trình độ) → tạo toàn bộ cặp.
 *  - Thủ công: chọn đúng 2 người → POST /participants + /teams → tạo từng cặp.
 * Người đã ghép tự ẩn khỏi pool. Vòng bảng: xem trước cặp gom theo bảng (fill-first).
 */
import { useCallback, useEffect, useState } from 'react'
import { Users, Search, UserPlus, X, Plus, Trash2 } from 'lucide-react'
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
}

interface PairBuilderProps {
  minigameId: string
  /** Vòng bảng → xem trước cặp gom theo bảng (fill-first). Loại trực tiếp / đôi cố định → list phẳng. */
  isGroupStage?: boolean
  /** Số cặp tối đa mỗi bảng (chỉ dùng khi isGroupStage). */
  groupSize?: number
  /** Gọi sau khi ghép/xóa để parent làm mới KPI/lịch. */
  onChanged?: () => void
}

export function PairBuilder({ minigameId, isGroupStage = false, groupSize = 4, onChanged }: PairBuilderProps) {
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { getClubData } = useClubDataStore()
  const members = getClubData(clubId).members

  const [pairs, setPairs] = useState<PairTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [pickIds, setPickIds] = useState<string[]>([])
  const [guests, setGuests] = useState<string[]>([])
  const [guestName, setGuestName] = useState('')
  const [search, setSearch] = useState('')
  const [pairingMode, setPairingMode] = useState<'RANDOM_PAIRING' | 'BALANCED_SKILL_PAIRING'>('RANDOM_PAIRING')
  const [saving, setSaving] = useState(false)

  const fetchPairs = useCallback(async () => {
    try {
      const res = await api.get(`/minigames/${minigameId}`)
      const m = res.data?.data ?? res.data
      setPairs((m?.teams ?? []) as PairTeam[])
    } catch { /* giữ danh sách hiện có */ } finally { setLoading(false) }
  }, [minigameId])
  useEffect(() => { void fetchPairs() }, [fetchPairs])

  const refresh = async () => { await fetchPairs(); onChanged?.() }

  const pairedIds = new Set(pairs.flatMap(t => [t.player1?.id, t.player2?.id]).filter((x): x is string => !!x))
  const available = members.filter(m =>
    (!search.trim() || m.fullName.toLowerCase().includes(search.trim().toLowerCase())) && !pairedIds.has(m.id),
  )
  const togglePick = (mid: string) => setPickIds(ids => ids.includes(mid) ? ids.filter(x => x !== mid) : [...ids, mid])
  const addGuest = () => { const n = guestName.trim(); if (!n) return; setGuests(g => [...g, n]); setGuestName('') }
  const pairName = (t: PairTeam) => `${t.player1?.fullName ?? t.player1Name ?? '—'} & ${t.player2?.fullName ?? t.player2Name ?? '—'}`
  const selectedCount = pickIds.length + guests.length

  const autoPair = async () => {
    if (selectedCount < 4) { toast.error('Chọn tối thiểu 4 người (2 cặp)'); return }
    setSaving(true)
    try {
      await api.post(`/minigames/${minigameId}/pairs/auto`, { memberIds: pickIds, guests: guests.map(g => ({ name: g })), pairingMode })
      await refresh(); toast.success('Đã ghép cặp tự động!')
      setPickIds([]); setGuests([]); setSearch('')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Ghép cặp thất bại') }
    finally { setSaving(false) }
  }
  const manualPair = async () => {
    if (pickIds.length !== 2) return
    setSaving(true)
    try {
      await api.post(`/minigames/${minigameId}/participants`, { memberIds: pickIds, guests: guests.map(g => ({ name: g })) })
      await api.post(`/minigames/${minigameId}/teams`, { name: `Đôi ${pairs.length + 1}`, player1Id: pickIds[0], player2Id: pickIds[1] })
      await refresh(); toast.success('Đã tạo cặp')
      setPickIds([]); setGuests([]); setSearch('')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Tạo cặp thất bại') }
    finally { setSaving(false) }
  }
  const deletePair = async (teamId: string) => {
    if (!window.confirm('Xóa cặp này?')) return
    try { await api.delete(`/minigames/${minigameId}/teams/${teamId}`); await refresh(); toast.success('Đã xóa cặp') }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Xóa cặp thất bại') }
  }

  const pairGroupSize = Math.max(2, groupSize)
  const renderPairCard = (t: PairTeam, idx: number) => (
    <div key={t.id} className="rounded-[14px] border p-3.5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)] flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide [color:var(--pf-primary)]">Đôi {idx + 1}</p>
        <p className="mt-0.5 text-sm font-medium [color:var(--pf-text)] truncate">{pairName(t)}</p>
      </div>
      <button onClick={() => deletePair(t.id)} className="shrink-0 [color:var(--pf-color-muted)] hover:[color:var(--pf-color-danger)] transition-colors" title="Xóa cặp"><Trash2 size={16} /></button>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Card ghép cặp */}
      <div className="rounded-[18px] border p-4 sm:p-5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
        <h2 className="flex items-center gap-2 font-semibold [color:var(--pf-text)]"><Users size={18} /> Ghép cặp thi đấu</h2>

        {/* Pool thành viên CLB */}
        <div className="mt-3">
          <div className="flex items-center gap-2 text-xs font-medium [color:var(--pf-color-muted)]">
            <Users size={14} /> Vận động viên là thành viên CLB {selectedCount > 0 && <span className="[color:var(--pf-primary)]">({selectedCount} đã chọn)</span>}
          </div>
          <div className="mt-2 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm thành viên..."
              className="w-full rounded-xl border border-[color:var(--pf-border)] pl-8 pr-3 py-2 text-sm outline-none focus:border-[color:var(--pf-primary)]" />
          </div>
          <div className="mt-2 flex flex-wrap gap-2 max-h-44 overflow-y-auto">
            {available.map(m => (
              <button key={m.id} onClick={() => togglePick(m.id)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                  pickIds.includes(m.id) ? 'text-white [background:var(--pf-primary)] border-transparent' : '[color:var(--pf-color-muted)] [background:var(--pf-surface)] border-[color:var(--pf-border)]'
                }`}>
                {pickIds.includes(m.id) && <X size={12} />} {m.fullName}
              </button>
            ))}
            {available.length === 0 && (
              <p className="text-xs [color:var(--pf-color-muted)] py-1">
                {pairedIds.size > 0 ? 'Tất cả thành viên đã được ghép cặp — thêm khách hoặc xóa cặp để ghép lại.' : 'Không có thành viên phù hợp.'}
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
              placeholder="Tên khách" className="flex-1 rounded-xl border border-[color:var(--pf-border)] px-3.5 py-2 text-sm outline-none focus:border-[color:var(--pf-primary)]" />
            <button onClick={addGuest} className="rounded-xl px-3 py-2 text-sm font-semibold text-white [background:var(--pf-primary)]">Thêm</button>
          </div>
          {guests.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {guests.map((g, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full [background:var(--pf-color-warning-soft)] [color:var(--pf-color-warning)] px-3 py-1 text-xs">
                  {g}<button onClick={() => setGuests(gs => gs.filter((_, j) => j !== i))}><X size={12} /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Cách chia khi ghép TỰ ĐỘNG */}
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

        {/* 2 CÁCH GHÉP SONG SONG */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button onClick={autoPair} disabled={saving || selectedCount < 4}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm [background:var(--pf-primary)] hover:[filter:brightness(0.94)] disabled:opacity-50 disabled:cursor-not-allowed transition">
            <Users size={16} /> {saving ? 'Đang ghép…' : `Ghép cặp tự động${selectedCount >= 4 ? ` · ${Math.floor(selectedCount / 2)} cặp` : ''}`}
          </button>
          <button onClick={manualPair} disabled={saving || pickIds.length !== 2}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border [color:var(--pf-primary)] [background:var(--pf-primary-soft)] border-[color:var(--pf-primary-soft)] hover:[background:var(--pf-primary)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <Plus size={16} /> Tạo cặp thủ công (2 người)
          </button>
        </div>
        <p className="mt-2.5 text-xs leading-relaxed [color:var(--pf-color-muted)]">
          <b className="[color:var(--pf-text)]">Tự động:</b> chọn ≥4 người → hệ thống chia cặp ngẫu nhiên/cân bằng.
          <b className="[color:var(--pf-text)] ml-1">Thủ công:</b> chọn đúng 2 người → tạo từng cặp. Cả 2 chạy song song; người đã ghép tự ẩn khỏi danh sách.
        </p>
      </div>

      {/* Danh sách cặp */}
      {loading ? (
        <p className="text-sm [color:var(--pf-color-muted)]">Đang tải danh sách cặp...</p>
      ) : pairs.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[color:var(--pf-border)] p-8 text-center">
          <Users size={28} className="mx-auto [color:var(--pf-color-muted)]" />
          <p className="mt-2 text-sm [color:var(--pf-color-muted)]">Chưa có cặp nào. Chọn thành viên rồi bấm "Ghép cặp tự động".</p>
        </div>
      ) : isGroupStage ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: Math.ceil(pairs.length / pairGroupSize) }, (_, gi) => {
            const slice = pairs.slice(gi * pairGroupSize, gi * pairGroupSize + pairGroupSize)
            const full = slice.length >= pairGroupSize
            return (
              <div key={gi}>
                <div className="mb-2 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">Bảng {String.fromCharCode(65 + gi)}</span>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {pairs.map((t, i) => renderPairCard(t, i))}
        </div>
      )}
    </div>
  )
}
