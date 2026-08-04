import { Trash2 } from 'lucide-react'

/**
 * BulkActionBar — thanh thao tác hàng loạt (hiện khi có dòng được chọn). Dùng chung cho các
 * bảng có xóa nhiều: Kỳ Quỹ / Thu / Chi / Thành viên. Chỉ render cho admin/thủ quỹ (caller gate).
 */
export function BulkActionBar({
  count,
  onClear,
  onDelete,
  deleting,
  noun = 'mục',
}: {
  count: number
  onClear: () => void
  onDelete: () => void
  deleting?: boolean
  noun?: string
}) {
  if (count === 0) return null
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-red-50 border-b border-red-100">
      <span className="text-sm font-medium text-red-700">Đã chọn {count} {noun}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={onClear}
          className="px-3 py-1.5 rounded-lg text-sm font-medium [color:var(--pf-color-muted)] border border-[color:var(--pf-border)] hover:[background:var(--pf-surface-muted)]"
        >Bỏ chọn</button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
        ><Trash2 size={14} />{deleting ? 'Đang xóa...' : `Xóa ${count} ${noun}`}</button>
      </div>
    </div>
  )
}

/** Ô checkbox chuẩn cho bảng (đồng bộ style tím). */
export function RowCheckbox({
  checked,
  onChange,
  label,
  indeterminate,
}: {
  checked: boolean
  onChange: () => void
  label: string
  indeterminate?: boolean
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      className="h-4 w-4 rounded border-slate-300 [accent-color:var(--pf-primary)] cursor-pointer align-middle"
      checked={checked}
      ref={(el) => { if (el) el.indeterminate = !!indeterminate }}
      onChange={onChange}
    />
  )
}
