import { Image as ImageIcon, FileText } from 'lucide-react'

/**
 * Nút xuất Ảnh/PDF dạng pill có nhãn — chuẩn SaaS dùng chung cho các màn minigame
 * (BXH, Lịch thi đấu, sơ đồ nhánh). Bọc data-html2canvas-ignore để không lọt vào ảnh xuất.
 * `size='sm'` cho khu vực chật (header sticky mobile).
 */
export function ScheduleExportButtons({ onPng, onPdf, ariaScope, size = 'md' }: {
  onPng?: () => void
  onPdf?: () => void
  ariaScope: string
  size?: 'sm' | 'md'
}) {
  if (!onPng && !onPdf) return null
  const pad = size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
  const icon = size === 'sm' ? 12 : 14
  return (
    <div className="flex items-center gap-2 shrink-0" data-html2canvas-ignore="true">
      {onPng && (
        <button onClick={onPng} aria-label={`Tải ảnh ${ariaScope}`} title="Tải ảnh"
          className={`inline-flex items-center gap-1.5 rounded-lg font-semibold [background:var(--pf-primary-soft)] [color:var(--pf-primary)] hover:opacity-90 transition-opacity ${pad}`}>
          <ImageIcon size={icon} /> Ảnh
        </button>
      )}
      {onPdf && (
        <button onClick={onPdf} aria-label={`Xuất PDF ${ariaScope}`} title="Xuất PDF"
          className={`inline-flex items-center gap-1.5 rounded-lg font-semibold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors ${pad}`}>
          <FileText size={icon} /> PDF
        </button>
      )}
    </div>
  )
}
