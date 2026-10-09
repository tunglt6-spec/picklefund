import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import api from '../../lib/api'

type Plan = 'STARTER' | 'PRO' | 'CLUB_PLUS'
interface PlanInfo { tier: Plan; name: string; priceMonthly: number | null; priceYearly: number | null }
export interface ClubOption { id: string; name: string; plan?: string; planExpiresAt?: string | null }

const METHODS = [
  { v: 'BANK_TRANSFER', l: 'Chuyển khoản' }, { v: 'CASH', l: 'Tiền mặt' },
  { v: 'EWALLET', l: 'Ví điện tử' }, { v: 'OTHER', l: 'Khác' },
]
const MONTH_PRESETS = [1, 3, 6, 12, 24]
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const fmt = (n: number) => n.toLocaleString('vi-VN')

/** Super Admin ghi nhận thanh toán / gia hạn gói cho 1 CLB (thu ngoài cổng thanh toán). */
export function RecordPlanPaymentModal({ open, onClose, clubs, clubId: presetClubId, onDone, mode = 'record' }: {
  open: boolean; onClose: () => void; clubs: ClubOption[]; clubId?: string; onDone: () => void
  /** record = Super Admin ghi trực tiếp; request = CLB Admin gửi yêu cầu chờ Super Admin xác nhận. */
  mode?: 'record' | 'request'
}) {
  const [plans, setPlans] = useState<PlanInfo[]>([])
  const [clubId, setClubId] = useState('')
  const [planTier, setPlanTier] = useState<Plan>('PRO')
  const [months, setMonths] = useState(1)
  const [amount, setAmount] = useState(0)
  const [amountTouched, setAmountTouched] = useState(false)
  const [method, setMethod] = useState('BANK_TRANSFER')
  const [paidAt, setPaidAt] = useState(today())
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    api.get('/billing/plans').then((r) => setPlans(r.data?.data ?? [])).catch(() => setPlans([]))
    setClubId(presetClubId ?? '')
    setPlanTier('PRO'); setMonths(1); setAmountTouched(false); setMethod('BANK_TRANSFER'); setPaidAt(today()); setReference(''); setNote('')
  }, [open, presetClubId])

  const club = clubs.find((c) => c.id === clubId)
  const suggested = useMemo(() => {
    const p = plans.find((x) => x.tier === planTier)
    if (!p || p.priceMonthly == null) return 0
    const years = Math.floor(months / 12)
    const rest = months % 12
    return years * (p.priceYearly ?? p.priceMonthly * 12) + rest * p.priceMonthly
  }, [plans, planTier, months])
  useEffect(() => { if (!amountTouched) setAmount(suggested) }, [suggested, amountTouched])

  const newExpiry = useMemo(() => {
    const base = club?.plan === planTier && club.planExpiresAt && new Date(club.planExpiresAt) > new Date() ? new Date(club.planExpiresAt) : new Date()
    const d = new Date(base)
    const day = d.getDate()
    d.setDate(1)
    d.setMonth(d.getMonth() + months)
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
    return d
  }, [club, planTier, months])
  const unlimited = !!club && club.plan === planTier && !club.planExpiresAt && planTier !== 'STARTER'

  const submit = async () => {
    if (!clubId) { toast.error('Chọn CLB'); return }
    if (!(amount > 0)) { toast.error('Nhập số tiền thực thu lớn hơn 0'); return }
    setBusy(true)
    try {
      const body = { planTier, months, amount, method, paidAt, reference: reference.trim() || undefined, note: note.trim() || undefined }
      if (mode === 'request') {
        await api.post('/billing/manual-requests', body)
        toast.success('Đã gửi yêu cầu — chờ Super Admin xác nhận')
      } else {
        await api.post('/billing/manual-payments', { clubId, ...body })
        toast.success('Đã ghi nhận thanh toán và gia hạn gói')
      }
      onDone()
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Ghi nhận thất bại')
    } finally { setBusy(false) }
  }

  const label = 'mb-1 block text-xs font-semibold [color:var(--pf-color-muted)]'
  const input = 'w-full rounded-xl border px-3 py-2 text-sm [background:var(--pf-surface)] [color:var(--pf-text)] border-[color:var(--pf-border)] focus:outline-none focus:[border-color:var(--pf-primary)]'

  return (
    <Modal open={open} onClose={onClose} title={mode === 'request' ? 'Báo đã chuyển khoản gia hạn gói' : 'Ghi nhận thanh toán gói'} subtitle={mode === 'request' ? 'Gửi thông tin chuyển khoản — Super Admin đối chiếu và xác nhận để kích hoạt gói' : 'Gia hạn / nâng cấp gói cho CLB (thu ngoài cổng)'} size="md">
      <div className="space-y-3">
        <div>
          <label className={label} htmlFor="rpp-club">CLB</label>
          <select id="rpp-club" value={clubId} onChange={(e) => setClubId(e.target.value)} disabled={!!presetClubId} className={input}>
            <option value="">— Chọn CLB —</option>
            {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="rpp-plan">Gói</label>
            <select id="rpp-plan" value={planTier} onChange={(e) => setPlanTier(e.target.value as Plan)} className={input}>
              <option value="STARTER">Starter</option><option value="PRO">Pro</option><option value="CLUB_PLUS">Enterprise</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="rpp-method">Hình thức thu</label>
            <select id="rpp-method" value={method} onChange={(e) => setMethod(e.target.value)} className={input}>
              {METHODS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>
        </div>
        <div>
          <span className={label}>Thời gian gia hạn</span>
          <div className="flex flex-wrap items-center gap-2">
            {MONTH_PRESETS.map((m) => (
              <button key={m} type="button" onClick={() => setMonths(m)} aria-pressed={months === m}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${months === m ? 'text-white border-transparent' : '[color:var(--pf-color-muted)] border-[color:var(--pf-border)]'}`}
                style={months === m ? { background: 'var(--pf-primary)' } : undefined}>{m >= 12 ? `${m / 12} năm` : `${m} tháng`}</button>
            ))}
            <input aria-label="Số tháng" type="number" min={1} max={36} value={months} onChange={(e) => setMonths(Math.max(1, Math.min(36, Number(e.target.value) || 1)))} className={`${input} !w-20`} />
            <span className="text-xs [color:var(--pf-color-muted)]">tháng</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="rpp-amount">Số tiền thực thu (đ)</label>
            <input id="rpp-amount" type="number" min={0} value={amount || ''} onChange={(e) => { setAmountTouched(true); setAmount(Number(e.target.value) || 0) }} className={input} />
            <p className="mt-1 text-[11px] [color:var(--pf-color-muted)]">{suggested > 0 ? `Gợi ý theo bảng giá: ${fmt(suggested)} đ` : 'Gói không có giá cố định — nhập số thực thu'}{amountTouched && suggested > 0 && amount !== suggested ? ' · đang khác gợi ý' : ''}</p>
          </div>
          <div>
            <label className={label} htmlFor="rpp-date">Ngày thu</label>
            <input id="rpp-date" type="date" max={today()} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={input} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="rpp-ref">Mã giao dịch / số biên lai</label>
            <input id="rpp-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Chống ghi trùng" className={input} maxLength={120} />
          </div>
          <div>
            <label className={label} htmlFor="rpp-note">Ghi chú</label>
            <input id="rpp-note" value={note} onChange={(e) => setNote(e.target.value)} className={input} maxLength={500} />
          </div>
        </div>
        {club && (
          <div className="rounded-xl border px-3 py-2.5 text-xs [border-color:var(--pf-border)] [background:var(--pf-surface-muted)] [color:var(--pf-text)]">
            Hạn gói hiện tại: <b>{club.planExpiresAt ? new Date(club.planExpiresAt).toLocaleDateString('vi-VN') : 'không giới hạn / chưa có'}</b>
            {' → '}hạn mới: <b>{unlimited ? 'không giới hạn (giữ nguyên)' : newExpiry.toLocaleDateString('vi-VN')}</b>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={submit} disabled={busy || !clubId || amount <= 0}>{busy ? 'Đang gửi…' : mode === 'request' ? 'Gửi yêu cầu xác nhận' : 'Ghi nhận thanh toán'}</Button>
        </div>
      </div>
    </Modal>
  )
}
