/**
 * KnockoutDashboardPage (M3) — Dashboard LOẠI TRỰC TIẾP (single-elimination) cho nhóm vợt/đơn.
 * Người chơi đã đăng ký ở wizard → "Tạo nhánh" (POST /:id/knockout, backend tự tạo đội-đơn) →
 * nhập tỉ số từng trận → "Vòng kế tiếp" (advance). Hiển thị bracket theo vòng + nhà vô địch.
 * Tái dùng store detail (matches/teams) + endpoint generic /knockout. BYE = walkover tự đi tiếp.
 */
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Swords, Crown, ChevronRight, Save } from 'lucide-react'
import api from '../../../lib/api'
import { PageHeader } from '../../../components/layout/PageHeader'
import { Button } from '../../../components/ui/Button'
import { useMinigameStore } from '../../../store/minigameStore'
import { useMinigameDetailSync } from '../../../hooks/useMinigameDetailSync'
import { cn } from '../../../lib/utils'
import toast from 'react-hot-toast'

interface KoMatch {
  id: string
  teamAId?: string | null; teamBId?: string | null
  teamA?: { id: string; name: string } | null
  teamB?: { id: string; name: string } | null
  scoreA?: number | null; scoreB?: number | null
  winnerId?: string | null
  round: number; status: string; groupId?: string | null
}
const DE_BRACKETS = ['WB', 'LB', 'GF']

function roundLabel(countInRound: number): string {
  if (countInRound === 1) return 'Chung kết'
  if (countInRound === 2) return 'Bán kết'
  if (countInRound <= 4) return 'Tứ kết'
  if (countInRound <= 8) return 'Vòng 1/8'
  return `Vòng (${countInRound * 2} người)`
}

export function KnockoutDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const { resync } = useMinigameDetailSync(id)
  const navigate = useNavigate()
  const { getMinigame } = useMinigameStore()
  const mg = getMinigame(id!)
  const detail = mg as unknown as { matches?: KoMatch[]; teams?: { id: string; name: string }[] } | undefined
  const matches = ((detail?.matches ?? []) as KoMatch[]).slice().sort((a, b) => a.round - b.round)
  const teams = (detail?.teams ?? []) as { id: string; name: string }[]
  const nameOf = (tid?: string | null) => (tid ? (teams.find(t => t.id === tid)?.name ?? '—') : 'BYE')

  const [busy, setBusy] = useState(false)
  const [edits, setEdits] = useState<Record<string, { a: string; b: string }>>({})
  const [formatCode, setFormatCode] = useState<string>('')
  // Đọc formatCode để biết là Loại kép (DE) hay Loại đơn khi CHƯA có trận.
  useEffect(() => { if (id) api.get(`/minigames/${id}`).then(r => setFormatCode((r.data?.data ?? r.data)?.settings?.formatCode ?? '')).catch(() => {/* non-critical: formatCode chỉ để hiển thị nhãn */}) }, [id])

  // DE nếu có trận gắn bracket WB/LB/GF, hoặc formatCode = DOUBLE_ELIMINATION (trước khi tạo).
  const de = matches.some(m => DE_BRACKETS.includes(m.groupId ?? '')) || formatCode === 'DOUBLE_ELIMINATION'

  if (!mg) return <div className="flex-1 flex items-center justify-center"><p className="[color:var(--pf-color-muted)]">Không tìm thấy giải</p></div>

  const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b)
  const byRound = (r: number) => matches.filter(m => m.round === r)
  const maxRound = rounds.length ? rounds[rounds.length - 1] : 0
  const finalMatches = byRound(maxRound)
  // Nhà vô địch: DE → thắng trận GF; đơn → thắng trận chung kết (vòng cuối, 1 trận).
  const gfMatch = matches.find(m => m.groupId === 'GF')
  const champion = de
    ? (gfMatch?.status === 'COMPLETED' && gfMatch.winnerId ? nameOf(gfMatch.winnerId) : null)
    : (finalMatches.length === 1 && finalMatches[0].status === 'COMPLETED' && finalMatches[0].winnerId ? nameOf(finalMatches[0].winnerId) : null)
  const currentDecided = maxRound > 0 && finalMatches.every(m => m.status === 'COMPLETED' && m.winnerId)
  const canAdvance = !de && maxRound > 0 && finalMatches.length > 1 && currentDecided // DE tự đẩy nhánh, không cần advance

  const generate = async () => {
    setBusy(true)
    try { await api.post(`/minigames/${id}/${de ? 'double-elimination' : 'knockout'}`); resync(); toast.success(de ? 'Đã tạo nhánh loại kép!' : 'Đã tạo nhánh loại trực tiếp!') }
    catch (err: any) { toast.error(err?.response?.data?.message ?? 'Tạo nhánh thất bại') }
    finally { setBusy(false) }
  }
  const advance = async () => {
    setBusy(true)
    try { await api.post(`/minigames/${id}/knockout/advance`); resync(); toast.success('Đã tạo vòng kế tiếp!') }
    catch (err: any) { toast.error(err?.response?.data?.message ?? 'Tạo vòng kế tiếp thất bại') }
    finally { setBusy(false) }
  }
  const saveScore = async (m: KoMatch) => {
    const e = edits[m.id]; if (!e) return
    const a = parseInt(e.a, 10), b = parseInt(e.b, 10)
    if (!Number.isFinite(a) || !Number.isFinite(b)) { toast.error('Nhập tỉ số hợp lệ'); return }
    if (a === b) { toast.error('Loại trực tiếp không cho hòa — cần có đội thắng'); return }
    setBusy(true)
    try { await api.patch(`/minigames/matches/${m.id}/score`, { scoreA: a, scoreB: b }); resync(); toast.success('Đã lưu tỉ số') }
    catch (err: any) { toast.error(err?.response?.data?.message ?? 'Lưu tỉ số thất bại') }
    finally { setBusy(false) }
  }

  // Cột hiển thị: DE nhóm theo bracket (WB/LB/GF)+vòng; đơn theo vòng.
  const bracketLabel = (g?: string | null) => (g === 'WB' ? 'Nhánh thắng' : g === 'LB' ? 'Nhánh thua' : g === 'GF' ? 'Chung kết' : '')
  const columns: Array<{ key: string; label: string; ms: KoMatch[] }> = de
    ? DE_BRACKETS.flatMap(bk => {
        const bms = matches.filter(m => (m.groupId ?? '') === bk)
        const rs = Array.from(new Set(bms.map(m => m.round))).sort((a, b) => a - b)
        return rs.map(r => ({ key: `${bk}-${r}`, label: `${bracketLabel(bk)}${bk === 'GF' ? '' : ' · V' + r}`, ms: bms.filter(m => m.round === r) }))
      })
    : rounds.map(r => ({ key: String(r), label: roundLabel(byRound(r).length), ms: byRound(r) }))

  const renderCard = (m: KoMatch) => {
    const done = m.status === 'COMPLETED'
    const bye = !m.teamBId
    const e = edits[m.id] ?? { a: done ? String(m.scoreA ?? '') : '', b: done ? String(m.scoreB ?? '') : '' }
    return (
      <div key={m.id} className="rounded-xl border [background:var(--pf-surface)] border-[color:var(--pf-border)] shadow-sm overflow-hidden">
        {[{ tid: m.teamAId, sc: m.scoreA, key: 'a' as const }, { tid: m.teamBId, sc: m.scoreB, key: 'b' as const }].map((side, i) => (
          <div key={i} className={cn('flex items-center justify-between gap-2 px-3 py-2', i === 0 && 'border-b border-[color:var(--pf-border-soft)]', done && m.winnerId === side.tid && '[background:var(--pf-color-success-soft)]')}>
            <span className={cn('text-sm truncate', done && m.winnerId === side.tid ? 'font-bold [color:var(--pf-color-success)]' : '[color:var(--pf-text)]')}>{side.tid ? nameOf(side.tid) : (bye ? 'BYE' : 'Chờ...')}</span>
            {bye ? <span className="text-xs [color:var(--pf-color-muted)]">—</span>
              : done ? <span className="text-sm font-bold [color:var(--pf-text)]">{side.sc}</span>
              : side.tid ? <input inputMode="numeric" value={e[side.key]} onChange={ev => setEdits(s => ({ ...s, [m.id]: { ...e, [side.key]: ev.target.value.replace(/\D/g, '') } }))}
                  className="w-10 text-center border border-[color:var(--pf-border)] rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]" />
              : <span className="text-xs [color:var(--pf-color-muted)]">—</span>}
          </div>
        ))}
        {!done && !bye && m.teamAId && m.teamBId && (
          <button onClick={() => saveScore(m)} disabled={busy}
            className="w-full flex items-center justify-center gap-1 py-1.5 text-xs font-semibold [color:var(--pf-primary)] [background:var(--pf-primary-soft)] hover:[background:var(--pf-primary)] hover:text-white transition-colors">
            <Save size={12} /> Lưu tỉ số
          </button>
        )}
        {bye && <div className="px-3 py-1 text-[11px] italic [color:var(--pf-color-muted)]">BYE — tự vào vòng trong</div>}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto [background:var(--pf-surface-muted)]">
      <PageHeader title={`${de ? 'Loại kép' : ((mg as unknown as { sport?: string }).sport === 'GOLF' ? 'Golf Match Play' : 'Loại trực tiếp')} – ${mg.name}`} subtitle={de ? 'Double-elimination · WB / LB / Chung kết' : ((mg as unknown as { sport?: string }).sport === 'GOLF' ? 'Match Play · loại trực tiếp — nhập số HỐ THẮNG mỗi trận' : 'Single-elimination · nhánh đấu tìm nhà vô địch')}
        actions={
          <div className="flex items-center gap-2">
            {matches.length === 0
              ? <Button size="sm" onClick={generate} disabled={busy}><Swords size={14} /> Tạo nhánh đấu</Button>
              : canAdvance && <Button size="sm" onClick={advance} disabled={busy}><ChevronRight size={14} /> Vòng kế tiếp</Button>}
          </div>
        } />

      <div className="p-4 sm:p-6">
        <button onClick={() => navigate(`/minigames/${id}`)} className="flex items-center gap-1.5 text-sm [color:var(--pf-color-muted)] hover:[color:var(--pf-text)] mb-4 transition-colors"><ArrowLeft size={14} /> {mg.name}</button>

        {champion && (
          <div className="mb-5 rounded-2xl border [border-color:var(--pf-color-warning-soft)] [background:var(--pf-color-warning-soft)] p-5 text-center">
            <Crown size={32} className="mx-auto [color:var(--pf-color-warning)]" />
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide [color:var(--pf-color-warning)]">Nhà vô địch</p>
            <p className="text-xl font-bold [color:var(--pf-text)]">{champion}</p>
          </div>
        )}

        {matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Swords size={44} className="[color:var(--pf-color-muted)] mb-4" />
            <p className="[color:var(--pf-color-muted)] font-medium">Chưa có nhánh đấu</p>
            <p className="[color:var(--pf-color-muted)] text-sm mt-1 mb-4 max-w-sm">
              {de
                ? <>Bấm <b>Tạo nhánh loại kép</b> — cần số đội/người là lũy thừa 2 (4/8/16). Thua ở nhánh thắng sẽ rơi xuống nhánh thua; thắng/thua tự đẩy khi nhập kết quả.</>
                : <>Bấm <b>Tạo nhánh đấu</b> — hệ thống xếp hạt giống từ người chơi đã đăng ký (số lẻ → có suất BYE tự vào vòng trong).</>}
            </p>
            <Button onClick={generate} disabled={busy}><Swords size={16} /> {de ? 'Tạo nhánh loại kép' : 'Tạo nhánh đấu'}</Button>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {columns.map(col => (
              <div key={col.key} className="shrink-0 w-64">
                <div className="text-xs font-bold uppercase tracking-wide [color:var(--pf-color-muted)] mb-2 px-1">{col.label}</div>
                <div className="flex flex-col gap-3">{col.ms.map(renderCard)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
