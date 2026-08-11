/**
 * RunningDashboardPage (M5) — Dashboard CHẠY BỘ (time leaderboard). Tái dùng hạ tầng leaderboard
 * cá nhân của Golf (endpoint golfers/score) nhưng nhãn theo chạy bộ: "vận động viên", thời gian
 * (mm:ss) mỗi lần chạy/cự ly, tổng thời gian NHỎ NHẤT đứng đầu. Điểm lưu = tổng giây (dùng cột
 * strokes). Không GPS/tracking (ngoài scope).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, UserPlus, Trash2, Save, Crown, Timer } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMinigameStore } from '../../../store/minigameStore'
import { useClubDataStore } from '../../../store/clubDataStore'
import { useAuthStore } from '../../../store/authStore'
import { PageHeader } from '../../../components/layout/PageHeader'
import { Button } from '../../../components/ui/Button'
import { LoadingState } from '../../../components/shared/LoadingState'
import api from '../../../lib/api'
import { cn } from '../../../lib/utils'

interface RunScore { round: number; strokes: number } // strokes = tổng giây
interface Runner { id: string; memberId?: string | null; guestName?: string | null; scores: RunScore[] }

// "mm:ss" | "ss" → giây; giây → "mm:ss"
const toSec = (s: string): number | null => {
  const t = s.trim(); if (!t) return null
  if (t.includes(':')) { const [m, sec] = t.split(':'); const mm = parseInt(m, 10), ss = parseInt(sec, 10); if (!Number.isFinite(mm) || !Number.isFinite(ss)) return null; return mm * 60 + ss }
  const n = parseInt(t, 10); return Number.isFinite(n) ? n : null
}
const fmt = (sec?: number | null) => { if (sec == null) return '–'; const m = Math.floor(sec / 60), s = sec % 60; return `${m}:${String(s).padStart(2, '0')}` }

export function RunningDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { getMinigame } = useMinigameStore()
  const { getClubData } = useClubDataStore()
  const mg = getMinigame(id!)
  const members = getClubData(clubId).members
  const memberName = useMemo(() => { const m: Record<string, string> = {}; members.forEach(x => { m[x.id] = x.fullName }); return m }, [members])

  const [runners, setRunners] = useState<Runner[]>([])
  const [rounds, setRounds] = useState(1)
  const [loading, setLoading] = useState(true)
  const [pickIds, setPickIds] = useState<string[]>([])
  const [guestName, setGuestName] = useState('')
  const [busy, setBusy] = useState(false)
  const [edits, setEdits] = useState<Record<string, string>>({}) // `${runnerId}:${round}` → "mm:ss"

  const fetchDetail = useCallback(async () => {
    if (!id) return
    try {
      const res = await api.get(`/minigames/${id}`)
      const m = res.data?.data ?? res.data
      setRunners((m?.golfers ?? []) as Runner[])
      setRounds(Math.max(1, Number(m?.settings?.rounds) || 1))
    } catch { toast.error('Không tải được dữ liệu giải') } finally { setLoading(false) }
  }, [id])
  useEffect(() => { fetchDetail() }, [fetchDetail])

  const runnerName = (r: Runner) => r.memberId ? (memberName[r.memberId] ?? 'VĐV') : (r.guestName ?? 'Khách')
  const totalOf = (r: Runner) => r.scores.reduce((s, x) => s + (x.strokes || 0), 0)
  const completedCount = (r: Runner) => r.scores.filter(x => x.strokes > 0).length
  const leaderboard = [...runners].filter(r => completedCount(r) > 0).sort((a, b) => totalOf(a) - totalOf(b))

  const addRunners = async () => {
    if (pickIds.length === 0 && !guestName.trim()) { toast.error('Chọn VĐV hoặc nhập tên khách'); return }
    setBusy(true)
    try {
      await api.post(`/minigames/${id}/golfers`, { memberIds: pickIds, guests: guestName.trim() ? [{ name: guestName.trim() }] : [] })
      setPickIds([]); setGuestName(''); await fetchDetail(); toast.success('Đã thêm vận động viên')
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Thêm VĐV thất bại') } finally { setBusy(false) }
  }
  const removeRunner = async (rid: string) => {
    if (!window.confirm('Xóa VĐV này?')) return
    setBusy(true)
    try { await api.delete(`/minigames/golfers/${rid}`); await fetchDetail(); toast.success('Đã xóa') }
    catch (err: any) { toast.error(err?.response?.data?.message ?? 'Xóa thất bại') } finally { setBusy(false) }
  }
  const saveTime = async (rid: string, round: number) => {
    const key = `${rid}:${round}`; const sec = toSec(edits[key] ?? '')
    if (sec == null || sec <= 0) { toast.error('Nhập thời gian hợp lệ (mm:ss hoặc số giây)'); return }
    setBusy(true)
    try { await api.patch(`/minigames/golfers/${rid}/score`, { round, strokes: sec }); await fetchDetail(); toast.success('Đã lưu thời gian') }
    catch (err: any) { toast.error(err?.response?.data?.message ?? 'Lưu thất bại') } finally { setBusy(false) }
  }

  if (!mg) return <div className="flex-1 flex items-center justify-center"><p className="[color:var(--pf-color-muted)]">Không tìm thấy giải</p></div>
  const activeMembers = members.filter(m => m.status === 'active')

  return (
    <div className="flex-1 overflow-y-auto [background:var(--pf-surface-muted)]">
      <PageHeader title={`🏃 Chạy bộ – ${mg.name}`} subtitle="Xếp hạng theo thời gian · tổng thời gian nhỏ nhất đứng đầu" />
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
        <button onClick={() => navigate('/minigames')} className="flex items-center gap-1.5 text-sm [color:var(--pf-color-muted)] hover:[color:var(--pf-text)] transition-colors"><ArrowLeft size={14} /> Danh Sách Giải Đấu</button>

        {/* Đang tải lần đầu: hiện skeleton trước khi có dữ liệu VĐV */}
        {loading && runners.length === 0 && <LoadingState variant="list" rows={4} />}

        {/* Thêm VĐV */}
        <div className="rounded-2xl border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)]">
          <h3 className="text-sm font-bold [color:var(--pf-text)] mb-3 flex items-center gap-1.5"><UserPlus size={15} /> Thêm vận động viên</h3>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto mb-3">
            {activeMembers.map(m => {
              const on = pickIds.includes(m.id)
              return <button key={m.id} onClick={() => setPickIds(s => on ? s.filter(x => x !== m.id) : [...s, m.id])}
                className={cn('rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors', on ? 'text-white [background:var(--pf-primary)] border-transparent' : '[color:var(--pf-color-muted)] [background:var(--pf-surface-muted)] border-[color:var(--pf-border)]')}>{m.fullName}</button>
            })}
          </div>
          <div className="flex gap-2">
            <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="+ Khách (tên)" className="flex-1 border border-[color:var(--pf-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]" />
            <Button onClick={addRunners} disabled={busy}>Thêm</Button>
          </div>
        </div>

        {/* Nhập thời gian */}
        {runners.length > 0 && (
          <div className="rounded-2xl border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)] overflow-x-auto">
            <h3 className="text-sm font-bold [color:var(--pf-text)] mb-3 flex items-center gap-1.5"><Timer size={15} /> Nhập thời gian (mm:ss)</h3>
            <table className="w-full min-w-[420px] text-sm">
              <thead><tr className="[color:var(--pf-color-muted)] text-xs uppercase">
                <th className="text-left py-2">Vận động viên</th>
                {Array.from({ length: rounds }, (_, i) => <th key={i} className="py-2 px-1">Lần {i + 1}</th>)}
                <th className="py-2 px-1 text-right">Tổng</th><th></th>
              </tr></thead>
              <tbody>
                {runners.map(r => (
                  <tr key={r.id} className="border-t border-[color:var(--pf-border-soft)]">
                    <td className="py-2 [color:var(--pf-text)]">{runnerName(r)}</td>
                    {Array.from({ length: rounds }, (_, i) => {
                      const round = i + 1; const key = `${r.id}:${round}`
                      const cur = r.scores.find(s => s.round === round)?.strokes
                      return <td key={i} className="py-2 px-1">
                        <div className="flex items-center gap-1">
                          <input value={edits[key] ?? (cur ? fmt(cur) : '')} onChange={e => setEdits(s => ({ ...s, [key]: e.target.value }))}
                            placeholder="mm:ss" className="w-16 text-center border border-[color:var(--pf-border)] rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-[color:var(--pf-primary)]" />
                          <button onClick={() => saveTime(r.id, round)} disabled={busy} className="[color:var(--pf-primary)]"><Save size={13} /></button>
                        </div>
                      </td>
                    })}
                    <td className="py-2 px-1 text-right font-bold [color:var(--pf-text)]">{completedCount(r) > 0 ? fmt(totalOf(r)) : '–'}</td>
                    <td><button onClick={() => removeRunner(r.id)} className="[color:var(--pf-color-danger)]"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="rounded-2xl border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)]">
            <h3 className="text-sm font-bold [color:var(--pf-text)] mb-3">🏆 Bảng xếp hạng</h3>
            <div className="divide-y divide-[color:var(--pf-border-soft)]">
              {leaderboard.map((r, i) => (
                <div key={r.id} className={cn('flex items-center justify-between py-2', i === 0 && 'font-bold')}>
                  <span className="flex items-center gap-2 [color:var(--pf-text)]">
                    {i === 0 ? <Crown size={16} className="[color:var(--pf-color-warning)]" /> : <span className="w-6 text-center [color:var(--pf-color-muted)]">{i + 1}</span>}
                    {runnerName(r)}
                  </span>
                  <span className="[color:var(--pf-text)]">{fmt(totalOf(r))}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {!loading && runners.length === 0 && <p className="text-center text-sm [color:var(--pf-color-muted)] py-6">Chưa có vận động viên. Thêm ở trên để bắt đầu.</p>}
      </div>
    </div>
  )
}
