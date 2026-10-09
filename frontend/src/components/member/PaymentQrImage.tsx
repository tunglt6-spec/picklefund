import { useEffect, useState } from 'react'
import { QrCode, RefreshCw } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import api from '../../lib/api'
import { buildVietQrPayload } from '../../lib/vietqr'
import { blobToDataUrl } from '../../lib/blobUrl'

/**
 * Ảnh QR chuyển khoản — tải QUA backend (cùng origin, có token) thay vì nhúng thẳng img.vietqr.io:
 * không bị chặn bởi mạng/extension/PWA, lỗi thì hiện nút "Tải lại" thay vì ảnh vỡ.
 */
export function PaymentQrImage({ amount, className, bank, memo = '' }: {
  amount: number; className?: string
  bank?: { bank_code: string; bank_account_number: string } | null; memo?: string
}) {
  const [src, setSrc] = useState('')
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const payload = bank ? buildVietQrPayload(bank.bank_code, bank.bank_account_number, amount, memo) : null
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!amount || amount <= 0) { setSrc(''); setState('error'); return }
    let alive = true
    setState('loading')
    // Debounce: người dùng đang gõ số tiền thì không gọi mỗi phím.
    const t = setTimeout(() => api
      .get('/member/me/payment-qr', { params: { amount }, responseType: 'blob' })
      .then((r) => {
        if (!alive) return
        const blob = r.data as Blob
        // Chỉ nhận ảnh thật — máy chủ/CDN trả HTML hoặc lỗi 200 sẽ thành ảnh vỡ nếu không chặn ở đây.
        if (!/^image\//.test(blob.type) || blob.size < 500) throw new Error('not-image')
        return blobToDataUrl(blob).then((u) => { if (!alive) return; setSrc(u); setState('ok') })
      })
      .catch(() => { if (alive) { setSrc(''); setState('error') } }), 350)
    return () => { alive = false; clearTimeout(t) }
  }, [amount, tick])

  const box = className ?? 'h-32 w-32 rounded-xl border-2 border-amber-200 shadow-sm'
  if (state === 'ok' && src) {
    return <img src={src} alt="QR thanh toán" onError={() => setState('error')} className={`${box} [background:var(--pf-surface)] object-contain`} />
  }
  // Dự phòng: tự sinh VietQR tại máy (ngân hàng đã đối chiếu BIN) khi không tải được ảnh.
  if (state === 'error' && payload) {
    return (
      <div className={`${box} flex items-center justify-center bg-white p-2`} title="Mã QR tạo trên thiết bị">
        <QRCodeSVG value={payload} size={256} level="M" className="h-full w-full" />
      </div>
    )
  }
  return (
    <div className={`${box} flex flex-col items-center justify-center gap-1.5 text-center [background:var(--pf-surface)]`}>
      {state === 'loading' ? (
        <QrCode size={32} className="animate-pulse [color:var(--pf-color-muted)]" />
      ) : (
        <>
          <QrCode size={26} className="[color:var(--pf-color-muted)]" />
          <button type="button" onClick={() => setTick((t) => t + 1)} className="inline-flex items-center gap-1 text-[11px] font-semibold [color:var(--pf-primary-text)]">
            <RefreshCw size={11} /> Tải lại QR
          </button>
        </>
      )}
    </div>
  )
}
