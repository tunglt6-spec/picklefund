/**
 * ExportActions — cụm nút xuất CHUẨN SaaS dùng CHUNG toàn app.
 * Mobile gom định dạng vào một menu; desktop giữ các nút xuất riêng.
 * Bọc data-html2canvas-ignore để không lọt vào ảnh xuất. Đặt trong PageHeader `actions` hoặc toolbar.
 */
import { useRef, useState } from 'react'
import { FileSpreadsheet, FileText, Image as ImageIcon, Download } from '../icons/mobileLucide'
import { ActionButton } from './ActionButton'
import { ActionMenu, type ActionMenuItem } from './ActionMenu'

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
  onExcel, onPdf, onImage, disabled: disabledProp, mobileItems = [],
}: {
  onExcel?: () => void | Promise<unknown>
  onPdf?: () => void | Promise<unknown>
  onImage?: () => void | Promise<unknown>
  disabled?: boolean
  /** Additional mobile export formats; desktop owns its existing extra buttons. */
  mobileItems?: ActionMenuItem[]
}) {
  // Handler trả Promise → khóa cả cụm nút tới khi xong (font/render mất vài giây, tránh bấm đúp
  // mở 2 hộp thoại lưu). Handler đồng bộ → không ảnh hưởng.
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const wrap = (fn?: () => void | Promise<unknown>) => fn && (async () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try { await fn() } catch (err) { console.error('[export]', err) } finally { busyRef.current = false; setBusy(false) }
  })
  if (!onExcel && !onPdf && !onImage && !mobileItems.length) return null
  const disabled = disabledProp || busy
  const items: ActionMenuItem[] = [
    ...(onExcel ? [{ key: 'excel', label: 'Xuất Excel', icon: <FileSpreadsheet size={16} />, onClick: wrap(onExcel)!, disabled }] : []),
    ...(onPdf ? [{ key: 'pdf', label: 'Xuất PDF', icon: <FileText size={16} />, onClick: wrap(onPdf)!, disabled }] : []),
    ...(onImage ? [{ key: 'image', label: 'Xuất ảnh', icon: <ImageIcon size={16} />, onClick: wrap(onImage)!, disabled }] : []),
    ...mobileItems.map(item => ({ ...item, disabled: item.disabled || busy })),
  ]
  return (
    <div data-html2canvas-ignore="true">
    <ActionMenu label="Xuất báo cáo" triggerIcon={<Download size={16} aria-hidden />} items={items} />
    <div className="hidden lg:flex flex-wrap items-center gap-2">
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
    </div>
  )
}
