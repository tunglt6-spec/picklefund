import { useCallback, useEffect, useState } from 'react'
import { Copy, Landmark, QrCode, Clock, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import api from '../../lib/api'
import { formatVND } from '../../lib/utils'

interface PaymentContext {
  period: { id: string; name: string } | null
  contributionAmount: number
  paid: number
  suggestedAmount: number
  bank: { bank_code: string; bank_account_number: string; bank_account_name: string } | null
  memo: string
  qrImageUrl: string | null
  pending: { id: string; amount: number; createdAt: string } | null
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`Đã copy ${label}`)
  } catch {
    toast.error('Không copy được')
  }
}

/**
 * "Báo đã nộp quỹ" — member xem thông tin CK + QR + nội dung tự sinh, rồi bấm
 * "Tôi đã chuyển khoản" để gửi báo nộp (chờ Admin xác nhận). KHÔNG tự thành đã thu.
 */
export function ReportPaymentModal({
  open,
  onClose,
  onReported,
}: {
  open: boolean
  onClose: () => void
  onReported?: () => void
}) {
  const [ctx, setCtx] = useState<PaymentContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState<number>(0)
  const [note, setNote] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [qrObj, setQrObj] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api
      .get('/member/me/payment-context')
      .then((r) => {
        const c: PaymentContext = r.data?.data ?? r.data
        setCtx(c)
        // Đã nộp đủ (suggested=0) → để trống, KHÔNG tự điền lại cả kỳ (tránh báo trùng/thừa).
        setAmount(c?.suggestedAmount ?? 0)
      })
      .catch(() => toast.error('Không tải được thông tin nộp quỹ'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (open) {
      setNote('')
      setProofUrl('')
      load()
    }
  }, [open, load])

  const submit = async () => {
    if (!amount || amount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/member/me/payments/report', { amount, note: note || undefined, proofUrl: proofUrl || undefined })
      toast.success('Đã gửi báo nộp quỹ — chờ Admin xác nhận')
      onReported?.()
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Gửi báo nộp thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  // QR same-origin: tải qua backend proxy (tránh lỗi ảnh cross-origin trên PWA/mobile).
  // Chỉ hiện khi CLB có cấu hình NH và có số tiền để nộp (>0).
  useEffect(() => {
    if (!open || !ctx?.bank || !amount || amount <= 0) {
      setQrObj('')
      return
    }
    let objUrl = ''
    let alive = true
    api
      .get('/member/me/payment-qr', { params: { amount }, responseType: 'blob' })
      .then((r) => {
        if (!alive) return
        objUrl = URL.createObjectURL(r.data as Blob)
        setQrObj(objUrl)
      })
      .catch(() => alive && setQrObj(''))
    return () => {
      alive = false
      if (objUrl) URL.revokeObjectURL(objUrl)
    }
  }, [open, amount, ctx])

  return (
    <Modal open={open} onClose={onClose} title="Báo đã nộp quỹ" subtitle={ctx?.period ? `Kỳ ${ctx.period.name}` : 'Chuyển khoản quỹ CLB'} size="md">
      {loading ? (
        <div className="py-10 text-center text-[13px] [color:var(--pf-color-muted)]">Đang tải…</div>
      ) : !ctx ? (
        <div className="py-10 text-center text-[13px] [color:var(--pf-color-muted)]">Không có dữ liệu.</div>
      ) : ctx.pending ? (
        <div className="space-y-3 py-2">
          <div className="flex items-start gap-3 rounded-xl border p-3.5 [border-color:var(--pf-border)] [background:var(--pf-color-warning-soft)]">
            <Clock size={20} className="[color:var(--pf-color-warning)] mt-0.5 shrink-0" />
            <div>
              <p className="text-[14px] font-bold [color:var(--pf-text)]">Đang chờ Admin xác nhận</p>
              <p className="text-[12.5px] [color:var(--pf-color-muted)] mt-0.5">
                Bạn đã báo nộp {formatVND(ctx.pending.amount)}. Admin sẽ kiểm tra và xác nhận đã nhận tiền. Bạn không cần gửi lại.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Số cần nộp */}
          <div className="rounded-xl border p-3.5 [border-color:var(--pf-border)] [background:var(--pf-surface-muted)]">
            <div className="flex items-center justify-between text-[12.5px] [color:var(--pf-color-muted)]">
              <span>Kỳ quỹ</span>
              <span className="font-semibold [color:var(--pf-text)]">{ctx.period?.name ?? '—'}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[12.5px] [color:var(--pf-color-muted)]">
              <span>Gợi ý cần nộp</span>
              <span className="font-semibold [color:var(--pf-text)]">{formatVND(ctx.suggestedAmount)}</span>
            </div>
          </div>

          {ctx.period && ctx.suggestedAmount <= 0 && (
            <div className="flex items-start gap-2 rounded-xl border p-3 [border-color:var(--pf-border)] [background:var(--pf-color-success-soft)]">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 [color:var(--pf-color-success)]" />
              <p className="text-[12.5px] [color:var(--pf-text)]">
                Bạn đã nộp đủ kỳ này. Nếu vẫn muốn báo nộp thêm, hãy nhập số tiền bên dưới.
              </p>
            </div>
          )}

          {/* Bank info */}
          {ctx.bank ? (
            <div className="rounded-xl border p-3.5 [border-color:var(--pf-border)]">
              <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide [color:var(--pf-color-muted)]">
                <Landmark size={14} /> Tài khoản nhận
              </div>
              {[
                ['Ngân hàng', ctx.bank.bank_code],
                ['Số tài khoản', ctx.bank.bank_account_number],
                ['Chủ tài khoản', ctx.bank.bank_account_name],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between gap-2 py-1">
                  <span className="text-[12.5px] [color:var(--pf-color-muted)]">{label}</span>
                  <button onClick={() => copy(val, label.toLowerCase())} className="inline-flex items-center gap-1 text-[13px] font-semibold [color:var(--pf-text)]">
                    {val} <Copy size={12} className="[color:var(--pf-color-muted)]" />
                  </button>
                </div>
              ))}
              <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-[color:var(--pf-border)] pt-2">
                <span className="text-[12.5px] [color:var(--pf-color-muted)]">Nội dung CK</span>
                <button onClick={() => copy(ctx.memo, 'nội dung')} className="inline-flex items-center gap-1 text-right text-[13px] font-semibold [color:var(--pf-primary)]">
                  {ctx.memo} <Copy size={12} />
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border p-3 text-[12.5px] [border-color:var(--pf-border)] [color:var(--pf-color-muted)]">
              CLB chưa cấu hình tài khoản nhận tiền. Bạn vẫn có thể báo đã nộp; Admin sẽ đối chiếu.
            </div>
          )}

          {/* QR (same-origin, chỉ hiện khi có số tiền cần nộp) */}
          {qrObj && (
            <div className="flex flex-col items-center gap-2 rounded-xl border p-3 [border-color:var(--pf-border)]">
              <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide [color:var(--pf-color-muted)]"><QrCode size={14} /> Quét QR để chuyển khoản</div>
              <img src={qrObj} alt="QR chuyển khoản" className="h-52 w-52 max-w-full rounded-lg object-contain" />
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="mb-1 block text-[12.5px] font-semibold [color:var(--pf-text)]">Số tiền đã chuyển</label>
            <input
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full rounded-xl border px-3 py-2.5 text-[15px] font-semibold outline-none [background:var(--pf-surface)] [color:var(--pf-text)] border-[color:var(--pf-border)] focus:[border-color:var(--pf-primary)]"
              inputMode="numeric"
            />
          </div>

          {/* Note */}
          <div>
            <label className="mb-1 block text-[12.5px] font-semibold [color:var(--pf-text)]">Ghi chú (tùy chọn)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="VD: chuyển lúc 20h, MB Bank…"
              className="w-full resize-none rounded-xl border px-3 py-2 text-[14px] outline-none [background:var(--pf-surface)] [color:var(--pf-text)] border-[color:var(--pf-border)] focus:[border-color:var(--pf-primary)]"
            />
          </div>

          {/* Proof link (optional) */}
          <div>
            <label className="mb-1 block text-[12.5px] font-semibold [color:var(--pf-text)]">Link ảnh chứng từ (tùy chọn)</label>
            <input
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="Dán link ảnh biên lai nếu có"
              className="w-full rounded-xl border px-3 py-2 text-[14px] outline-none [background:var(--pf-surface)] [color:var(--pf-text)] border-[color:var(--pf-border)] focus:[border-color:var(--pf-primary)]"
            />
          </div>

          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
            style={{ background: 'var(--pf-primary)' }}
          >
            <CheckCircle2 size={18} /> {submitting ? 'Đang gửi…' : 'Tôi đã chuyển khoản'}
          </button>
          <p className="text-center text-[11.5px] [color:var(--pf-color-muted)]">
            Sau khi gửi, khoản của bạn ở trạng thái <b>Chờ Admin xác nhận</b> — chỉ Admin mới xác nhận đã nhận tiền.
          </p>
        </div>
      )}
    </Modal>
  )
}
