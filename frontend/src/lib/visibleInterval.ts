/** setInterval chỉ chạy khi tab đang hiển thị (tab ẩn không tốn request). Trả về hàm hủy. */
export function visibleInterval(fn: () => void, ms: number): () => void {
  const id = setInterval(() => { if (document.visibilityState === 'visible') fn() }, ms)
  return () => clearInterval(id)
}
