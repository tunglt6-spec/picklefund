/**
 * ExportActions — cụm nút xuất CHUẨN SaaS dùng CHUNG toàn app.
 * CO GIÃN TỰ ĐỘNG: mobile hiện nhãn GỌN ("Excel"/"PDF"/"Ảnh") để không chồng chéo header hẹp;
 * từ sm trở lên hiện đầy đủ "Xuất Excel"/"Xuất PDF"/"Xuất ảnh". Luôn có icon + nhãn (không icon-only).
 * Bọc data-html2canvas-ignore để không lọt vào ảnh xuất. Đặt trong PageHeader `actions` hoặc toolbar.
 */
import { useRef, useState } from 'react'
import { FileSpreadsheet, FileText, Image as ImageIcon } from 'lucide-react'
import { ActionButton } from './ActionButton'

/** Nhãn co giãn: mobile chỉ `short`, ≥sm thêm tiền tố "Xuất ". */
function RLabel({ short }: { short: string }) {
  return (
    <>
      <span className="hidden sm:inline">Xuất </span>
      {short}
    </>
  )
}

export function ExportActions({
  onExcel, onPdf, onImage, disabled: disabledProp,
}: {
  onExcel?: () => void | Promise<unknown>
  onPdf?: () => void | Promise<unknown>
  onImage?: () => void | Promise<unknown>
  disabled?: boolean
}) {
  // Handler trả Promise → khoá cả cụm nút tới khi xong (font/render mất vài giây, tránh bấm đúp
  // mở 2 hộp thoại lưu). Handler đồng bộ → không ảnh hưởng.
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const wrap = (fn?: () => void | Promise<unknown>) => fn && (async () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try { await fn() } catch (err) { console.error('[export]', err) } finally { busyRef.current = false; setBusy(false) }
  })
  if (!onExcel && !onPdf && !onImage) return null
  const disabled = disabledProp || busy
  return (
    <div className="flex flex-wrap items-center gap-2" data-html2canvas-ignore="true">
      {onImage && (
        <ActionButton variant="secondary" className="px-3 sm:px-4" icon={<ImageIcon size={16} />} onClick={wrap(onImage)} disabled={disabled} ariaLabel="Xuất ảnh">
          <RLabel short="Ảnh" />
        </ActionButton>
      )}
      {onExcel && (
        <ActionButton variant="secondary" className="px-3 sm:px-4" icon={<FileSpreadsheet size={16} />} onClick={wrap(onExcel)} disabled={disabled} ariaLabel="Xuất Excel">
          <RLabel short="Excel" />
        </ActionButton>
      )}
      {onPdf && (
        <ActionButton variant="secondary" className="px-3 sm:px-4" icon={<FileText size={16} />} onClick={wrap(onPdf)} disabled={disabled} ariaLabel="Xuất PDF">
          <RLabel short="PDF" />
        </ActionButton>
      )}
    </div>
  )
}
