import { useState } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import api from '../../lib/api'
import toast from 'react-hot-toast'

/**
 * Import toàn bộ dữ liệu CLB từ 1 file Excel nhiều sheet — dùng khi CLB mới
 * thành lập cần backfill dữ liệu quá khứ (Thành viên/Kỳ Quỹ/Lịch sinh hoạt/
 * Đăng ký/Điểm danh/Thu-Chi quỹ) thay vì nhập tay từng màn. Gọi
 * `POST /bulk-import` (bulk-import.module.ts, xử lý best-effort per-row —
 * lỗi 1 dòng không chặn dòng khác, trả báo cáo created/matched/errors).
 */

interface SectionResult {
  created: number
  matched?: number
  errors: { row: number; error: string }[]
}

interface ImportResult {
  members: SectionResult
  fundPeriods: SectionResult
  sessions: SectionResult
  registrations: SectionResult
  attendance: SectionResult
  contributions: SectionResult
  expenses: SectionResult
}

interface ParsedData {
  members: Record<string, unknown>[]
  fundPeriods: Record<string, unknown>[]
  sessions: Record<string, unknown>[]
  registrations: Record<string, unknown>[]
  attendance: Record<string, unknown>[]
  contributions: Record<string, unknown>[]
  expenses: Record<string, unknown>[]
}

const SECTION_LABELS: Record<keyof ImportResult, string> = {
  members: 'Thành viên',
  fundPeriods: 'Kỳ Quỹ',
  sessions: 'Lịch sinh hoạt',
  registrations: 'Đăng ký buổi',
  attendance: 'Điểm danh',
  contributions: 'Thu quỹ',
  expenses: 'Chi quỹ',
}

const ALLOCATION_RULE_MAP: Record<string, string> = {
  'chia đều': 'EQUAL',
  'theo lượt tham gia': 'ATTENDANCE',
  'người có mặt': 'PRESENT_ONLY',
  'quỹ': 'FUND_ONLY',
  'không phân bổ': 'FUND_ONLY',
}
const EXPENSE_STATUS_MAP: Record<string, string> = {
  'chờ duyệt': 'pending',
  'đã duyệt': 'approved',
  'đã thanh toán': 'paid',
  'từ chối': 'rejected',
}

function s(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}
function dateStr(row: Record<string, unknown>, ...keys: string[]): string {
  // Excel với cellDates:true có thể trả Date object cho cột ngày — phải kiểm tra
  // TRƯỚC khi stringify (String(Date) ra "Wed Jan 03 2024..." chứ không phải ISO).
  for (const k of keys) {
    const v = row[k]
    if (v instanceof Date) return v.toISOString().slice(0, 10)
  }
  const v = s(row, ...keys)
  return v ? v.slice(0, 10) : ''
}
function num(row: Record<string, unknown>, ...keys: string[]): number {
  const v = s(row, ...keys)
  if (!v) return 0
  // Bỏ dấu phân cách nghìn kiểu VN ("150.000" hoặc "150,000") trước khi parse số.
  return Number(v.replace(/[.,]/g, '')) || 0
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new()

  const guide = XLSX.utils.aoa_to_sheet([
    ['HƯỚNG DẪN NHẬP DỮ LIỆU HÀNG LOẠT — PickleFund'],
    [''],
    ['Dùng khi CLB mới thành lập cần nhập lại dữ liệu quá khứ (thay vì nhập tay từng buổi/từng khoản thu).'],
    ['Điền dữ liệu vào các sheet bên dưới, giữ nguyên tên cột (dòng 1). Có thể để trống sheet không cần dùng.'],
    [''],
    ['THỨ TỰ XỬ LÝ (quan trọng — Tên kỳ / Họ và tên phải khớp CHÍNH XÁC giữa các sheet):'],
    ['1. Thành viên — tạo mới thành viên (bỏ qua nếu tên đã tồn tại trong CLB).'],
    ['2. Kỳ Quỹ — tạo mới kỳ quỹ (bỏ qua nếu Tên kỳ đã tồn tại).'],
    ['3. Lịch sinh hoạt — tạo buổi chơi, PHẢI tham chiếu đúng "Tên kỳ" ở sheet Kỳ Quỹ.'],
    ['4. Đăng ký buổi — PHẢI tham chiếu đúng Tên kỳ + Ngày buổi + Họ và tên đã có.'],
    ['5. Điểm danh — tương tự Đăng ký buổi, thêm cột Trạng thái (Có mặt / Vắng).'],
    ['6. Thu quỹ — khoản đóng góp của thành viên cho 1 kỳ quỹ.'],
    ['7. Chi quỹ — khoản chi từ 1 kỳ quỹ (vd. tiền sân).'],
    [''],
    ['Ngày tháng: định dạng YYYY-MM-DD (vd. 2024-01-15). Số tiền: chỉ nhập số, không ký hiệu đ/VNĐ.'],
    ['Sau khi điền xong, quay lại app > Kỳ Quỹ > "Nhập dữ liệu CLB mới" > tải file này lên.'],
  ])
  guide['!cols'] = [{ wch: 100 }]
  XLSX.utils.book_append_sheet(wb, guide, 'Hướng dẫn')

  const members = XLSX.utils.aoa_to_sheet([
    ['Họ và tên', 'Số điện thoại', 'Email', 'Ngày gia nhập (YYYY-MM-DD)', 'Ghi chú'],
    ['Nguyễn Văn A', '0901234567', '', '2024-01-01', ''],
  ])
  members['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 22 }, { wch: 20 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, members, 'Thành viên')

  const periods = XLSX.utils.aoa_to_sheet([
    ['Tên kỳ', 'Loại quỹ (Chung/Phụ)', 'Ngày bắt đầu (YYYY-MM-DD)', 'Ngày kết thúc (YYYY-MM-DD)', 'Mức đóng/người (VNĐ)', 'Số buổi dự kiến', 'Ghi chú'],
    ['Tháng 1_2024', 'Chung', '2024-01-01', '2024-01-31', 150000, 5, ''],
  ])
  periods['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 15 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, periods, 'Kỳ Quỹ')

  const sessions = XLSX.utils.aoa_to_sheet([
    ['Tên kỳ', 'Ngày buổi (YYYY-MM-DD)', 'Giờ bắt đầu (HH:mm)', 'Giờ kết thúc (HH:mm)', 'Tiền sân (VNĐ)', 'Địa điểm', 'Ghi chú'],
    ['Tháng 1_2024', '2024-01-03', '18:00', '20:00', 750000, '', ''],
  ])
  sessions['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, sessions, 'Lịch sinh hoạt')

  const registrations = XLSX.utils.aoa_to_sheet([
    ['Tên kỳ', 'Ngày buổi (YYYY-MM-DD)', 'Họ và tên'],
    ['Tháng 1_2024', '2024-01-03', 'Nguyễn Văn A'],
  ])
  registrations['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 25 }]
  XLSX.utils.book_append_sheet(wb, registrations, 'Đăng ký buổi')

  const attendance = XLSX.utils.aoa_to_sheet([
    ['Tên kỳ', 'Ngày buổi (YYYY-MM-DD)', 'Họ và tên', 'Trạng thái (Có mặt/Vắng)'],
    ['Tháng 1_2024', '2024-01-03', 'Nguyễn Văn A', 'Có mặt'],
  ])
  attendance['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 25 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, attendance, 'Điểm danh')

  const contributions = XLSX.utils.aoa_to_sheet([
    ['Tên kỳ', 'Họ và tên', 'Số tiền (VNĐ)', 'Ngày đóng (YYYY-MM-DD)', 'Phương thức', 'Đã xác nhận (Có/Không)', 'Ghi chú'],
    ['Tháng 1_2024', 'Nguyễn Văn A', 150000, '2024-01-01', 'bank_transfer', 'Có', ''],
  ])
  contributions['!cols'] = [{ wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 22 }, { wch: 15 }, { wch: 20 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, contributions, 'Thu quỹ')

  const expenses = XLSX.utils.aoa_to_sheet([
    ['Tên kỳ', 'Nội dung', 'Số tiền (VNĐ)', 'Ngày chi (YYYY-MM-DD)', 'Quy tắc phân bổ', 'Trạng thái'],
    ['Tháng 1_2024', 'Tiền sân cố định (5 buổi × 750.000đ)', 3750000, '2024-01-05', 'Chia đều', 'Đã thanh toán'],
  ])
  expenses['!cols'] = [{ wch: 18 }, { wch: 35 }, { wch: 15 }, { wch: 22 }, { wch: 18 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, expenses, 'Chi quỹ')

  XLSX.writeFile(wb, 'mau_nhap_du_lieu_clb.xlsx')
}

function parseWorkbook(wb: XLSX.WorkBook): ParsedData {
  const sheet = (name: string) => {
    const ws = wb.Sheets[name]
    if (!ws) return []
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
  }

  const members = sheet('Thành viên').filter(r => s(r, 'Họ và tên')).map(r => ({
    fullName: s(r, 'Họ và tên'),
    phone: s(r, 'Số điện thoại') || undefined,
    email: s(r, 'Email') || undefined,
    joinDate: dateStr(r, 'Ngày gia nhập (YYYY-MM-DD)', 'Ngày gia nhập') || undefined,
    notes: s(r, 'Ghi chú') || undefined,
  }))

  const fundPeriods = sheet('Kỳ Quỹ').filter(r => s(r, 'Tên kỳ')).map(r => ({
    name: s(r, 'Tên kỳ'),
    type: s(r, 'Loại quỹ (Chung/Phụ)', 'Loại quỹ').toLowerCase().includes('phụ') ? 'game' : 'chung',
    startDate: dateStr(r, 'Ngày bắt đầu (YYYY-MM-DD)', 'Ngày bắt đầu'),
    endDate: dateStr(r, 'Ngày kết thúc (YYYY-MM-DD)', 'Ngày kết thúc'),
    contributionAmount: num(r, 'Mức đóng/người (VNĐ)', 'Mức đóng/người'),
    totalSessions: num(r, 'Số buổi dự kiến') || undefined,
    notes: s(r, 'Ghi chú') || undefined,
  }))

  const sessions = sheet('Lịch sinh hoạt').filter(r => s(r, 'Tên kỳ') && s(r, 'Ngày buổi (YYYY-MM-DD)', 'Ngày buổi')).map(r => ({
    periodName: s(r, 'Tên kỳ'),
    sessionDate: dateStr(r, 'Ngày buổi (YYYY-MM-DD)', 'Ngày buổi'),
    startTime: s(r, 'Giờ bắt đầu (HH:mm)', 'Giờ bắt đầu') || undefined,
    endTime: s(r, 'Giờ kết thúc (HH:mm)', 'Giờ kết thúc') || undefined,
    courtFee: num(r, 'Tiền sân (VNĐ)', 'Tiền sân'),
    courtName: s(r, 'Địa điểm') || undefined,
    notes: s(r, 'Ghi chú') || undefined,
  }))

  const registrations = sheet('Đăng ký buổi').filter(r => s(r, 'Tên kỳ') && s(r, 'Họ và tên')).map(r => ({
    periodName: s(r, 'Tên kỳ'),
    sessionDate: dateStr(r, 'Ngày buổi (YYYY-MM-DD)', 'Ngày buổi'),
    memberName: s(r, 'Họ và tên'),
  }))

  const attendance = sheet('Điểm danh').filter(r => s(r, 'Tên kỳ') && s(r, 'Họ và tên')).map(r => ({
    periodName: s(r, 'Tên kỳ'),
    sessionDate: dateStr(r, 'Ngày buổi (YYYY-MM-DD)', 'Ngày buổi'),
    memberName: s(r, 'Họ và tên'),
    status: s(r, 'Trạng thái (Có mặt/Vắng)', 'Trạng thái').toLowerCase().includes('vắng') ? 'ABSENT' : 'PRESENT',
  }))

  const contributions = sheet('Thu quỹ').filter(r => s(r, 'Tên kỳ') && s(r, 'Họ và tên')).map(r => ({
    periodName: s(r, 'Tên kỳ'),
    memberName: s(r, 'Họ và tên'),
    amount: num(r, 'Số tiền (VNĐ)', 'Số tiền'),
    paidAt: dateStr(r, 'Ngày đóng (YYYY-MM-DD)', 'Ngày đóng'),
    paymentMethod: s(r, 'Phương thức') || undefined,
    isConfirmed: s(r, 'Đã xác nhận (Có/Không)', 'Đã xác nhận').toLowerCase() === 'có',
    notes: s(r, 'Ghi chú') || undefined,
  }))

  const expenses = sheet('Chi quỹ').filter(r => s(r, 'Tên kỳ') && s(r, 'Nội dung')).map(r => {
    const ruleRaw = s(r, 'Quy tắc phân bổ').toLowerCase()
    const statusRaw = s(r, 'Trạng thái').toLowerCase()
    return {
      periodName: s(r, 'Tên kỳ'),
      description: s(r, 'Nội dung'),
      amount: num(r, 'Số tiền (VNĐ)', 'Số tiền'),
      expenseDate: dateStr(r, 'Ngày chi (YYYY-MM-DD)', 'Ngày chi'),
      allocationRule: ALLOCATION_RULE_MAP[ruleRaw] || undefined,
      status: EXPENSE_STATUS_MAP[statusRaw] || undefined,
    }
  })

  return { members, fundPeriods, sessions, registrations, attendance, contributions, expenses }
}

const emptyParsed: ParsedData = { members: [], fundPeriods: [], sessions: [], registrations: [], attendance: [], contributions: [], expenses: [] }

export function BulkImportModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [parsed, setParsed] = useState<ParsedData>(emptyParsed)
  const [fileError, setFileError] = useState('')
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set())

  const reset = () => {
    setParsed(emptyParsed); setFileError(''); setFileName(''); setResult(null); setExpandedErrors(new Set())
  }

  const totalRows = Object.values(parsed).reduce((sum, rows) => sum + rows.length, 0)

  const handleFile = (file: File) => {
    setFileError(''); setResult(null); setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array', cellDates: true })
        const data = parseWorkbook(wb)
        const total = Object.values(data).reduce((sum, rows) => sum + rows.length, 0)
        if (total === 0) { setFileError('File không có dữ liệu hợp lệ ở sheet nào. Kiểm tra lại tên sheet/tên cột theo file mẫu.'); return }
        setParsed(data)
      } catch {
        setFileError('Không thể đọc file. Vui lòng dùng đúng file mẫu .xlsx.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const res = await api.post('/bulk-import', parsed)
      const r = res.data?.data as ImportResult
      setResult(r)
      const totalCreated = Object.values(r).reduce((sum, sec) => sum + sec.created, 0)
      if (totalCreated > 0) { toast.success(`Đã nhập ${totalCreated} bản ghi`); onImported() }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Nhập dữ liệu thất bại')
    } finally {
      setLoading(false)
    }
  }

  const toggleErrors = (key: string) => {
    setExpandedErrors(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); reset() }}
      title="Nhập dữ liệu CLB mới (Excel)"
      subtitle="Backfill hàng loạt: Thành viên, Kỳ Quỹ, Lịch sinh hoạt, Đăng ký, Điểm danh, Thu-Chi quỹ"
      size="xl"
      footer={
        result ? (
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={reset}>Nhập file khác</Button>
            <Button onClick={() => { onClose(); reset() }}>Đóng</Button>
          </div>
        ) : (
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { onClose(); reset() }}>Hủy</Button>
            <Button disabled={totalRows === 0 || loading} onClick={handleConfirm}>
              {loading ? 'Đang nhập...' : `Xác nhận nhập${totalRows > 0 ? ` (${totalRows} dòng)` : ''}`}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        {!result && (
          <>
            <button
              onClick={downloadTemplate}
              className="w-full flex items-center justify-center gap-2 rounded-xl border [border-color:var(--pf-primary-soft)] [background:var(--pf-primary-soft)] [color:var(--pf-primary)] py-2.5 text-sm font-semibold hover:opacity-90"
            >
              <Download size={15} />Tải file mẫu (7 sheet + hướng dẫn)
            </button>

            <div
              className="border-2 border-dashed border-[color:var(--pf-border)] rounded-xl flex flex-col items-center justify-center py-8 gap-2 cursor-pointer hover:[border-color:var(--pf-primary)]"
              onClick={() => document.getElementById('bulk-import-file')?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            >
              <Upload size={24} className="[color:var(--pf-color-muted)]" />
              <p className="text-sm [color:var(--pf-color-muted)]">Kéo thả hoặc <span className="[color:var(--pf-primary)] font-semibold">chọn file đã điền</span></p>
              <p className="text-xs [color:var(--pf-color-muted)]">.xlsx, .xls</p>
              <input id="bulk-import-file" type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>

            {fileError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <AlertCircle size={15} />{fileError}
              </div>
            )}

            {fileName && !fileError && totalRows > 0 && (
              <div className="rounded-xl border border-[color:var(--pf-border)] divide-y divide-[color:var(--pf-border-soft)]">
                <div className="px-4 py-2.5 flex items-center gap-2 text-sm font-medium [color:var(--pf-text)]">
                  <FileSpreadsheet size={15} className="[color:var(--pf-color-muted)]" />{fileName}
                </div>
                {(Object.keys(SECTION_LABELS) as (keyof ImportResult)[]).map(key => (
                  <div key={key} className="px-4 py-2 flex items-center justify-between text-sm">
                    <span className="[color:var(--pf-color-muted)]">{SECTION_LABELS[key]}</span>
                    <span className={parsed[key].length > 0 ? 'font-semibold [color:var(--pf-text)]' : '[color:var(--pf-color-muted)]'}>
                      {parsed[key].length} dòng
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {result && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
              <CheckCircle2 size={15} />Đã xử lý xong file "{fileName}"
            </div>
            {(Object.keys(SECTION_LABELS) as (keyof ImportResult)[]).map(key => {
              const sec = result[key]
              if (sec.created === 0 && (sec.matched ?? 0) === 0 && sec.errors.length === 0) return null
              const expanded = expandedErrors.has(key)
              return (
                <div key={key} className="rounded-xl border border-[color:var(--pf-border)] overflow-hidden">
                  <div className="px-4 py-2.5 flex items-center justify-between text-sm">
                    <span className="font-medium [color:var(--pf-text)]">{SECTION_LABELS[key]}</span>
                    <span className="[color:var(--pf-color-muted)]">
                      <span className="text-emerald-600 font-semibold">{sec.created} tạo mới</span>
                      {typeof sec.matched === 'number' && sec.matched > 0 && <span> · {sec.matched} đã có sẵn</span>}
                      {sec.errors.length > 0 && <span className="text-red-600"> · {sec.errors.length} lỗi</span>}
                    </span>
                  </div>
                  {sec.errors.length > 0 && (
                    <div className="border-t border-[color:var(--pf-border)]">
                      <button
                        className="w-full px-4 py-2 flex items-center justify-between text-xs [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)]"
                        onClick={() => toggleErrors(key)}
                      >
                        Xem chi tiết lỗi {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      {expanded && (
                        <div className="px-4 pb-2.5 space-y-1 max-h-40 overflow-y-auto">
                          {sec.errors.map((e, i) => (
                            <p key={i} className="text-xs text-red-600">Dòng {e.row}: {e.error}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}
