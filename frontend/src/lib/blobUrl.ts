/**
 * Blob → data URL. Dùng cho <img> vì CSP của app (img-src 'self' data: https:) KHÔNG cho phép blob: —
 * ảnh nạp từ URL.createObjectURL sẽ vỡ (hiện chữ alt), còn data URL thì hợp lệ.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(blob)
  })
}
