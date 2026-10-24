import { useState, type ReactEventHandler } from 'react'
import { QrCode, RefreshCw } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { buildVietQrPayload } from '../../lib/vietqr'
import { useIsMobile } from '../../hooks/useIsMobile'

interface Props {
  /** Ảnh QR từ img.vietqr.io. */
  url: string
  alt: string
  /** Lớp kích thước/viền như `<img>` gốc (giữ nguyên bố cục). */
  className: string
  /** Thông tin để tự sinh QR tại máy khi ảnh không tải được (chỉ ngân hàng đã đối chiếu BIN). */
  bank?: { bank_code?: string; bank_account_number?: string } | null
  amount?: number
  memo?: string
  /** Hành vi lỗi của bản desktop (giữ nguyên như trước đây). */
  desktopOnError?: ReactEventHandler<HTMLImageElement>
}

/**
 * Ảnh QR chuyển khoản. Desktop/tablet ≥1024px: `<img>` y như cũ. Mobile (<1024px): có khung chờ tải, khi lỗi tự dựng
 * QR tại máy (nếu hỗ trợ ngân hàng) hoặc hiện thông báo + nút "Thử lại" — không để biểu tượng ảnh hỏng.
 */
export function VietQrImage({ url, alt, className, bank, amount = 0, memo = '', desktopOnError }: Props) {
  const mobile = useIsMobile(1024)
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [tick, setTick] = useState(0)

  if (!mobile) return <img src={url} alt={alt} className={className} onError={desktopOnError} />

  const payload = bank?.bank_code && bank.bank_account_number
    ? buildVietQrPayload(bank.bank_code, bank.bank_account_number, amount, memo)
    : null
  const src = tick ? `${url}${url.includes('?') ? '&' : '?'}_r=${tick}` : url

  if (state === 'error') {
    if (payload) {
      return (
        <div className={`${className} flex flex-col items-center justify-center gap-1 bg-white p-2`}>
          <QRCodeSVG value={payload} size={256} level="M" className="h-full w-full" />
          <span className="sr-only">Mã QR tạo trên thiết bị</span>
        </div>
      )
    }
    return (
      <div role="status" className={`${className} flex flex-col items-center justify-center gap-2 p-2 text-center [background:var(--pf-surface-muted)]`}>
        <QrCode size={24} className="[color:var(--pf-color-muted)]" aria-hidden />
        <p className="text-xs [color:var(--pf-color-muted)]">Không tải được mã QR</p>
        <button
          type="button"
          onClick={() => { setState('loading'); setTick((t) => t + 1) }}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold [color:var(--pf-primary-text)] [border-color:var(--pf-border)] [background:var(--pf-surface)]"
        >
          <RefreshCw size={13} aria-hidden /> Thử lại
        </button>
      </div>
    )
  }
  return (
    <div className="relative inline-block">
      {state === 'loading' && (
        <div className={`${className} absolute inset-0 flex animate-pulse items-center justify-center [background:var(--pf-surface-muted)]`} aria-hidden>
          <QrCode size={28} className="[color:var(--pf-color-muted)]" />
        </div>
      )}
      <img
        key={tick}
        src={src}
        alt={alt}
        className={`${className} ${state === 'loading' ? 'opacity-0' : ''}`}
        onLoad={() => setState('ok')}
        onError={() => setState('error')}
      />
    </div>
  )
}
