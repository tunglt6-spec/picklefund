import { useState, useRef } from 'react'
import { X, Upload, FileText, Image, Camera } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Portal } from './Portal'

interface Props {
  expenseId: string
  expenseLabel: string
  onSuccess: (expenseId: string, receiptUrl: string) => void
  onClose: () => void
}

const ALLOWED_EXT = /\.(jpe?g|png|pdf|webp)$/i
// Ảnh chụp từ camera trên mobile có thể có tên file lạ/không đuôi → nhận theo cả MIME.
const ALLOWED_MIME = /^(image\/(jpe?g|png|webp)|application\/pdf)$/i
// accept dùng MIME (image/*) để iOS/Android mở được Camera + Thư viện ảnh, kèm PDF.
const ACCEPT = 'image/*,application/pdf'
const MAX_SIZE = 5 * 1024 * 1024
// Ảnh (trước khi nén) cho phép tới 25MB — ảnh camera mobile hay 3-12MB, sẽ tự nén xuống.
const MAX_IMAGE_RAW = 25 * 1024 * 1024

/** Nén/thu nhỏ ảnh trước khi upload (ảnh camera mobile rất nặng). PDF/không phải ảnh giữ nguyên.
 *  Cạnh dài tối đa 1920px, JPEG q0.82. Lỗi/không nhỏ hơn → trả file gốc. */
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  try {
    const dataUrl: string = await new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result as string)
      r.onerror = rej
      r.readAsDataURL(file)
    })
    const img: HTMLImageElement = await new Promise((res, rej) => {
      const im = new window.Image()
      im.onload = () => res(im)
      im.onerror = rej
      im.src = dataUrl
    })
    const MAXD = 1920
    let { width, height } = img
    if (width > MAXD || height > MAXD) {
      const scale = Math.min(MAXD / width, MAXD / height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, width, height)
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob(res, 'image/jpeg', 0.82),
    )
    if (!blob || blob.size >= file.size) return file // không nhỏ hơn → giữ gốc
    const name = (file.name || 'receipt').replace(/\.(jpe?g|png|webp)$/i, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    return file
  }
}

export function ReceiptUploadModal({ expenseId, expenseLabel, onSuccess, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    // Chấp nhận nếu hợp lệ theo đuôi HOẶC theo MIME (ảnh camera thường không có đuôi rõ).
    if (!ALLOWED_EXT.test(f.name) && !ALLOWED_MIME.test(f.type)) {
      toast.error('Chỉ hỗ trợ ảnh (JPG, PNG, WEBP) hoặc PDF'); return
    }
    const isImage = f.type.startsWith('image/')
    // Ảnh sẽ được nén trước khi upload → cho phép tới 25MB; PDF/khác giữ giới hạn 5MB.
    if (isImage ? f.size > MAX_IMAGE_RAW : f.size > MAX_SIZE) {
      toast.error(isImage ? 'Ảnh tối đa 25 MB' : 'File tối đa 5 MB'); return
    }
    setFile(f)
    if (f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => setPreview(e.target?.result as string)
      reader.readAsDataURL(f)
    } else {
      setPreview(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const toUpload = await compressImage(file) // ảnh: nén nhỏ; pdf: giữ nguyên
      if (toUpload.size > MAX_SIZE) {
        toast.error('File vẫn > 5MB sau khi nén — chọn ảnh/tệp nhỏ hơn.')
        setUploading(false)
        return
      }
      const form = new FormData()
      form.append('file', toUpload)
      // KHÔNG tự set Content-Type: để axios tự thêm boundary của multipart/form-data.
      const res = await api.patch(`/expenses/${expenseId}/receipt`, form, {
        headers: { 'Content-Type': undefined },
      })
      const data = res.data?.data ?? res.data
      onSuccess(expenseId, data.receiptUrl)
      toast.success('Đã đính kèm hóa đơn!')
    } catch (e: any) {
      const st = e?.response?.status
      const msg =
        st === 413
          ? 'Ảnh vượt giới hạn máy chủ. Thử lại (đã tự nén) hoặc chọn ảnh nhỏ hơn.'
          : (e?.response?.data?.message ??
            (e?.message?.toLowerCase?.().includes('network')
              ? 'Lỗi mạng khi upload — kiểm tra kết nối rồi thử lại.'
              : 'Lỗi upload'))
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Portal>
    {/* z cao hơn drawer chi tiết (z-50) để không bị đè/mờ khi mở từ trong drawer */}
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)' }}>
      <div className="[background:var(--pf-surface)] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--pf-border)]">
          <p className="font-bold [color:var(--pf-text)] text-sm">Đính Kèm Hóa Đơn</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs [color:var(--pf-color-muted)] truncate">Khoản chi: <strong className="[color:var(--pf-text)]">{expenseLabel}</strong></p>

          {/* drop zone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-[color:var(--pf-border)] rounded-xl flex flex-col items-center justify-center py-7 gap-2 cursor-pointer hover:[border-color:var(--pf-primary)] hover:[background:var(--pf-primary-soft)] transition-colors"
          >
            {preview ? (
              <img src={preview} alt="preview" className="max-h-32 rounded-lg object-contain" />
            ) : file ? (
              <div className="flex flex-col items-center gap-1">
                <FileText size={28} className="[color:var(--pf-primary)]" />
                <span className="text-xs [color:var(--pf-color-muted)] font-medium">{file.name}</span>
              </div>
            ) : (
              <>
                <Image size={28} className="[color:var(--pf-color-muted)]" />
                <p className="text-xs [color:var(--pf-color-muted)]">Kéo thả hoặc <span className="[color:var(--pf-primary)] font-semibold">chọn file</span></p>
                <p className="text-[10px] [color:var(--pf-color-muted)]">JPG, PNG, PDF, WEBP · Tối đa 5 MB</p>
              </>
            )}
          </div>
          {/* Chọn từ thư viện ảnh / trình duyệt tệp (mobile: gallery + Files; desktop: file picker) */}
          <input ref={inputRef} type="file" accept={ACCEPT} className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
          {/* Chụp ảnh trực tiếp bằng camera (capture) — mobile mở thẳng camera; desktop bỏ qua capture */}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />

          {/* Nút thao tác nhanh — rõ ràng trên mobile (Chụp ảnh vs Chọn ảnh/tệp) */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => cameraRef.current?.click()}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[color:var(--pf-border)] text-sm font-semibold [color:var(--pf-text)] hover:[background:var(--pf-surface-muted)] transition-colors">
              <Camera size={15} className="[color:var(--pf-primary)]" />Chụp ảnh
            </button>
            <button type="button" onClick={() => inputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[color:var(--pf-border)] text-sm font-semibold [color:var(--pf-text)] hover:[background:var(--pf-surface-muted)] transition-colors">
              <Image size={15} className="[color:var(--pf-primary)]" />Chọn ảnh / tệp
            </button>
          </div>

          {file && (
            <p className="text-[11px] [color:var(--pf-color-muted)] text-center">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[color:var(--pf-border)] text-sm font-semibold [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] transition-colors">
            Hủy
          </button>
          <button onClick={handleUpload} disabled={!file || uploading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors"
            style={{ background: 'var(--pf-primary)' }}>
            <Upload size={13} />{uploading ? 'Đang upload...' : 'Đính kèm'}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  )
}
