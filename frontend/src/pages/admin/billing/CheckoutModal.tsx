import { useState } from 'react'
import { X, ShieldCheck, Loader2, CheckCircle2, Sparkles, Tag, ChevronDown } from 'lucide-react'
import api from '../../../lib/api'
import toast from 'react-hot-toast'

export type CheckoutPlan = {
  tier: 'PRO' | 'CLUB_PLUS' | 'STARTER'
  name: string
  priceMonthly: number | null
  priceYearly: number | null
}

type Cycle = 'MONTHLY' | 'YEARLY'
type Step = 'form' | 'sandbox' | 'done'

const vnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`

/**
 * Checkout tự-thanh-toán. Backend TÍNH GIÁ + GIẢM GIÁ (không gửi số tiền/giảm từ đây). Cổng thật
 * (MoMo) → redirect payUrl; SANDBOX (MOCK, chưa có khoá) → bước giả lập gọi endpoint simulate.
 * Phase 2: mã ưu đãi + thông tin xuất hoá đơn (tùy chọn).
 */
export function CheckoutModal({
  plan,
  onClose,
  onActivated,
}: {
  plan: CheckoutPlan
  onClose: () => void
  onActivated: () => void
}) {
  const [cycle, setCycle] = useState<Cycle>('MONTHLY')
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>('form')
  const [order, setOrder] = useState<{ orderCode: string; amount: number } | null>(null)

  // Mã ưu đãi
  const [promoInput, setPromoInput] = useState('')
  const [promo, setPromo] = useState<{ code: string; label: string; discount: number } | null>(null)
  const [promoChecking, setPromoChecking] = useState(false)

  // Thông tin xuất hoá đơn (tùy chọn)
  const [showInvoice, setShowInvoice] = useState(false)
  const [buyerName, setBuyerName] = useState('')
  const [taxCode, setTaxCode] = useState('')
  const [address, setAddress] = useState('')

  const base = (cycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly) ?? 0
  const discount = promo?.discount ?? 0
  const total = Math.max(0, base - discount)
  const yearlySaving =
    plan.priceMonthly != null && plan.priceYearly != null
      ? plan.priceMonthly * 12 - plan.priceYearly
      : 0

  const applyPromo = async () => {
    const code = promoInput.trim()
    if (!code) return
    setPromoChecking(true)
    try {
      const res = await api.get(`/billing/promo/${encodeURIComponent(code)}`, {
        params: { planTier: plan.tier, billingCycle: cycle },
      })
      const d = res.data?.data ?? res.data
      if (d?.valid) {
        setPromo({ code: d.code, label: d.label, discount: d.discount })
        toast.success(`Áp mã ${d.code}: giảm ${vnd(d.discount)}`)
      } else {
        setPromo(null)
        toast.error('Mã ưu đãi không hợp lệ.')
      }
    } catch {
      setPromo(null)
      toast.error('Không kiểm được mã.')
    } finally {
      setPromoChecking(false)
    }
  }

  const billingInfo = () => {
    if (!buyerName.trim() && !taxCode.trim() && !address.trim()) return undefined
    return { buyerName: buyerName.trim(), taxCode: taxCode.trim(), address: address.trim() }
  }

  const createOrder = async () => {
    if (!agree) { toast.error('Vui lòng đồng ý điều khoản.'); return }
    setLoading(true)
    try {
      const res = await api.post('/billing/orders', {
        planTier: plan.tier,
        billingCycle: cycle,
        promoCode: promo?.code,
        billingInfo: billingInfo(),
      })
      const d = res.data?.data ?? res.data
      setOrder({ orderCode: d.orderCode, amount: d.amount })
      if (d.gateway === 'MOCK') setStep('sandbox')
      else if (d.checkoutUrl) window.location.href = d.checkoutUrl
      else toast.error('Không nhận được liên kết thanh toán từ cổng. Vui lòng thử lại.')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Không tạo được đơn thanh toán.')
    } finally {
      setLoading(false)
    }
  }

  const simulatePay = async () => {
    if (!order) return
    setLoading(true)
    try {
      const res = await api.post(`/billing/orders/${order.orderCode}/simulate`)
      const r = res.data?.data ?? res.data
      if (r?.ok) setStep('done')
      else toast.error('Giả lập thất bại: ' + (r?.reason ?? ''))
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Giả lập thất bại.')
    } finally {
      setLoading(false)
    }
  }

  const row = (label: string, value: string, strong = false, color?: string) => (
    <div className="flex items-center justify-between py-1.5">
      <span className={`text-sm ${strong ? 'font-semibold [color:var(--pf-text)]' : '[color:var(--pf-color-muted)]'}`}>{label}</span>
      <span className={`text-sm tabular-nums ${strong ? 'font-bold' : ''}`} style={{ color: color ?? 'var(--pf-text)' }}>{value}</span>
    </div>
  )

  const inputCls = 'w-full h-10 rounded-lg border px-3 text-sm [background:var(--pf-surface)] border-[color:var(--pf-border)] [color:var(--pf-text)] outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]'

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={loading ? undefined : onClose} />
      <div className="relative w-full sm:max-w-md [background:var(--pf-surface)] rounded-t-2xl sm:rounded-2xl border border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow-hover)] max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 [background:var(--pf-surface)] px-5 py-4 border-b border-[color:var(--pf-border)] flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="[color:var(--pf-primary)]" />
            <h3 className="font-bold [color:var(--pf-text)]">Nâng cấp gói {plan.name}</h3>
          </div>
          <button onClick={onClose} disabled={loading} className="p-1.5 rounded-lg hover:[background:var(--pf-surface-muted)] disabled:opacity-50" aria-label="Đóng">
            <X size={18} className="[color:var(--pf-color-muted)]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {step === 'form' && (
            <>
              {/* Chu kỳ */}
              <div className="grid grid-cols-2 gap-2">
                {(['MONTHLY', 'YEARLY'] as Cycle[]).map((c) => {
                  const p = c === 'YEARLY' ? plan.priceYearly : plan.priceMonthly
                  const active = cycle === c
                  return (
                    <button key={c} onClick={() => { setCycle(c); setPromo(null) }}
                      className={`rounded-xl border p-3 text-left transition-colors ${active ? '[border-color:var(--pf-primary)] [background:var(--pf-primary-soft)]' : 'border-[color:var(--pf-border)] hover:[background:var(--pf-surface-muted)]'}`}>
                      <p className="text-xs font-medium [color:var(--pf-color-muted)]">{c === 'YEARLY' ? 'Theo năm' : 'Theo tháng'}</p>
                      <p className="text-base font-bold [color:var(--pf-text)]">{p != null ? vnd(p) : '—'}</p>
                      {c === 'YEARLY' && yearlySaving > 0 && (
                        <p className="text-[11px] font-medium text-emerald-600">Tiết kiệm {vnd(yearlySaving)}</p>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Mã ưu đãi */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)]" />
                  <input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="Mã ưu đãi (nếu có)" className={inputCls + ' pl-8'} />
                </div>
                <button onClick={applyPromo} disabled={promoChecking || !promoInput.trim()}
                  className="h-10 px-4 rounded-lg text-sm font-semibold border border-[color:var(--pf-border)] [color:var(--pf-text)] hover:[background:var(--pf-surface-muted)] disabled:opacity-50">
                  {promoChecking ? '…' : 'Áp dụng'}
                </button>
              </div>

              {/* Thông tin xuất hoá đơn (tùy chọn) */}
              <div className="rounded-xl border border-[color:var(--pf-border)]">
                <button onClick={() => setShowInvoice((v) => !v)} className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium [color:var(--pf-text)]">
                  Thông tin xuất hoá đơn (tùy chọn)
                  <ChevronDown size={16} className={`[color:var(--pf-color-muted)] transition-transform ${showInvoice ? 'rotate-180' : ''}`} />
                </button>
                {showInvoice && (
                  <div className="px-4 pb-3 space-y-2">
                    <input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Tên đơn vị / người mua" className={inputCls} />
                    <input value={taxCode} onChange={(e) => setTaxCode(e.target.value)} placeholder="Mã số thuế" className={inputCls} />
                    <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Địa chỉ" className={inputCls} />
                  </div>
                )}
              </div>

              {/* Breakdown */}
              <div className="rounded-xl border border-[color:var(--pf-border)] p-4">
                {row(`Gói ${plan.name} · ${cycle === 'YEARLY' ? '1 năm' : '1 tháng'}`, vnd(base))}
                {discount > 0 && row(`Ưu đãi ${promo?.code}`, `- ${vnd(discount)}`, false, 'var(--pf-green)')}
                {row('VAT (chưa áp dụng)', vnd(0))}
                <div className="my-1.5 border-t border-[color:var(--pf-border)]" />
                {row('Tổng thanh toán', vnd(total), true)}
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--pf-primary)]" />
                <span className="text-xs [color:var(--pf-color-muted)] leading-snug">
                  Tôi đồng ý điều khoản: gói kích hoạt ngay sau khi thanh toán thành công; có thời gian ân hạn khi hết hạn; có thể hủy gia hạn nhưng vẫn dùng đến hết kỳ.
                </span>
              </label>

              <button onClick={createOrder} disabled={loading || total <= 0}
                className="w-full h-11 rounded-xl [background:var(--pf-primary)] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:[background:var(--pf-primary-hover)] transition-colors">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {loading ? 'Đang tạo đơn…' : `Thanh toán an toàn · ${vnd(total)}`}
              </button>
              <p className="text-[11px] text-center [color:var(--pf-color-muted)]">Số tiền & ưu đãi do hệ thống tính — an toàn, không sửa được từ trình duyệt.</p>
            </>
          )}

          {step === 'sandbox' && order && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full [background:var(--pf-primary-soft)]">
                <ShieldCheck size={22} className="[color:var(--pf-primary)]" />
              </div>
              <div>
                <p className="font-semibold [color:var(--pf-text)]">Chế độ SANDBOX (thử nghiệm)</p>
                <p className="text-sm [color:var(--pf-color-muted)] mt-1">Chưa cấu hình cổng thật (MoMo). Bấm để <b>giả lập</b> giao dịch thành công — không mất tiền thật.</p>
              </div>
              <div className="rounded-xl border border-[color:var(--pf-border)] p-3 text-left">
                {row('Mã đơn', order.orderCode)}
                {row('Số tiền', vnd(order.amount), true)}
              </div>
              <button onClick={simulatePay} disabled={loading}
                className="w-full h-11 rounded-xl [background:var(--pf-primary)] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Giả lập thanh toán thành công
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-4 text-center py-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 size={30} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold [color:var(--pf-text)]">Đã kích hoạt {plan.name}!</p>
                <p className="text-sm [color:var(--pf-color-muted)] mt-1">Gói đã kích hoạt và hoá đơn đã lập. Tải biên nhận ở mục Lịch sử thanh toán.</p>
              </div>
              <button onClick={() => { onActivated(); onClose() }}
                className="w-full h-11 rounded-xl [background:var(--pf-primary)] text-white font-semibold">
                Xong
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
