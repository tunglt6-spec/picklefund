import { useRef, useState } from 'react'
import { Image as ImageIcon, FileText } from 'lucide-react'

/**
 * Nút xuất Ảnh/PDF dạng pill có nhãn — chuẩn SaaS dùng chung cho các màn minigame
 * (BXH, Lịch thi đấu, sơ đồ nhánh). Bọc data-html2canvas-ignore để không lọt vào ảnh xuất.
 * `size='sm'` cho khu vực chật (header sticky mobile).
 */
export function ScheduleExportButtons({ onPng, onPdf, ariaScope, size = 'md' }: {
  onPng?: () => void | Promise<unknown>
  onPdf?: () => void | Promise<unknown>
  ariaScope: string
  size?: 'sm' | 'md'
}) {
  // Handler async → khóa cả cụm nút tới khi xong (chống bấm đúp mở 2 hộp thoại lưu / render 2 lần).
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const wrap = (fn?: () => void | Promise<unknown>) => fn && (async () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try { await fn() } catch (err) { console.error('[export]', err) } finally { busyRef.current = false; setBusy(false) }
  })
  if (!onPng && !onPdf) return null
  // Mobile (sm): nhãn ngắn để không vỡ header sticky. Desktop (md): nhãn đầy đủ "Xuất ảnh/Xuất PDF".
  const compact = size === 'sm'
  const pad = compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'
  const icon = compact ? 13 : 15
  return (
    <div className="flex items-center gap-2 shrink-0" data-html2canvas-ignore="true">
      {onPng && (
        <button onClick={wrap(onPng)} disabled={busy} aria-label={`Xuất ảnh ${ariaScope}`} title="Xuất ảnh"
          className={`inline-flex items-center gap-1.5 rounded-lg font-semibold [background:var(--pf-primary-soft)] [color:var(--pf-primary-text)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:pointer-events-none ${pad}`}>
          <ImageIcon size={icon} /> {compact ? 'Ảnh' : 'Xuất ảnh'}
        </button>
      )}
      {onPdf && (
        <button onClick={wrap(onPdf)} disabled={busy} aria-label={`Xuất PDF ${ariaScope}`} title="Xuất PDF"
          className={`inline-flex items-center gap-1.5 rounded-lg font-semibold border border-[color:var(--pf-border)] [color:var(--pf-color-muted)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)] transition-colors disabled:opacity-50 disabled:pointer-events-none ${pad}`}>
          <FileText size={icon} /> {compact ? 'PDF' : 'Xuất PDF'}
        </button>
      )}
    </div>
  )
}
