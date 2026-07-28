/**
 * ExportActions — cụm nút xuất CHUẨN SaaS dùng CHUNG toàn app.
 * icon + nhãn rõ ("Xuất Excel" / "Xuất PDF" / "Xuất ảnh") — KHÔNG dùng icon-only
 * (icon-only quá nhỏ, khó nhận biết). Đặt trong PageHeader `actions` hoặc toolbar.
 * Chỉ render nút có handler tương ứng. Bọc data-html2canvas-ignore để không lọt vào ảnh xuất.
 */
import { FileSpreadsheet, FileText, Image as ImageIcon } from 'lucide-react'
import { ActionButton } from './ActionButton'

export function ExportActions({
  onExcel, onPdf, onImage, disabled,
  excelLabel = 'Xuất Excel', pdfLabel = 'Xuất PDF', imageLabel = 'Xuất ảnh',
}: {
  onExcel?: () => void
  onPdf?: () => void
  onImage?: () => void
  disabled?: boolean
  excelLabel?: string
  pdfLabel?: string
  imageLabel?: string
}) {
  if (!onExcel && !onPdf && !onImage) return null
  return (
    <div className="flex flex-wrap items-center gap-2" data-html2canvas-ignore="true">
      {onImage && (
        <ActionButton variant="secondary" icon={<ImageIcon size={16} />} onClick={onImage} disabled={disabled}>
          {imageLabel}
        </ActionButton>
      )}
      {onExcel && (
        <ActionButton variant="secondary" icon={<FileSpreadsheet size={16} />} onClick={onExcel} disabled={disabled}>
          {excelLabel}
        </ActionButton>
      )}
      {onPdf && (
        <ActionButton variant="secondary" icon={<FileText size={16} />} onClick={onPdf} disabled={disabled}>
          {pdfLabel}
        </ActionButton>
      )}
    </div>
  )
}
