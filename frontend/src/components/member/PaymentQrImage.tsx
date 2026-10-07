import { useEffect, useState } from 'react'
import { QrCode, RefreshCw } from 'lucide-react'
import api from '../../lib/api'

/**
 * Ảnh QR chuyển khoản — tải QUA backend (cùng origin, có token) thay vì nhúng thẳng img.vietqr.io:
 * không bị chặn bởi mạng/extension/PWA, lỗi thì hiện nút "Tải lại" thay vì ảnh vỡ.
 */
export function PaymentQrImage({ amount, className }: { amount: number; className?: string }) {
  const [src, setSrc] = useState('')
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!amount || amount <= 0) { setSrc(''); setState('error'); return }
    let alive = true
    let objUrl = ''
    setState('loading')
    api
      .get('/member/me/payment-qr', { params: { amount }, responseType: 'blob' })
      .then((r) => {
        if (!alive) return
        objUrl = URL.createObjectURL(r.data as Blob)
        setSrc(objUrl)
        setState('ok')
      })
      .catch(() => { if (alive) { setSrc(''); setState('error') } })
    return () => { alive = false; if (objUrl) URL.revokeObjectURL(objUrl) }
  }, [amount, tick])

  const box = className ?? 'h-32 w-32 rounded-xl border-2 border-amber-200 shadow-sm'
  if (state === 'ok' && src) {
    return <img src={src} alt="QR thanh toán" className={`${box} [background:var(--pf-surface)] object-contain`} />
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
