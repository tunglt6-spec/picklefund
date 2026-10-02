import toast from 'react-hot-toast'

/**
 * Chạy 1 tác vụ xuất file an toàn: await đến khi XONG rồi mới toast.success; lỗi → toast.error
 * (lib export THROW khi lỗi, không tự toast). Trả Promise để ExportActions khoá nút chống bấm đúp.
 */
export async function runExport(
  task: () => Promise<unknown> | unknown,
  successMsg: string,
  errorMsg = 'Xuất file thất bại. Vui lòng thử lại.',
): Promise<boolean> {
  try {
    await task()
    toast.success(successMsg)
    return true
  } catch (err) {
    console.error('[export]', err)
    toast.error(errorMsg)
    return false
  }
}
