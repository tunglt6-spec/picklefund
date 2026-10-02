/**
 * useExportRunner — bọc MỌI thao tác xuất file (Excel/PDF) cho call site:
 *  • await export + try/catch → toast.success CHỈ sau khi xong, toast.error khi lỗi (lib không toast)
 *  • `busy` (truyền vào ExportActions `disabled`) + khoá ref → chặn bấm đúp mở 2 hộp thoại lưu
 *  • guard rỗng: `empty: true` → báo lỗi, không sinh file rỗng
 */
import { useCallback, useRef, useState } from 'react'
import toast from 'react-hot-toast'

export interface ExportRunOptions {
  /** Thông báo khi xuất xong. */
  success?: string
  /** true → dữ liệu rỗng, không xuất. */
  empty?: boolean
  emptyMsg?: string
}

export function useExportRunner() {
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const run = useCallback(async (fn: () => void | Promise<void>, opts: ExportRunOptions = {}) => {
    if (lock.current) return
    if (opts.empty) {
      toast.error(opts.emptyMsg ?? 'Chưa có dữ liệu để xuất')
      return
    }
    lock.current = true
    setBusy(true)
    try {
      await fn()
      if (opts.success) toast.success(opts.success)
    } catch (err) {
      console.error('[export]', err)
      toast.error('Xuất file thất bại, vui lòng thử lại')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }, [])
  return { busy, run }
}
