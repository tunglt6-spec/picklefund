import { useState } from 'react'
import { X, Download, FileText, Share2, Loader2, Sparkles } from 'lucide-react'
import { PickleFundInfographicTemplate } from './PickleFundInfographicTemplate'
import type { InfographicReportData } from './infographic.types'
import { exportInfographicAsPng, exportInfographicAsPdf, shareInfographic, canShare, buildFileName } from './infographic.utils'
import toast from 'react-hot-toast'

const INFOGRAPHIC_ID = 'infographic-export-canvas'

interface InfographicPreviewModalProps {
  data: InfographicReportData
  onClose: () => void
}

export function InfographicPreviewModal({ data, onClose }: InfographicPreviewModalProps) {
  const [exporting, setExporting] = useState<'png' | 'pdf' | 'share' | null>(null)

  const handleExportPng = async () => {
    setExporting('png')
    try {
      const fileName = buildFileName(data.clubName, data.periodLabel, 'png')
      await exportInfographicAsPng(INFOGRAPHIC_ID, fileName)
      toast.success('Đã tải infographic thành công!')
    } catch {
      toast.error('Chưa thể xuất ảnh. Vui lòng thử lại.')
    } finally {
      setExporting(null)
    }
  }

  const handleExportPdf = async () => {
    setExporting('pdf')
    try {
      const fileName = buildFileName(data.clubName, data.periodLabel, 'pdf')
      await exportInfographicAsPdf(INFOGRAPHIC_ID, fileName)
      toast.success('Đã xuất PDF thành công!')
    } catch {
      toast.error('Chưa thể xuất PDF. Vui lòng thử lại.')
    } finally {
      setExporting(null)
    }
  }

  const handleShare = async () => {
    setExporting('share')
    try {
      const title = `PickleFund_${data.clubName}_${data.periodLabel}`
      await shareInfographic(INFOGRAPHIC_ID, title)
    } catch {
      toast.error('Chưa thể chia sẻ. Vui lòng thử lại.')
    } finally {
      setExporting(null)
    }
  }

  const isLoading = exporting !== null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative flex flex-col w-full h-full max-w-5xl max-h-screen md:max-h-[96vh] md:rounded-2xl bg-slate-900 shadow-2xl overflow-hidden">

        {/* Top bar */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400" />
            <span className="text-white font-[700] text-[15px]">Infographic</span>
            <span className="text-slate-400 text-[12px]">· {data.periodLabel}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable preview — scale down 1080px infographic to fit */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-slate-950 py-4 px-2">
          <div
            style={{
              width: 1080,
              transformOrigin: 'top center',
              transform: 'scale(var(--pf-preview-scale, 0.5))',
              marginBottom: 'calc((var(--pf-preview-scale, 0.5) - 1) * 100%)',
            }}
            className="[--pf-preview-scale:0.42] sm:[--pf-preview-scale:0.5] md:[--pf-preview-scale:0.56] mx-auto"
          >
            <PickleFundInfographicTemplate data={data} id={INFOGRAPHIC_ID} />
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="shrink-0 bg-slate-800 border-t border-slate-700 px-4 py-3">
          <div className="flex gap-2 flex-wrap justify-center">
            <button
              onClick={handleExportPng}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-[700] text-white disabled:opacity-50 transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}
            >
              {exporting === 'png' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Tải PNG
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-[700] text-white disabled:opacity-50 transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
            >
              {exporting === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              Xuất PDF
            </button>

            {canShare() ? (
              <button
                onClick={handleShare}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-[700] text-white disabled:opacity-50 transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #0891B2, #06B6D4)' }}
              >
                {exporting === 'share' ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                Chia sẻ
              </button>
            ) : (
              <button
                disabled
                title="Trình duyệt hiện không hỗ trợ chia sẻ trực tiếp"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-[700] text-slate-500 bg-slate-700 cursor-not-allowed"
              >
                <Share2 size={14} />
                Chia sẻ
              </button>
            )}

            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-[700] text-slate-300 bg-slate-700 hover:bg-slate-600 transition-all active:scale-95"
            >
              <X size={14} />
              Đóng
            </button>
          </div>

          {isLoading && (
            <p className="text-center text-[11px] text-slate-400 mt-2">
              {exporting === 'png' ? 'Đang xuất ảnh...' : exporting === 'pdf' ? 'Đang tạo PDF...' : 'Đang chuẩn bị chia sẻ...'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
