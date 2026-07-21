import { useState } from 'react'

/**
 * useBulkSelection — quản lý trạng thái chọn nhiều dòng cho bảng (chọn để xóa hàng loạt).
 * `items` là DANH SÁCH ĐÃ LỌC (mọi trang) để "chọn tất cả" áp cho cả nhóm đang lọc.
 */
export function useBulkSelection<T>(items: T[], getId: (item: T) => string) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const ids = items.map(getId)

  const toggleOne = (id: string) =>
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id))
  const someSelected = selectedIds.size > 0
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(ids))
  const clear = () => setSelectedIds(new Set())
  /** Bỏ các id đã xử lý (vd sau khi xóa thành công) khỏi vùng chọn. */
  const remove = (removed: Iterable<string>) =>
    setSelectedIds((prev) => {
      const n = new Set(prev)
      for (const r of removed) n.delete(r)
      return n
    })

  return { selectedIds, setSelectedIds, toggleOne, toggleAll, allSelected, someSelected, clear, remove }
}
