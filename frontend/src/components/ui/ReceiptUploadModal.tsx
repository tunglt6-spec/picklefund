import { useState, useRef } from 'react'
import { X, Upload, FileText, Image } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

interface Props {
  expenseId: string
  expenseLabel: string
  onSuccess: (expenseId: string, receiptUrl: string) => void
  onClose: () => void
}

const ALLOWED_EXT = /\.(jpe?g|png|pdf|webp)$/i
const MAX_SIZE = 5 * 1024 * 1024

export function ReceiptUploadModal({ expenseId, expenseLabel, onSuccess, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!ALLOWED_EXT.test(f.name)) { toast.error('Chỉ hỗ trợ JPG, PNG, PDF, WEBP'); return }
    if (f.size > MAX_SIZE) { toast.error('File tối đa 5 MB'); return }
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
      const form = new FormData()
      form.append('file', file)
      const res = await api.patch(`/expenses/${expenseId}/receipt`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const data = res.data?.data ?? res.data
      onSuccess(expenseId, data.receiptUrl)
      toast.success('Đã đính kèm hóa đơn!')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="font-bold text-slate-900 text-sm">Đính Kèm Hóa Đơn</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-500 truncate">Khoản chi: <strong className="text-slate-700">{expenseLabel}</strong></p>

          {/* drop zone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center py-7 gap-2 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
          >
            {preview ? (
              <img src={preview} alt="preview" className="max-h-32 rounded-lg object-contain" />
            ) : file ? (
              <div className="flex flex-col items-center gap-1">
                <FileText size={28} className="text-indigo-400" />
                <span className="text-xs text-slate-600 font-medium">{file.name}</span>
              </div>
            ) : (
              <>
                <Image size={28} className="text-slate-300" />
                <p className="text-xs text-slate-500">Kéo thả hoặc <span className="text-indigo-600 font-semibold">chọn file</span></p>
                <p className="text-[10px] text-slate-400">JPG, PNG, PDF, WEBP · Tối đa 5 MB</p>
              </>
            )}
          </div>
          <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.pdf,.webp" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

          {file && (
            <p className="text-[11px] text-slate-400 text-center">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Hủy
          </button>
          <button onClick={handleUpload} disabled={!file || uploading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}>
            <Upload size={13} />{uploading ? 'Đang upload...' : 'Đính kèm'}
          </button>
        </div>
      </div>
    </div>
  )
}
