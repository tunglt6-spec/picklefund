import { useEffect, useState } from 'react'
import { QrCode, RefreshCw } from 'lucide-react'
import api from '../../../lib/api'

interface Info { bank: { code: string; account: string; name: string }; contact: string; amount: number; memo: string; months: number; plan: string; planExpiresAt: string | null }

/** Thông tin + QR chuyển khoản gia hạn gói (tài khoản nhận của Super Admin), chọn 1/3/6/12 tháng. */
export function RenewalQrCard() {
  const [months, setMonths] = useState(1)
  const [info, setInfo] = useState<Info | null | undefined>(undefined)
  const [qr, setQr] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    let url = ''
    setInfo(undefined)
    setQr('')
    api.get('/billing/renewal-info', { params: { months } }).then((r) => {
      if (!alive) return
      const d = r.data?.data ?? null
      setInfo(d)
      if (!d) return
      api.get('/billing/renewal-qr', { params: { months }, responseType: 'blob' }).then((q) => {
        if (!alive) return
        const b = q.data as Blob
        if (/^image\//.test(b.type)) { url = URL.createObjectURL(b); setQr(url) }
      }).catch(() => {})
    }).catch(() => { if (alive) setInfo(null) })
    return () => { alive = false; if (url) URL.revokeObjectURL(url) }
  }, [months, tick])

  if (info === null) return null
  const fmt = (n: number) => n.toLocaleString('vi-VN')
  return (
    <div className="pf-glass rounded-xl p-5">
      <div className="mb-3 flex items-center gap-2">
        <QrCode size={18} className="[color:var(--pf-primary-text)]" />
        <h3 className="font-semibold [color:var(--pf-text)]">Thanh toán gia hạn gói qua QR</h3>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {[1, 3, 6, 12].map((m) => (
          <button key={m} type="button" onClick={() => setMonths(m)} aria-pressed={months === m}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${months === m ? 'text-white border-transparent' : '[color:var(--pf-color-muted)] border-[color:var(--pf-border)]'}`}
            style={months === m ? { background: 'var(--pf-primary)' } : undefined}>{m >= 12 ? '1 năm' : `${m} tháng`}</button>
        ))}
      </div>
      {info === undefined ? (
        <p className="text-sm [color:var(--pf-color-muted)]">Đang tải…</p>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-xl border bg-white [border-color:var(--pf-border)]">
            {qr ? <img src={qr} alt="QR chuyển khoản gia hạn" className="h-full w-full rounded-xl object-contain" />
              : <button type="button" onClick={() => setTick((t) => t + 1)} className="inline-flex items-center gap-1 text-xs font-semibold [color:var(--pf-primary-text)]"><RefreshCw size={12} />Tải lại QR</button>}
          </div>
          <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="[color:var(--pf-color-muted)]">Ngân hàng</dt><dd className="font-semibold [color:var(--pf-text)]">{info.bank.code}</dd>
            <dt className="[color:var(--pf-color-muted)]">Số tài khoản</dt><dd className="font-mono font-semibold [color:var(--pf-text)]">{info.bank.account}</dd>
            <dt className="[color:var(--pf-color-muted)]">Chủ tài khoản</dt><dd className="font-semibold [color:var(--pf-text)]">{info.bank.name}</dd>
            <dt className="[color:var(--pf-color-muted)]">Số tiền</dt><dd className="font-bold [color:var(--pf-primary-text)]">{info.amount ? `${fmt(info.amount)} đ` : 'Liên hệ để được báo giá'}</dd>
            <dt className="[color:var(--pf-color-muted)]">Nội dung</dt><dd className="font-mono font-semibold [color:var(--pf-text)]">{info.memo}</dd>
            {info.contact && (<><dt className="[color:var(--pf-color-muted)]">Liên hệ</dt><dd className="[color:var(--pf-text)]">{info.contact}</dd></>)}
          </dl>
        </div>
      )}
      <p className="mt-3 text-xs [color:var(--pf-color-muted)]">Chuyển khoản xong, bấm “Báo đã chuyển khoản” bên dưới để Super Admin xác nhận và gia hạn gói.</p>
    </div>
  )
}
