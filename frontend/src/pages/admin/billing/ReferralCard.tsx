import { useCallback, useEffect, useState } from 'react'
import { Gift, Copy, Check, Loader2 } from 'lucide-react'
import api from '../../../lib/api'
import toast from 'react-hot-toast'

type ReferralInfo = {
  code: string
  shareUrl: string
  referredCount: number
  rewardedCount: number
  pendingCount: number
  referredBy: { code: string; status: 'PENDING' | 'REWARDED' } | null
}

/**
 * Card "Giới thiệu bạn bè": mã của CLB (copy/chia sẻ) + áp mã CLB khác. Khi CLB được giới
 * thiệu lên Pro → cả hai +1 tháng Pro (backend xử lý ở billing.activate).
 */
export function ReferralCard() {
  const [info, setInfo] = useState<ReferralInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [applyInput, setApplyInput] = useState('')
  const [applying, setApplying] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/referrals/me')
      setInfo(res.data?.data ?? res.data)
    } catch { /* noop */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const copy = async () => {
    if (!info) return
    try {
      await navigator.clipboard.writeText(info.code)
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    } catch { toast.error('Không copy được.') }
  }

  const apply = async () => {
    const code = applyInput.trim()
    if (!code) return
    setApplying(true)
    try {
      const res = await api.post('/referrals/apply', { code })
      const d = res.data?.data ?? res.data
      toast.success(`Đã áp mã giới thiệu từ ${d?.referrerName ?? 'CLB khác'}. Lên Pro để cả hai nhận +1 tháng!`)
      setApplyInput('')
      void load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Áp mã thất bại.')
    } finally { setApplying(false) }
  }

  if (loading || !info) return null

  return (
    <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] p-5 md:p-6">
      <div className="flex items-center gap-2 mb-1">
        <Gift size={18} className="[color:var(--pf-primary)]" />
        <h3 className="font-semibold [color:var(--pf-text)]">Giới thiệu bạn bè — nhận Pro miễn phí</h3>
      </div>
      <p className="text-sm [color:var(--pf-color-muted)] mb-4">
        Chia sẻ mã cho CLB khác. Khi họ đăng ký & lên Pro, <b>cả hai được +1 tháng Pro</b>.
      </p>

      {/* Mã của tôi */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center justify-between rounded-xl border border-dashed px-4 py-3 [border-color:var(--pf-primary)] [background:var(--pf-primary-soft)]">
          <span className="text-lg font-extrabold tracking-widest [color:var(--pf-primary)]">{info.code}</span>
          <button onClick={copy} className="inline-flex items-center gap-1 text-xs font-semibold [color:var(--pf-primary)]">
            {copied ? <><Check size={14} /> Đã copy</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
      </div>

      {/* Thống kê */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg [background:var(--pf-surface-muted)] py-2">
          <p className="text-lg font-bold [color:var(--pf-text)]">{info.referredCount}</p>
          <p className="text-[11px] [color:var(--pf-color-muted)]">Đã giới thiệu</p>
        </div>
        <div className="rounded-lg [background:var(--pf-surface-muted)] py-2">
          <p className="text-lg font-bold text-emerald-600">{info.rewardedCount}</p>
          <p className="text-[11px] [color:var(--pf-color-muted)]">Đã thưởng</p>
        </div>
        <div className="rounded-lg [background:var(--pf-surface-muted)] py-2">
          <p className="text-lg font-bold text-amber-500">{info.pendingCount}</p>
          <p className="text-[11px] [color:var(--pf-color-muted)]">Chờ lên Pro</p>
        </div>
      </div>

      {/* Áp mã (nếu chưa được giới thiệu) */}
      {info.referredBy ? (
        <p className="mt-4 text-xs [color:var(--pf-color-muted)]">
          CLB của bạn đã được giới thiệu bằng mã <b className="[color:var(--pf-text)]">{info.referredBy.code}</b>
          {info.referredBy.status === 'REWARDED' ? ' · đã nhận thưởng ✅' : ' · thưởng sẽ cộng khi bạn lên Pro'}
        </p>
      ) : (
        <div className="mt-4">
          <p className="text-xs font-medium [color:var(--pf-color-muted)] mb-1.5">Có mã giới thiệu? Nhập vào đây:</p>
          <div className="flex items-center gap-2">
            <input value={applyInput} onChange={(e) => setApplyInput(e.target.value.toUpperCase())}
              placeholder="VD: PFAB12CD"
              className="flex-1 h-10 rounded-lg border px-3 text-sm [background:var(--pf-surface)] border-[color:var(--pf-border)] [color:var(--pf-text)] outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]" />
            <button onClick={apply} disabled={applying || !applyInput.trim()}
              className="h-10 px-4 rounded-lg text-sm font-semibold [background:var(--pf-primary)] text-white disabled:opacity-50 inline-flex items-center gap-1.5">
              {applying ? <Loader2 size={14} className="animate-spin" /> : null} Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
