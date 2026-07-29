/**
 * ExportActions — cụm nút xuất CHUẨN SaaS dùng CHUNG toàn app.
 * CO GIÃN TỰ ĐỘNG: mobile hiện nhãn GỌN ("Excel"/"PDF"/"Ảnh") để không chồng chéo header hẹp;
 * từ sm trở lên hiện đầy đủ "Xuất Excel"/"Xuất PDF"/"Xuất ảnh". Luôn có icon + nhãn (không icon-only).
 * Bọc data-html2canvas-ignore để không lọt vào ảnh xuất. Đặt trong PageHeader `actions` hoặc toolbar.
 */
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
  onExcel, onPdf, onImage, disabled,
}: {
  onExcel?: () => void
  onPdf?: () => void
  onImage?: () => void
  disabled?: boolean
}) {
  if (!onExcel && !onPdf && !onImage) return null
  return (
    <div className="flex flex-wrap items-center gap-2" data-html2canvas-ignore="true">
      {onImage && (
        <ActionButton variant="secondary" className="px-3 sm:px-4" icon={<ImageIcon size={16} />} onClick={onImage} disabled={disabled} ariaLabel="Xuất ảnh">
          <RLabel short="Ảnh" />
        </ActionButton>
      )}
      {onExcel && (
        <ActionButton variant="secondary" className="px-3 sm:px-4" icon={<FileSpreadsheet size={16} />} onClick={onExcel} disabled={disabled} ariaLabel="Xuất Excel">
          <RLabel short="Excel" />
        </ActionButton>
      )}
      {onPdf && (
        <ActionButton variant="secondary" className="px-3 sm:px-4" icon={<FileText size={16} />} onClick={onPdf} disabled={disabled} ariaLabel="Xuất PDF">
          <RLabel short="PDF" />
        </ActionButton>
      )}
    </div>
  )
}
