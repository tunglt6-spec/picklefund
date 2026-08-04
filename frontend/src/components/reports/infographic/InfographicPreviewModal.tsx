import { useState, useRef, useLayoutEffect } from 'react'
import { X, Download, FileText, Share2, Loader2, BarChart3, Users } from 'lucide-react'
import { InfographicOverlayA } from './InfographicOverlayA'
import { InfographicOverlayB } from './InfographicOverlayB'
import type { InfographicReportData } from './infographic.types'
import { exportInfographicAsPng, exportInfographicAsPdf, shareInfographic, canShare, buildFileName } from './infographic.utils'
import toast from 'react-hot-toast'

const ID_A = 'infographic-canvas-a'
const ID_B = 'infographic-canvas-b'

/* Scale preview: overlay gốc rộng 1080 → thu nhỏ vừa modal. Chiều cao overlay biến thiên
   (A cố định 1920; B là hoá đơn cao động theo số TV) → đo chiều cao thật để khung preview
   khớp export 100%, không cắt/không thừa. */
const PREVIEW_SCALE = 0.46
const PREVIEW_W = Math.round(1080 * PREVIEW_SCALE)

interface InfographicPreviewModalProps {
  data: InfographicReportData
  onClose: () => void
}

export function InfographicPreviewModal({ data, onClose }: InfographicPreviewModalProps) {
  const [tab, setTab] = useState<'A' | 'B'>('A')
  const [exporting, setExporting] = useState<'png' | 'pdf' | 'share' | null>(null)

  const activeId = tab === 'A' ? ID_A : ID_B
  const tabLabel = tab === 'A' ? 'TổngQuan' : 'BillTV'

  // Đo chiều cao thật của overlay preview (native size) → set chiều cao khung scale.
  const previewInnerRef = useRef<HTMLDivElement>(null)
  const [previewH, setPreviewH] = useState(Math.round(1920 * PREVIEW_SCALE))
  useLayoutEffect(() => {
    const el = previewInnerRef.current
    if (el) setPreviewH(Math.round(el.scrollHeight * PREVIEW_SCALE))
  }, [tab, data])

  const handleExportPng = async () => {
    setExporting('png')
    try {
      const fileName = buildFileName(data.clubName, `${data.periodLabel}_${tabLabel}`, 'png')
      await exportInfographicAsPng(activeId, fileName)
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
      const fileName = buildFileName(data.clubName, `${data.periodLabel}_${tabLabel}`, 'pdf')
      await exportInfographicAsPdf(activeId, fileName)
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
      const title = `PickleFund_${data.clubName}_${data.periodLabel}_${tabLabel}`
      await shareInfographic(activeId, title)
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
        <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-white font-[700] text-[14px]">Infographic</span>
            <span className="[color:var(--pf-color-muted)] text-[12px] hidden sm:block">· {data.periodLabel}</span>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1">
            <button
              onClick={() => setTab('A')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-[700] transition-all ${tab === 'A' ? 'bg-emerald-600 text-white' : '[color:var(--pf-color-muted)] hover:text-white'}`}
            >
              <BarChart3 size={13} />
              Tổng quan
            </button>
            <button
              onClick={() => setTab('B')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-[700] transition-all ${tab === 'B' ? 'bg-blue-600 text-white' : '[color:var(--pf-color-muted)] hover:text-white'}`}
            >
              <Users size={13} />
              Bill thành viên
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg [color:var(--pf-color-muted)] hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Đóng"
          >
            <X size={17} />
          </button>
        </div>

        {/* ── NGUỒN EXPORT: overlay NATIVE 1080×1920, off-screen, KHÔNG scale ──
            html2canvas capture element theo id này. PHẢI nằm ngoài mọi ancestor transform/zoom,
            nếu không nội dung bị chụp ở kích thước đã scale → thu nhỏ + khoảng trắng (root cause). */}
        <div aria-hidden="true" style={{ position: 'fixed', top: 0, left: '-100000px', width: 1080, height: 1920, overflow: 'hidden', pointerEvents: 'none' }}>
          {tab === 'A'
            ? <InfographicOverlayA data={data} id={ID_A} />
            : <InfographicOverlayB data={data} id={ID_B} />}
        </div>

        {/* ── PREVIEW hiển thị: bản scale RIÊNG (id khác), nội dung y hệt bản export ──
            scale bằng transform + khung ngoài mang kích thước đã scale để chiếm đúng layout. */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-slate-950 py-4 px-2">
          <div style={{ width: PREVIEW_W, height: previewH }} className="mx-auto">
            <div ref={previewInnerRef} style={{ width: 1080, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left' }}>
              {tab === 'A'
                ? <InfographicOverlayA data={data} id={`${ID_A}-preview`} />
                : <InfographicOverlayB data={data} id={`${ID_B}-preview`} />}
            </div>
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
              style={{ background: 'linear-gradient(135deg, #6D5DFB, #7C3AED)' }}
            >
              {exporting === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              Xuất PDF
            </button>

            {canShare() ? (
              <button
                onClick={handleShare}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-[700] text-white disabled:opacity-50 transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #0891B2, #5B4BE8)' }}
              >
                {exporting === 'share' ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                Chia sẻ
              </button>
            ) : (
              <button
                disabled
                title="Trình duyệt hiện không hỗ trợ chia sẻ trực tiếp"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-[700] [color:var(--pf-color-muted)] bg-slate-700 cursor-not-allowed"
              >
                <Share2 size={14} />
                Chia sẻ
              </button>
            )}

            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-[700] [color:var(--pf-color-muted)] bg-slate-700 hover:bg-slate-600 transition-all active:scale-95"
            >
              <X size={14} />
              Đóng
            </button>
          </div>

          {isLoading && (
            <p className="text-center text-[11px] [color:var(--pf-color-muted)] mt-2">
              {exporting === 'png' ? 'Đang xuất ảnh...' : exporting === 'pdf' ? 'Đang tạo PDF...' : 'Đang chuẩn bị chia sẻ...'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
