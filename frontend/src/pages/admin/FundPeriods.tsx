import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { useIsMobile } from '../../hooks/useIsMobile'
import api from '../../lib/api'
import {
  Plus, Building2, Wallet, Search, Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight, Download, Lock, LockOpen, Play, TrendingUp,
  FolderOpen, ChevronDown, QrCode, FileText,
  Trophy, Star, Filter, Upload, AlertCircle, CheckCircle2, FileSpreadsheet, Copy, Check, Maximize2
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { PageShell, PageHeader } from '../../components/shared'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import type { FundPeriod, FundPeriodStatus, FundPeriodType, FundContribution, Member } from '../../types'
import { useClubContributions } from '../../hooks/useFinanceData'
import { formatDate, formatVND } from '../../lib/utils'
import { exportGenericExcel, exportGenericTablePDF } from '../../lib/export'
import { BulkImportModal } from '../../components/admin/BulkImportModal'
import toast from 'react-hot-toast'

const statusLabel: Record<FundPeriodStatus, string> = {
  draft: 'Chuẩn bị', active: 'Đang mở', closed: 'Đóng', finalized: 'Đóng'
}
const statusVariant: Record<FundPeriodStatus, 'gray' | 'green' | 'yellow' | 'indigo'> = {
  draft: 'yellow', active: 'green', closed: 'gray', finalized: 'gray'
}

const DONUT_COLORS = ['var(--pf-primary)', '#7c3aed']

const emptyForm = {
  name: '', startDate: '', endDate: '',
  contributionAmount: 1000000, totalSessions: 13, notes: '',
  // FUND-IMPL-01: chỉ dùng cho modal Tạo Quỹ Phụ (create, không áp dụng khi sửa).
  copyMembersFromPreviousPeriod: false,
}

type FormData = typeof emptyForm

function periodToForm(p: FundPeriod): FormData {
  return {
    name: p.name,
    startDate: p.startDate,
    endDate: p.endDate,
    contributionAmount: p.contributionAmount,
    totalSessions: p.totalSessions,
    notes: p.notes ?? '',
    copyMembersFromPreviousPeriod: false,
  }
}

interface PreviousPeriodInfo {
  id: string
  name: string
  startDate: string
  endDate: string
  memberCount: number
}

type Tab = 'list' | 'history' | 'highlights'

export function FundPeriods() {
  const { user } = useAuthStore()
  const isMember = user?.role === 'MEMBER_VIEW'
  const clubId = user?.clubId ?? ''
  const { getClubData, setFundPeriods: savePeriods } = useClubDataStore()
  const clubData = getClubData(clubId)
  const { fundPeriods: periods, members } = clubData

  // Option 3: tự tải contributions vào state CỤC BỘ (không đọc global store) → khi Phase D cắt
  // full-load trong useApiSync, màn này vẫn đúng số (tái dùng nguyên vẹn mọi phép tính client).
  const { data: contributions, reload: loadContributions } = useClubContributions(clubId)

  const setPeriods = (fn: (prev: FundPeriod[]) => FundPeriod[]) =>
    savePeriods(clubId, fn(getClubData(clubId).fundPeriods))

  const [tab, setTab] = useState<Tab>('list')
  const [showCreateChung, setShowCreateChung] = useState(false)
  const [showCreateGame, setShowCreateGame] = useState(false)
  const [formChung, setFormChung] = useState({ ...emptyForm })
  const [formGame, setFormGame] = useState({ ...emptyForm })
  const [editingChung, setEditingChung] = useState<FundPeriod | null>(null)
  const [editingGame, setEditingGame] = useState<FundPeriod | null>(null)
  const [viewPeriod, setViewPeriod] = useState<FundPeriod | null>(null)

  // FUND-IMPL-01: thông tin kỳ gần nhất để hiển thị block "sao chép thành viên"
  // trong modal Tạo Quỹ. undefined = đang tải, null = không có kỳ trước / lỗi tải.
  // Áp dụng cho CẢ Quỹ Chính (chung) lẫn Quỹ Phụ (game) — nghiệp vụ giống nhau.
  const [prevGamePeriod, setPrevGamePeriod] = useState<PreviousPeriodInfo | null | undefined>(undefined)
  const [prevGamePeriodError, setPrevGamePeriodError] = useState(false)
  const [prevChungPeriod, setPrevChungPeriod] = useState<PreviousPeriodInfo | null | undefined>(undefined)
  const [prevChungPeriodError, setPrevChungPeriodError] = useState(false)

  useEffect(() => {
    if (!showCreateGame || editingGame) return
    let cancelled = false
    setPrevGamePeriod(undefined)
    setPrevGamePeriodError(false)
    api.get('/fund-periods/previous', { params: { type: 'game' } }).then(res => {
      if (cancelled) return
      const info = res.data?.data as PreviousPeriodInfo | null
      setPrevGamePeriod(info)
      // Đề xuất mặc định bật nếu có kỳ trước hợp lệ VÀ có thành viên để copy.
      if (info && info.memberCount > 0) {
        setFormGame(f => ({ ...f, copyMembersFromPreviousPeriod: true }))
      }
    }).catch(() => {
      if (cancelled) return
      setPrevGamePeriod(null)
      setPrevGamePeriodError(true)
    })
    return () => { cancelled = true }
  }, [showCreateGame, editingGame])

  useEffect(() => {
    if (!showCreateChung || editingChung) return
    let cancelled = false
    setPrevChungPeriod(undefined)
    setPrevChungPeriodError(false)
    api.get('/fund-periods/previous', { params: { type: 'chung' } }).then(res => {
      if (cancelled) return
      const info = res.data?.data as PreviousPeriodInfo | null
      setPrevChungPeriod(info)
      if (info && info.memberCount > 0) {
        setFormChung(f => ({ ...f, copyMembersFromPreviousPeriod: true }))
      }
    }).catch(() => {
      if (cancelled) return
      setPrevChungPeriod(null)
      setPrevChungPeriodError(true)
    })
    return () => { cancelled = true }
  }, [showCreateChung, editingChung])

  const openEdit = (p: FundPeriod) => {
    const form = periodToForm(p)
    if ((p.type ?? 'chung') === 'chung') {
      setEditingChung(p); setFormChung(form); setShowCreateChung(true)
    } else {
      setEditingGame(p); setFormGame(form); setShowCreateGame(true)
    }
  }

  const [isSaving, setIsSaving]       = useState(false)
  const [finalizingId, setFinalizingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'' | FundPeriodType>('')
  const [filterStatus, setFilterStatus] = useState<'' | FundPeriodStatus>('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10
  // Chọn nhiều kỳ quỹ để xóa hàng loạt (chỉ admin/thủ quỹ — member không có checkbox).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Import Excel state
  type ImportRow = { memberName: string; amount: number; paymentDate: string; notes: string }
  type ImportError = { row: number; memberName: string; error: string }
  const [showImport, setShowImport] = useState(false)
  const [importPeriodId, setImportPeriodId] = useState('')
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [importFileError, setImportFileError] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; total: number; errors: ImportError[] } | null>(null)
  const importFileRef = useRef<HTMLInputElement>(null)
  const [showBulkImport, setShowBulkImport] = useState(false)

  const commonPeriods = periods.filter(p => (p.type ?? 'chung') === 'chung')

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Họ và tên', 'Số tiền (VNĐ)', 'Ngày đóng (YYYY-MM-DD)', 'Ghi chú'],
      ['Nguyễn Văn A', 300000, new Date().toISOString().slice(0, 10), ''],
      ['Trần Thị B', 300000, new Date().toISOString().slice(0, 10), 'Đóng sớm'],
    ])
    ws['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 22 }, { wch: 20 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Đóng quỹ')
    XLSX.writeFile(wb, 'mau_nhap_dong_quy.xlsx')
  }

  const handleImportFile = (file: File) => {
    setImportFileError('')
    setImportRows([])
    setImportResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
        const parsed: ImportRow[] = raw.map((row) => ({
          memberName: String(row['Họ và tên'] ?? row['ho_va_ten'] ?? row['memberName'] ?? '').trim(),
          amount: Number(row['Số tiền (VNĐ)'] ?? row['so_tien'] ?? row['amount'] ?? 0),
          paymentDate: String(row['Ngày đóng (YYYY-MM-DD)'] ?? row['ngay_dong'] ?? row['paymentDate'] ?? '').slice(0, 10),
          notes: String(row['Ghi chú'] ?? row['ghi_chu'] ?? row['notes'] ?? '').trim(),
        })).filter(r => r.memberName)
        if (parsed.length === 0) { setImportFileError('File không có dữ liệu hợp lệ. Kiểm tra lại tên cột.'); return }
        setImportRows(parsed)
      } catch {
        setImportFileError('Không thể đọc file. Vui lòng dùng file .xlsx hoặc .xls.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleConfirmImport = async () => {
    if (!importPeriodId) { toast.error('Chọn kỳ quỹ để nhập'); return }
    if (importRows.length === 0) { toast.error('Không có dữ liệu để nhập'); return }
    setImportLoading(true)
    try {
      const res = await api.post('/contributions/import', { fundPeriodId: importPeriodId, rows: importRows })
      const result = res.data?.data as { imported: number; total: number; errors: ImportError[] }
      setImportResult(result)
      if (result.imported > 0) {
        loadContributions()
        toast.success(`Đã nhập ${result.imported}/${result.total} khoản đóng quỹ`)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Nhập Excel thất bại')
    } finally {
      setImportLoading(false)
    }
  }

  // QR payment state
  type BankInfo = { bank_code: string; bank_account_number: string; bank_account_name: string }
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null)
  const [qrPeriodId, setQrPeriodId] = useState('')
  const [showQrModal, setShowQrModal] = useState(false)
  const [copiedAcct, setCopiedAcct] = useState(false)

  useEffect(() => {
    // MEMBER_VIEW không có quyền đọc /system-settings (sẽ 403) → chỉ gọi khi KHÔNG phải member.
    if (!isMember) {
      api.get('/system-settings').then(res => {
        const d = res.data?.data ?? {}
        if (d.bank_account_number && d.bank_account_name) setBankInfo(d as BankInfo)
      }).catch(() => {})
    }
  }, [clubId, isMember])

  useEffect(() => {
    if (!qrPeriodId && commonPeriods.length > 0) {
      const active = commonPeriods.find(p => p.status === 'active') ?? commonPeriods[0]
      setQrPeriodId(active.id)
    }
  }, [commonPeriods.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const buildQrUrl = useCallback((periodId: string) => {
    if (!bankInfo?.bank_account_number || !bankInfo.bank_account_name) return null
    const period = commonPeriods.find(p => p.id === periodId)
    const amt = period?.contributionAmount ?? 0
    const info = period ? `Dong quy ${period.name}` : 'Dong quy CLB'
    const base = `https://img.vietqr.io/image/${bankInfo.bank_code || 'MB'}-${bankInfo.bank_account_number}-compact2.jpg`
    return `${base}?amount=${Math.round(amt)}&addInfo=${encodeURIComponent(info)}&accountName=${encodeURIComponent(bankInfo.bank_account_name)}`
  }, [bankInfo, commonPeriods])

  const copyAcctNumber = () => {
    if (!bankInfo?.bank_account_number) return
    navigator.clipboard.writeText(bankInfo.bank_account_number).then(() => {
      setCopiedAcct(true)
      setTimeout(() => setCopiedAcct(false), 2000)
    })
  }

  const resetImport = () => {
    setImportRows([])
    setImportResult(null)
    setImportFileError('')
    setImportPeriodId('')
    if (importFileRef.current) importFileRef.current.value = ''
  }

  const memberCount = members.length || 1

  // Finance summary from backend — source of truth for carryForward & club assets
  const [periodsFinanceSummary, setPeriodsFinanceSummary] = useState<{
    carryForwardBalance: number
    commonBalance: number
    clubAssetsBalance: number
    unpaidCount: number
  } | null>(null)

  const activeChungId = useMemo(
    () => periods.find(p => (p.type ?? 'chung') === 'chung' && p.status === 'active')?.id,
    [periods]
  )

  useEffect(() => {
    if (!activeChungId) { setPeriodsFinanceSummary(null); return }
    let cancelled = false
    api.get(`/fund-periods/${activeChungId}/summary`)
      .then(res => {
        if (cancelled) return
        const fund = res.data?.data
        const carryForwardBalance = Number(fund?.carryForward?.balance ?? 0)
        const commonBalance = Number(fund?.balance ?? 0)
        setPeriodsFinanceSummary({
          carryForwardBalance,
          commonBalance,
          clubAssetsBalance: Number(fund?.clubAssets?.balance ?? (commonBalance + carryForwardBalance)),
          unpaidCount: Number(fund?.unpaidCount ?? 0),
        })
      })
      .catch(() => { if (!cancelled) setPeriodsFinanceSummary(null) })
    return () => { cancelled = true }
  }, [activeChungId])

  // KPI computations
  const stats = useMemo(() => {
    // COMMON: only active (Đang mở) periods — exclude draft and closed
    const calcChung = () => {
      const fps = periods.filter(p => (p.type ?? 'chung') === 'chung' && p.status === 'active')
      // Sĩ số tính phí theo TỪNG kỳ (đã chốt từ backend ?? số live) → xóa/thêm member không đổi
      // target kỳ cũ; chỉ kỳ hiện tại (chưa chốt) theo danh sách hiện tại.
      const totalTarget = fps.reduce((a, p) => a + p.contributionAmount * (p.billedMemberCount ?? memberCount), 0)
      const periodIds = new Set(fps.map(p => p.id))
      const relevant = contributions.filter(c => (c.fundSource ?? 'COMMON') === 'COMMON' && periodIds.has(c.fundPeriodId ?? ''))
      const totalCollected = relevant.filter(c => c.isConfirmed).reduce((a, c) => a + c.amount, 0)
      const totalPending = relevant.filter(c => !c.isConfirmed).reduce((a, c) => a + c.amount, 0)
      const primaryActive = fps.filter(p => p.status === 'active').sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
      // CANONICAL: số người chưa đóng = unpaidCount từ summary (money-based); fallback record-based.
      const unpaidCount = periodsFinanceSummary?.unpaidCount ?? (primaryActive
        ? (primaryActive.billedMemberCount ?? memberCount) - new Set(contributions.filter(c => c.fundPeriodId === primaryActive.id && c.isConfirmed).map(c => c.memberId)).size
        : 0)
      const txCount = relevant.length

      const remaining = Math.max(0, totalTarget - totalCollected)
      const pct = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0
      return { balance: totalCollected, pct, remainPct: 100 - pct, remaining, unpaidCount, txCount, totalTarget, totalPending }
    }

    // MINI: all contributions with fundSource === 'MINI' (no period linkage required)
    // Not member-based: target = sum of period.contributionAmount (no × memberCount)
    const calcMini = () => {
      const fps = periods.filter(p => p.type === 'game')
      const totalTarget = fps.reduce((a, p) => a + p.contributionAmount, 0)
      const miniContribs = contributions.filter(c => c.fundSource === 'MINI')
      const totalCollected = miniContribs.filter(c => c.isConfirmed).reduce((a, c) => a + c.amount, 0)
      const totalPending = miniContribs.filter(c => !c.isConfirmed).reduce((a, c) => a + c.amount, 0)
      const remaining = Math.max(0, totalTarget - totalCollected)
      const pct = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : (miniContribs.length > 0 ? 100 : 0)
      return { balance: totalCollected, pct, remainPct: 100 - pct, remaining, unpaidCount: 0, txCount: miniContribs.length, totalTarget, totalPending }
    }

    return { chung: calcChung(), game: calcMini() }
  }, [periods, contributions, memberCount, periodsFinanceSummary])

  // Current fund: active or preparing (draft), sorted newest first
  const activePeriods = useMemo(() => ({
    chung: periods.filter(p => (p.type ?? 'chung') === 'chung' && (p.status === 'active' || p.status === 'draft'))
                  .sort((a, b) => b.startDate.localeCompare(a.startDate))[0],
    game:  periods.filter(p => p.type === 'game' && (p.status === 'active' || p.status === 'draft'))
                  .sort((a, b) => b.startDate.localeCompare(a.startDate))[0],
  }), [periods])

  // Số dư chuyển kỳ — lấy trực tiếp từ backend, không tự tính
  // Giá trị có thể âm, KHÔNG được clamp về 0
  const prevChungBalance = periodsFinanceSummary?.carryForwardBalance ?? 0

  // Latest game period regardless of status (for showing buttons even when no active period)
  const latestGamePeriod = useMemo(() =>
    [...periods].filter(p => p.type === 'game').sort((a, b) => b.startDate.localeCompare(a.startDate))[0],
    [periods]
  )

  // Filtered + paginated table
  const filtered = useMemo(() => {
    return periods.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
      const matchType = filterType === '' || (p.type ?? 'chung') === filterType
      const matchStatus = filterStatus === '' || p.status === filterStatus
      return matchSearch && matchType && matchStatus
    })
  }, [periods, search, filterType, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Chọn tất cả áp dụng cho TOÀN BỘ kết quả lọc (mọi trang) — tiện xóa cả nhóm đã lọc.
  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id))
  const someSelected = selectedIds.size > 0
  const toggleAllFiltered = () =>
    setSelectedIds(allFilteredSelected ? new Set() : new Set(filtered.map(p => p.id)))

  // Nếu xóa làm trang hiện tại vượt quá số trang → lùi về trang cuối hợp lệ.
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  // Recent transactions
  const recentTx = useMemo(() => {
    return [...contributions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  }, [contributions])

  const donutData = [
    { name: 'Quỹ Chính', value: stats.chung.balance },
    { name: 'Quỹ Phụ', value: stats.game.balance },
  ]

  // ── Xuất Excel/PDF danh sách kỳ quỹ (theo bộ lọc hiện tại) ──
  const periodTypeLabel = (p: FundPeriod) => ((p.type ?? 'chung') === 'chung' ? 'Quỹ Chính' : 'Quỹ Phụ')
  const doExportExcel = () => {
    exportGenericExcel('Ky_Quy', 'Kỳ quỹ',
      ['Tên kỳ', 'Loại', 'Trạng thái', 'Từ ngày', 'Đến ngày', 'Mức đóng (VNĐ)'],
      filtered.map((p) => [p.name, periodTypeLabel(p), statusLabel[p.status] ?? p.status, formatDate(p.startDate), p.endDate ? formatDate(p.endDate) : '', p.contributionAmount]),
    )
    toast.success('Đã xuất Excel kỳ quỹ')
  }
  const doExportPdf = () => {
    exportGenericTablePDF({
      fileBase: 'Ky_Quy',
      title: 'Danh Sách Kỳ Quỹ',
      metaLeft: `${filtered.length} kỳ`,
      columns: [
        { header: '#', align: 'center' }, { header: 'Tên kỳ' }, { header: 'Loại', align: 'center' },
        { header: 'Trạng thái', align: 'center' }, { header: 'Từ ngày', align: 'center' },
        { header: 'Đến ngày', align: 'center' }, { header: 'Mức đóng', align: 'right' },
      ],
      rows: filtered.map((p, i) => [i + 1, p.name, periodTypeLabel(p), statusLabel[p.status] ?? p.status, formatDate(p.startDate), p.endDate ? formatDate(p.endDate) : '—', formatVND(p.contributionAmount)]),
    })
    toast.success('Đã xuất PDF kỳ quỹ')
  }

  const handleSave = (
    type: FundPeriodType,
    form: FormData,
    editing: FundPeriod | null,
    onClose: () => void,
  ) => async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
      toast.error('Ngày kết thúc phải sau ngày bắt đầu')
      return
    }
    setIsSaving(true)
    try {
      // copyMembersFromPreviousPeriod chỉ áp dụng khi TẠO MỚI — PUT (sửa) không có field
      // này ở backend (UpdateFundPeriodDto), tách riêng để tránh gửi field lạ.
      const { copyMembersFromPreviousPeriod, ...formRest } = form
      if (editing) {
        const payload = { ...formRest, type, contributionAmount: Number(form.contributionAmount), totalSessions: Number(form.totalSessions) }
        const res = await api.put(`/fund-periods/${editing.id}`, payload)
        const d = res.data?.data
        const updated: FundPeriod = { ...editing, ...payload, ...(d ?? {}), contributionAmount: Number((d ?? payload).contributionAmount) }
        setPeriods(prev => prev.map(x => x.id === editing.id ? updated : x))
        onClose()
        toast.success(`Đã cập nhật kỳ quỹ "${form.name}"`)
      } else {
        const payload = { ...formRest, type, contributionAmount: Number(form.contributionAmount), totalSessions: Number(form.totalSessions), copyMembersFromPreviousPeriod }
        const res = await api.post('/fund-periods', payload)
        const d = res.data?.data
        const newPeriod: FundPeriod = { ...d, contributionAmount: Number(d.contributionAmount), createdBy: d.createdById ?? user?.id ?? '' }
        setPeriods(prev => [newPeriod, ...prev])
        onClose()
        toast.success(res.data?.message ?? `Tạo kỳ quỹ "${form.name}" thành công!`)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? (editing ? 'Cập nhật kỳ quỹ thất bại' : 'Tạo kỳ quỹ thất bại'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (p: FundPeriod) => {
    if (!confirm(`Xóa kỳ quỹ "${p.name}"?`)) return
    try {
      await api.delete(`/fund-periods/${p.id}`)
      setPeriods(prev => prev.filter(x => x.id !== p.id))
      setSelectedIds(prev => { const n = new Set(prev); n.delete(p.id); return n })
      toast.success('Đã xóa kỳ quỹ')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Xóa kỳ quỹ thất bại')
    }
  }

  // ─── Chọn & xóa nhiều kỳ quỹ cùng lúc ───────────────────────────────────────
  const toggleOne = (id: string) =>
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })

  const handleBulkDelete = async () => {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    if (!confirm(`Xóa ${ids.length} kỳ quỹ đã chọn? Hành động này không thể hoàn tác.`)) return
    setBulkDeleting(true)
    try {
      const results = await Promise.allSettled(ids.map(id => api.delete(`/fund-periods/${id}`)))
      const okIds = ids.filter((_, i) => results[i].status === 'fulfilled')
      if (okIds.length > 0) {
        const okSet = new Set(okIds)
        setPeriods(prev => prev.filter(x => !okSet.has(x.id)))
      }
      setSelectedIds(new Set())
      const failed = ids.length - okIds.length
      if (failed === 0) toast.success(`Đã xóa ${okIds.length} kỳ quỹ`)
      else if (okIds.length === 0) toast.error(`Không xóa được kỳ quỹ nào (${failed} lỗi — có thể do đã phát sinh giao dịch)`)
      else toast.error(`Đã xóa ${okIds.length}, còn ${failed} kỳ không xóa được (có thể đã phát sinh giao dịch)`)
    } finally {
      setBulkDeleting(false)
    }
  }

  const isMobile = useIsMobile()

  const handleGenerateReceipts = async (periodId: string) => {
    try {
      await api.post(`/personal-receipts/generate/${periodId}`)
      toast.success('Đã tạo phiếu thu cho tất cả thành viên')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Tạo phiếu thu thất bại')
    }
  }

  const handleSetStatus = async (p: FundPeriod, newStatus: FundPeriodStatus) => {
    if (finalizingId) return
    setFinalizingId(p.id)
    const labels: Record<string, string> = { active: 'Đang mở', draft: 'Chuẩn bị', closed: 'Đóng' }
    try {
      await api.patch(`/fund-periods/${p.id}/status`, { status: newStatus })
      // Re-fetch to ensure store is in sync with DB
      const res = await api.get(`/fund-periods?clubId=${clubId}`)
      const raw = res.data?.data ?? []
      const updated: FundPeriod[] = raw.map((fp: any) => ({
        id: fp.id, clubId: fp.clubId, name: fp.name,
        startDate: fp.startDate?.slice(0, 10) ?? '',
        endDate: fp.endDate?.slice(0, 10) ?? '',
        contributionAmount: Number(fp.contributionAmount ?? 0),
        totalSessions: fp.totalSessions ?? 0,
        status: fp.status,
        notes: fp.notes ?? undefined,
        type: fp.type ?? 'chung',
        finalizedAt: fp.finalizedAt ?? undefined,
        createdBy: fp.createdById ?? '',
        billedMemberCount: fp.billedMemberCount ?? undefined,
      }))
      savePeriods(clubId, updated)
      toast.success(`Kỳ "${p.name}" → ${labels[newStatus] ?? newStatus}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Cập nhật trạng thái thất bại')
    } finally {
      setFinalizingId(null)
    }
  }

  if (isMobile) {
    const chungPeriods = filtered.filter(p => (p.type ?? 'chung') === 'chung')
    const gamePeriods = filtered.filter(p => p.type === 'game')
    return (
      <div className="min-h-screen [background:var(--pf-bg)]">
        {/* Sticky header */}
        <div className="sticky top-0 z-20 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 py-3 flex items-center justify-between gap-2">
          <span className="text-[17px] font-[800] [color:var(--pf-text)]">Kỳ Quỹ</span>
          <div className="flex gap-1.5 items-center">
            {bankInfo && (
              <button
                className="flex h-9 w-9 items-center justify-center rounded-xl [background:var(--pf-primary-soft)] [color:var(--pf-primary)] border [border-color:var(--pf-primary-soft)]"
                onClick={() => setShowQrModal(true)}
                title="QR thanh toán"
              ><QrCode size={16} /></button>
            )}
            {!isMember && (
              <>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-xl [background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]"
                  onClick={() => { resetImport(); setShowImport(true) }}
                  title="Nhập Excel"
                ><Upload size={16} /></button>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-xl [background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]"
                  onClick={() => setShowBulkImport(true)}
                  title="Nhập dữ liệu CLB mới"
                ><FileSpreadsheet size={16} /></button>
                <button
                  className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-[13px] font-[600] text-white active:opacity-80"
                  style={{ background: 'var(--pf-primary)' }}
                  onClick={() => { setFormChung({ ...emptyForm }); setShowCreateChung(true) }}
                >
                  <Plus size={14} />Chung
                </button>
                <button
                  className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-[13px] font-[600] [color:var(--pf-primary)] border [border-color:var(--pf-primary-soft)] active:[background:var(--pf-primary-soft)]"
                  onClick={() => { setFormGame({ ...emptyForm }); setShowCreateGame(true) }}
                >
                  <Plus size={14} />Mini
                </button>
              </>
            )}
          </div>
        </div>

        <div className="px-4 pt-4 pb-6 space-y-4">
          {/* KPI summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="[background:var(--pf-surface)] rounded-[16px] border border-[color:var(--pf-border)] p-4 shadow-sm">
              <div className="text-[11px] font-[600] [color:var(--pf-color-muted)] uppercase tracking-wide mb-1">Quỹ Chính</div>
              <div className="text-[20px] font-[800] [color:var(--pf-primary)]">{formatVND(stats.chung.balance)}</div>
              <div className="text-[12px] [color:var(--pf-color-muted)] mt-0.5">{stats.chung.pct}% đã thu</div>
            </div>
            <div className="[background:var(--pf-surface)] rounded-[16px] border border-[color:var(--pf-border)] p-4 shadow-sm">
              <div className="text-[11px] font-[600] [color:var(--pf-color-muted)] uppercase tracking-wide mb-1">Quỹ Phụ</div>
              <div className="text-[20px] font-[800] [color:var(--pf-primary)]">{formatVND(stats.game.balance)}</div>
              <div className="text-[12px] [color:var(--pf-color-muted)] mt-0.5">{stats.game.pct}% đã thu</div>
            </div>
          </div>

          {/* QR thanh toán */}
          {bankInfo && buildQrUrl(qrPeriodId) && (
            <div className="[background:var(--pf-surface)] rounded-[16px] border [border-color:var(--pf-primary-soft)] p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <QrCode size={14} className="[color:var(--pf-primary)]" />
                <span className="text-[13px] font-[700] [color:var(--pf-text)]">QR Thanh Toán</span>
              </div>
              <div className="flex gap-3 items-start">
                <img src={buildQrUrl(qrPeriodId)!} alt="QR" className="w-24 h-24 rounded-lg border border-[color:var(--pf-border)] flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="text-[11px] [color:var(--pf-color-muted)]">Ngân hàng</div>
                  <div className="text-[13px] font-[600] [color:var(--pf-text)]">{bankInfo.bank_code}</div>
                  <div className="text-[11px] [color:var(--pf-color-muted)]">Số tài khoản</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-[600] font-mono [color:var(--pf-text)]">{bankInfo.bank_account_number}</span>
                    <button onClick={copyAcctNumber} className="[color:var(--pf-color-muted)] active:[color:var(--pf-primary)]">
                      {copiedAcct ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                  <div className="text-[11px] [color:var(--pf-color-muted)] truncate">{bankInfo.bank_account_name}</div>
                </div>
              </div>
              {commonPeriods.length > 1 && (
                <div className="mt-3">
                  <select
                    value={qrPeriodId}
                    onChange={e => setQrPeriodId(e.target.value)}
                    className="w-full text-[12px] rounded-[8px] border border-[color:var(--pf-border)] px-2.5 py-1.5 [background:var(--pf-surface-muted)] [color:var(--pf-text)]"
                  >
                    {commonPeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kỳ quỹ..."
              className="w-full pl-9 pr-4 py-2.5 rounded-[12px] [background:var(--pf-surface)] border border-[color:var(--pf-border)] text-[14px] [color:var(--pf-text)] outline-none focus:[border-color:var(--pf-primary)]"
            />
          </div>

          {/* Quỹ Chính periods */}
          {chungPeriods.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={14} className="[color:var(--pf-primary)]" />
                <span className="text-[13px] font-[700] [color:var(--pf-text)]">Quỹ Chính ({chungPeriods.length})</span>
              </div>
              <div className="space-y-2">
                {chungPeriods.map(p => (
                  <div key={p.id} className="[background:var(--pf-surface)] rounded-[16px] border border-[color:var(--pf-border)] p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-[15px] font-[700] [color:var(--pf-text)]">{p.name}</div>
                        <div className="text-[12px] [color:var(--pf-color-muted)]">{formatDate(p.startDate)} – {formatDate(p.endDate)}</div>
                      </div>
                      <Badge variant={statusVariant[p.status]}>{statusLabel[p.status]}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-[13px] mb-3">
                      <span className="[color:var(--pf-color-muted)]">Mức đóng: <span className="font-[600] [color:var(--pf-text)]">{formatVND(p.contributionAmount)}</span></span>
                    </div>
                    {!isMember && (
                      <div className="flex gap-2">
                        <button className="flex-1 py-1.5 rounded-[10px] text-[13px] font-[600] [color:var(--pf-primary)] border [border-color:var(--pf-primary-soft)] active:[background:var(--pf-primary-soft)] flex items-center justify-center gap-1"
                          onClick={() => openEdit(p)}><Pencil size={13} />Sửa</button>
                        {p.status === 'draft' && (
                          <button className="flex-1 py-1.5 rounded-[10px] text-[13px] font-[600] text-green-600 border border-green-200 active:bg-green-50 flex items-center justify-center gap-1"
                            onClick={() => handleSetStatus(p, 'active')}><Play size={13} />Bắt đầu</button>
                        )}
                        {p.status === 'active' && (
                          <button className="flex-1 py-1.5 rounded-[10px] text-[13px] font-[600] [color:var(--pf-color-muted)] border border-[color:var(--pf-border)] active:[background:var(--pf-surface-muted)] flex items-center justify-center gap-1"
                            onClick={() => handleSetStatus(p, 'closed')}><Lock size={13} />Đóng</button>
                        )}
                        {(p.status === 'closed' || p.status === 'finalized') && (
                          <button className="flex-1 py-1.5 rounded-[10px] text-[13px] font-[600] text-emerald-600 border border-emerald-200 active:bg-emerald-50 flex items-center justify-center gap-1"
                            onClick={() => handleSetStatus(p, 'active')}><LockOpen size={13} />Mở lại</button>
                        )}
                        <button className="px-3 py-1.5 rounded-[10px] text-[13px] font-[600] [color:var(--pf-primary)] border [border-color:var(--pf-primary-soft)] active:[background:var(--pf-primary-soft)]"
                          onClick={() => handleGenerateReceipts(p.id)} aria-label="Tạo phiếu thu"><FileText size={13} /></button>
                        <button className="px-3 py-1.5 rounded-[10px] text-[13px] font-[600] text-red-500 border border-red-200 active:bg-red-50"
                          onClick={() => handleDelete(p)} aria-label="Xóa"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quỹ Phụ periods */}
          {gamePeriods.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={14} className="[color:var(--pf-primary)]" />
                <span className="text-[13px] font-[700] [color:var(--pf-text)]">Quỹ Phụ ({gamePeriods.length})</span>
              </div>
              <div className="space-y-2">
                {gamePeriods.map(p => (
                  <div key={p.id} className="[background:var(--pf-surface)] rounded-[16px] border border-[color:var(--pf-border)] p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-[15px] font-[700] [color:var(--pf-text)]">{p.name}</div>
                        <div className="text-[12px] [color:var(--pf-color-muted)]">{formatDate(p.startDate)} – {formatDate(p.endDate)}</div>
                      </div>
                      <Badge variant={statusVariant[p.status]}>{statusLabel[p.status]}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-[13px] mb-3">
                      <span className="[color:var(--pf-color-muted)]">Mức đóng: <span className="font-[600] [color:var(--pf-text)]">{formatVND(p.contributionAmount)}</span></span>
                    </div>
                    {!isMember && (
                      <div className="flex gap-2">
                        <button className="flex-1 py-1.5 rounded-[10px] text-[13px] font-[600] [color:var(--pf-primary)] border [border-color:var(--pf-primary-soft)] active:[background:var(--pf-primary-soft)] flex items-center justify-center gap-1"
                          onClick={() => openEdit(p)}><Pencil size={13} />Sửa</button>
                        {p.status === 'draft' && (
                          <button className="flex-1 py-1.5 rounded-[10px] text-[13px] font-[600] text-green-600 border border-green-200 active:bg-green-50 flex items-center justify-center gap-1"
                            onClick={() => handleSetStatus(p, 'active')}><Play size={13} />Bắt đầu</button>
                        )}
                        {p.status === 'active' && (
                          <button className="flex-1 py-1.5 rounded-[10px] text-[13px] font-[600] [color:var(--pf-color-muted)] border border-[color:var(--pf-border)] active:[background:var(--pf-surface-muted)] flex items-center justify-center gap-1"
                            onClick={() => handleSetStatus(p, 'closed')}><Lock size={13} />Đóng</button>
                        )}
                        {(p.status === 'closed' || p.status === 'finalized') && (
                          <button className="flex-1 py-1.5 rounded-[10px] text-[13px] font-[600] text-emerald-600 border border-emerald-200 active:bg-emerald-50 flex items-center justify-center gap-1"
                            onClick={() => handleSetStatus(p, 'active')}><LockOpen size={13} />Mở lại</button>
                        )}
                        <button className="px-3 py-1.5 rounded-[10px] text-[13px] font-[600] [color:var(--pf-primary)] border [border-color:var(--pf-primary-soft)] active:[background:var(--pf-primary-soft)]"
                          onClick={() => handleGenerateReceipts(p.id)} aria-label="Tạo phiếu thu"><FileText size={13} /></button>
                        <button className="px-3 py-1.5 rounded-[10px] text-[13px] font-[600] text-red-500 border border-red-200 active:bg-red-50"
                          onClick={() => handleDelete(p)} aria-label="Xóa"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-12 [color:var(--pf-color-muted)] text-[14px]">Chưa có kỳ quỹ nào</div>
          )}
        </div>

        {/* QR Modal */}
        <Modal open={showQrModal} onClose={() => setShowQrModal(false)} title="QR thanh toán" size="sm">
          <div className="flex flex-col items-center gap-4 py-2">
            {commonPeriods.length > 1 && (
              <select value={qrPeriodId} onChange={e => setQrPeriodId(e.target.value)} className="input-base text-sm py-2 w-full">
                {commonPeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            {buildQrUrl(qrPeriodId) && (
              <img src={buildQrUrl(qrPeriodId)!} alt="QR thanh toán" className="w-64 h-64 rounded-xl border border-[color:var(--pf-border)]" />
            )}
            {bankInfo && (
              <div className="w-full rounded-lg [background:var(--pf-surface-muted)] border border-[color:var(--pf-border)] p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="[color:var(--pf-color-muted)]">Ngân hàng</span><span className="font-bold">{bankInfo.bank_code}</span></div>
                <div className="flex justify-between items-center">
                  <span className="[color:var(--pf-color-muted)]">Số tài khoản</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold">{bankInfo.bank_account_number}</span>
                    <button onClick={copyAcctNumber} className="p-1 rounded [color:var(--pf-color-muted)]">
                      {copiedAcct ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between"><span className="[color:var(--pf-color-muted)]">Chủ tài khoản</span><span className="font-bold">{bankInfo.bank_account_name}</span></div>
                {qrPeriodId && commonPeriods.find(p => p.id === qrPeriodId) && (
                  <div className="flex justify-between pt-2 border-t border-[color:var(--pf-border)]">
                    <span className="[color:var(--pf-color-muted)]">Số tiền đóng quỹ</span>
                    <span className="font-bold [color:var(--pf-primary)]">{formatVND(commonPeriods.find(p => p.id === qrPeriodId)!.contributionAmount)}</span>
                  </div>
                )}
              </div>
            )}
            <p className="text-xs [color:var(--pf-color-muted)] text-center">Quét mã QR để chuyển khoản đóng quỹ</p>
          </div>
        </Modal>

        {/* Import Excel Modal */}
        <Modal
          open={showImport}
          onClose={() => setShowImport(false)}
          title="Nhập đóng quỹ từ Excel"
          size="lg"
          footer={
            importResult ? (
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { resetImport() }}>Nhập thêm</Button>
                <Button onClick={() => setShowImport(false)}>Đóng</Button>
              </div>
            ) : (
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowImport(false)}>Hủy</Button>
                <Button disabled={importRows.length === 0 || !importPeriodId || importLoading} onClick={handleConfirmImport}>
                  {importLoading ? 'Đang nhập...' : `Xác nhận nhập ${importRows.length > 0 ? `(${importRows.length} dòng)` : ''}`}
                </Button>
              </div>
            )
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium [color:var(--pf-text)] mb-1.5">Kỳ quỹ áp dụng <span className="text-red-500">*</span></label>
              <select value={importPeriodId} onChange={e => setImportPeriodId(e.target.value)} className="input-base">
                <option value="">-- Chọn kỳ quỹ --</option>
                {commonPeriods.filter(p => p.status === 'active').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div
              className="border-2 border-dashed border-[color:var(--pf-border)] rounded-xl flex flex-col items-center justify-center py-8 gap-2 cursor-pointer hover:[border-color:var(--pf-primary)]"
              onClick={() => document.getElementById('import-file-m')?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImportFile(f) }}
            >
              <Upload size={24} className="[color:var(--pf-color-muted)]" />
              <p className="text-sm [color:var(--pf-color-muted)]">Kéo thả hoặc <span className="[color:var(--pf-primary)] font-semibold">chọn file</span></p>
              <p className="text-xs [color:var(--pf-color-muted)]">.xlsx, .xls</p>
              <input id="import-file-m" type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f) }} />
            </div>
            {importFileError && <p className="text-sm text-red-500">{importFileError}</p>}
            {importRows.length > 0 && !importResult && (
              <p className="text-sm [color:var(--pf-primary)] font-medium">Đọc được {importRows.length} dòng dữ liệu</p>
            )}
            {importResult && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm">
                <p className="font-semibold text-emerald-800">Đã nhập {importResult.imported}/{importResult.total} khoản</p>
                {importResult.errors.length > 0 && (
                  <ul className="mt-2 space-y-1 text-red-600 text-xs">
                    {importResult.errors.slice(0, 5).map((e, i) => <li key={i}>• {e.memberName}: {e.error}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        </Modal>

        {/* Modals reused from desktop */}
        <FundModal
          open={showCreateChung}
          onClose={() => { setShowCreateChung(false); setEditingChung(null) }}
          title={editingChung ? 'Sửa Kỳ Quỹ Chính' : 'Tạo Kỳ Quỹ Chính'}
          subtitle="Quỹ Chính CLB"
          formId="form-chung-m"
          form={formChung}
          setForm={setFormChung}
          onSubmit={handleSave('chung', formChung, editingChung, () => { setShowCreateChung(false); setEditingChung(null) })}
          editing={!!editingChung}
          isSaving={isSaving}
          showCopyMembers
          prevPeriodInfo={prevChungPeriod}
          prevPeriodError={prevChungPeriodError}
        />
        <FundModal
          open={showCreateGame}
          onClose={() => { setShowCreateGame(false); setEditingGame(null) }}
          title={editingGame ? 'Sửa Kỳ Quỹ Phụ' : 'Tạo Kỳ Quỹ Phụ'}
          subtitle="Quỹ Phụ CLB"
          formId="form-game-m"
          form={formGame}
          setForm={setFormGame}
          onSubmit={handleSave('game', formGame, editingGame, () => { setShowCreateGame(false); setEditingGame(null) })}
          editing={!!editingGame}
          isSaving={isSaving}
          showCopyMembers
          prevPeriodInfo={prevGamePeriod}
          prevPeriodError={prevGamePeriodError}
        />
        <BulkImportModal
          open={showBulkImport}
          onClose={() => setShowBulkImport(false)}
          onImported={() => window.location.reload()}
        />
      </div>
    )
  }

  return (
    <PageShell>
      <PageHeader
        title="Kỳ Quỹ"
        subtitle="Quản lý Quỹ Chính và Quỹ Phụ CLB"
        actions={
          <div className="flex flex-wrap gap-2">
            {filtered.length > 0 && (
              <>
                <Button variant="outline" onClick={doExportExcel}><FileSpreadsheet size={14} />Xuất Excel</Button>
                <Button variant="outline" onClick={doExportPdf}><FileText size={14} />Xuất PDF</Button>
              </>
            )}
            {!isMember && (
              <>
                <Button onClick={() => { setFormChung({ ...emptyForm }); setShowCreateChung(true) }}>
                  <Building2 size={14} />+ Tạo Quỹ Chính
                </Button>
                <Button variant="outline" onClick={() => { setFormGame({ ...emptyForm }); setShowCreateGame(true) }}>
                  <Wallet size={14} />+ Tạo Quỹ Phụ
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="flex flex-col gap-5">

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <KpiSummaryCard
            title="TỔNG QUỸ CHÍNH"
            icon={<Building2 size={16} className="[color:var(--pf-primary)]" />}
            iconBg="[background:var(--pf-primary-soft)]"
            accentColor="[color:var(--pf-primary)]"
            stats={stats.chung}
            label="Chưa đóng"
          />
          <KpiSummaryCard
            title="TỔNG QUỸ PHỤ"
            icon={<Wallet size={16} className="[color:var(--pf-primary)]" />}
            iconBg="[background:var(--pf-primary-soft)]"
            accentColor="[color:var(--pf-primary)]"
            stats={stats.game}
            label="Giao dịch"
            labelValue={stats.game.txCount}
          />
        </div>

        {/* Fund detail cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FundDetailCard
            title="Quỹ Chính CLB"
            icon={<Building2 size={16} className="[color:var(--pf-primary)]" />}
            period={activePeriods.chung}
            color="indigo"
            memberCount={activePeriods.chung?.billedMemberCount ?? memberCount}
            contributions={contributions}
            prevBalance={prevChungBalance}
            isMember={isMember}
            onEdit={() => activePeriods.chung ? openEdit(activePeriods.chung) : (setEditingChung(null), setFormChung({ ...emptyForm }), setShowCreateChung(true))}
            onView={() => activePeriods.chung && setViewPeriod(activePeriods.chung)}
          />
          <FundDetailCard
            title="Quỹ Phụ"
            icon={<Wallet size={16} className="[color:var(--pf-primary)]" />}
            period={activePeriods.game ?? latestGamePeriod}
            color="violet"
            memberCount={memberCount}
            contributions={contributions}
            miniMode
            isMember={isMember}
            onEdit={() => (activePeriods.game ?? latestGamePeriod) ? openEdit((activePeriods.game ?? latestGamePeriod)!) : (setEditingGame(null), setFormGame({ ...emptyForm }), setShowCreateGame(true))}
            onView={() => { const p = activePeriods.game ?? latestGamePeriod; if (p) setViewPeriod(p) }}
          />
        </div>

        {/* Tabs */}
        <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="flex border-b border-[color:var(--pf-border)] px-2 pt-1">
            {([['list', 'Danh sách kỳ quỹ'], ['history', 'Lịch sử giao dịch'], ['highlights', 'Giao dịch nổi bật']] as [Tab, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === key ? '[border-color:var(--pf-primary)] [color:var(--pf-primary)]' : 'border-transparent [color:var(--pf-color-muted)] hover:[color:var(--pf-text)]'}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'list' && (
            <>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-[color:var(--pf-border)]">
                <div className="relative flex-1 min-w-[180px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)]" />
                  <input
                    value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                    placeholder="Tìm kiếm kỳ quỹ..."
                    className="input-base pl-8 py-2 text-sm [&:focus]:ring-0" />
                </div>
                <div className="relative">
                  <select value={filterType} onChange={e => { setFilterType(e.target.value as '' | FundPeriodType); setPage(1) }}
                    className="input-base py-2 pr-8 text-sm appearance-none">
                    <option value="">Loại quỹ</option>
                    <option value="chung">Quỹ Chính</option>
                    <option value="game">Quỹ Phụ</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)] pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value as '' | FundPeriodStatus); setPage(1) }}
                    className="input-base py-2 pr-8 text-sm appearance-none">
                    <option value="">Trạng thái</option>
                    <option value="draft">Nháp</option>
                    <option value="active">Đang mở</option>
                    <option value="closed">Đã đóng</option>
                    <option value="finalized">Đã chốt</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)] pointer-events-none" />
                </div>
                {!isMember && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { resetImport(); setShowImport(true) }}>
                      <FileSpreadsheet size={13} />Nhập Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowBulkImport(true)}>
                      <Upload size={13} />Nhập dữ liệu CLB mới
                    </Button>
                  </>
                )}
              </div>

              {/* Thanh thao tác hàng loạt — chỉ hiện khi có chọn (admin/thủ quỹ) */}
              {!isMember && someSelected && (
                <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-red-50 border-b border-red-100">
                  <span className="text-sm font-medium text-red-700">Đã chọn {selectedIds.size} kỳ quỹ</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium [color:var(--pf-color-muted)] border border-[color:var(--pf-border)] hover:[background:var(--pf-surface-muted)]"
                    >Bỏ chọn</button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                    ><Trash2 size={14} />{bulkDeleting ? 'Đang xóa...' : `Xóa ${selectedIds.size} kỳ đã chọn`}</button>
                  </div>
                </div>
              )}

              {/* Table */}
              {paginated.length === 0 ? (
                <div className="py-16 text-center">
                  <FolderOpen size={32} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-sm [color:var(--pf-color-muted)]">Không có kỳ quỹ nào</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[color:var(--pf-border)] text-xs [color:var(--pf-color-muted)] [background:var(--pf-surface-muted)]">
                        {!isMember && (
                          <th className="w-10 px-4 py-3">
                            <input
                              type="checkbox"
                              aria-label="Chọn tất cả kỳ quỹ"
                              className="h-4 w-4 rounded border-slate-300 [accent-color:var(--pf-primary)] cursor-pointer align-middle"
                              checked={allFilteredSelected}
                              ref={el => { if (el) el.indeterminate = someSelected && !allFilteredSelected }}
                              onChange={toggleAllFiltered}
                            />
                          </th>
                        )}
                        <th className="text-left px-5 py-3 font-semibold">Tên kỳ quỹ</th>
                        <th className="text-left px-4 py-3 font-semibold">Loại quỹ</th>
                        <th className="text-left px-4 py-3 font-semibold">Thời gian</th>
                        <th className="text-right px-4 py-3 font-semibold">Mức đóng/người</th>
                        <th className="text-right px-4 py-3 font-semibold">Đã thu</th>
                        <th className="text-right px-4 py-3 font-semibold">Còn thiếu</th>
                        <th className="px-4 py-3 font-semibold">Tiến độ</th>
                        <th className="text-left px-4 py-3 font-semibold">Trạng thái</th>
                        <th className="text-center px-4 py-3 font-semibold">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map(p => {
                        // Kỳ Mini (Quỹ Phụ) ĐỘC LẬP KỲ: mục tiêu = mức đóng (KHÔNG × số TV),
                        // đã thu = gộp mọi khoản MINI (fundPeriodId=null nên không lọc theo kỳ).
                        // Nhất quán với card TỔNG QUỸ PHỤ (calcMini). Kỳ Chung: theo đầu người.
                        const isMiniPeriod = (p.type ?? 'chung') === 'game'
                        const target = isMiniPeriod ? p.contributionAmount : p.contributionAmount * (p.billedMemberCount ?? memberCount)
                        const collected = contributions
                          .filter(c => c.isConfirmed && (isMiniPeriod ? c.fundSource === 'MINI' : c.fundPeriodId === p.id))
                          .reduce((a, c) => a + c.amount, 0)
                        const remaining = Math.max(0, target - collected)
                        const pct = target > 0 ? Math.round((collected / target) * 100) : (isMiniPeriod && collected > 0 ? 100 : 0)
                        const startMs = new Date(p.startDate).getTime()
                        const endMs = new Date(p.endDate).getTime()
                        const days = Math.round((endMs - startMs) / 86400000)
                        const pType = p.type ?? 'chung'
                        return (
                          <tr key={p.id} className={`border-b border-[color:var(--pf-border)] transition-colors ${selectedIds.has(p.id) ? 'bg-red-50/50' : 'hover:bg-slate-50/60'}`}>
                            {!isMember && (
                              <td className="px-4 py-3.5">
                                <input
                                  type="checkbox"
                                  aria-label={`Chọn kỳ quỹ ${p.name}`}
                                  className="h-4 w-4 rounded border-slate-300 [accent-color:var(--pf-primary)] cursor-pointer align-middle"
                                  checked={selectedIds.has(p.id)}
                                  onChange={() => toggleOne(p.id)}
                                />
                              </td>
                            )}
                            <td className="px-5 py-3.5 font-medium [color:var(--pf-text)]">{p.name}</td>
                            <td className="px-4 py-3.5">
                              {pType === 'game'
                                ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold [background:var(--pf-primary-soft)] [color:var(--pf-primary)]"><Wallet size={10} />Mini</span>
                                : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold [background:var(--pf-primary-soft)] [color:var(--pf-primary)]"><Building2 size={10} />Chung</span>
                              }
                            </td>
                            <td className="px-4 py-3.5 [color:var(--pf-color-muted)] text-xs">{days} ngày</td>
                            <td className="px-4 py-3.5 text-right font-medium [color:var(--pf-text)]">{formatVND(p.contributionAmount)}</td>
                            <td className="px-4 py-3.5 text-right text-green-600 font-medium">{formatVND(collected)}</td>
                            <td className="px-4 py-3.5 text-right text-red-500 font-medium">{formatVND(remaining)}</td>
                            <td className="px-4 py-3.5 w-28">
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-1.5 rounded-full [background:var(--pf-color-muted-soft)] overflow-hidden">
                                  <div className="h-full rounded-full [background:var(--pf-primary)] transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs [color:var(--pf-color-muted)] whitespace-nowrap">{pct}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <Badge variant={statusVariant[p.status]} dot>{statusLabel[p.status]}</Badge>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center justify-center gap-1">
                                <button title="Xem" onClick={() => setViewPeriod(p)} className="p-1.5 rounded hover:[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] hover:[color:var(--pf-primary)] transition-colors">
                                  <Eye size={14} />
                                </button>
                                {!isMember && (
                                  <>
                                    <button title="Sửa" onClick={() => openEdit(p)} className="p-1.5 rounded hover:[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] hover:text-amber-600 transition-colors">
                                      <Pencil size={14} />
                                    </button>
                                    {p.status === 'draft' && (
                                      <button title="Bắt đầu kỳ quỹ" onClick={() => handleSetStatus(p, 'active')} className="p-1.5 rounded hover:bg-green-50 text-green-500 hover:text-green-700 transition-colors">
                                        <Play size={14} />
                                      </button>
                                    )}
                                    {p.status === 'active' && (
                                      <button title="Đóng kỳ quỹ" onClick={() => handleSetStatus(p, 'closed')} className="p-1.5 rounded hover:[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] hover:[color:var(--pf-text)] transition-colors">
                                        <Lock size={14} />
                                      </button>
                                    )}
                                    {(p.status === 'closed' || p.status === 'finalized') && (
                                      <button title="Mở lại" onClick={() => handleSetStatus(p, 'active')} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-500 hover:text-emerald-700 transition-colors">
                                        <LockOpen size={14} />
                                      </button>
                                    )}
                                    <button title="Tạo phiếu thu" onClick={() => handleGenerateReceipts(p.id)} className="p-1.5 rounded hover:[background:var(--pf-primary-soft)] [color:var(--pf-color-muted)] hover:[color:var(--pf-primary)] transition-colors">
                                      <FileText size={14} />
                                    </button>
                                    <button title="Xóa" onClick={() => handleDelete(p)} className="p-1.5 rounded hover:bg-red-50 [color:var(--pf-color-muted)] hover:text-red-600 transition-colors">
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {filtered.length > 0 && (
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-[color:var(--pf-border)] text-sm [color:var(--pf-color-muted)]">
                  <span>Hiển thị {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)} đến {Math.min(page * PAGE_SIZE, filtered.length)} của {filtered.length}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="p-1.5 rounded hover:[background:var(--pf-color-muted-soft)] disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                      <button key={n} onClick={() => setPage(n)}
                        className={`w-8 h-8 rounded text-xs font-medium transition-colors ${n === page ? '[background:var(--pf-primary)] text-white' : 'hover:[background:var(--pf-color-muted-soft)]'}`}>
                        {n}
                      </button>
                    ))}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="p-1.5 rounded hover:[background:var(--pf-color-muted-soft)] disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <span className="text-xs">10/trang</span>
                </div>
              )}
            </>
          )}

          {tab === 'history' && (
            <HistoryTab contributions={contributions} periods={periods} members={members} />
          )}

          {tab === 'highlights' && (
            <HighlightsTab contributions={contributions} periods={periods} members={members} />
          )}
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recent transactions */}
          <div className="md:col-span-2 [background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-[var(--shadow-card)] p-5">
            <h3 className="font-bold [color:var(--pf-text)] text-sm mb-4">Lịch sử giao dịch gần đây</h3>
            {recentTx.length === 0 ? (
              <p className="text-xs [color:var(--pf-color-muted)] text-center py-6">Chưa có giao dịch nào</p>
            ) : (
              <div className="space-y-2">
                {recentTx.map(tx => {
                  const period = periods.find(p => p.id === tx.fundPeriodId)
                  const member = members.find(m => m.id === tx.memberId)
                  return (
                    <div key={tx.id} className="flex items-center justify-between py-2 border-b border-[color:var(--pf-border)] last:border-0">
                      <div>
                        <p className="text-sm font-medium [color:var(--pf-text)]">{member?.fullName ?? tx.memberId}</p>
                        <p className="text-xs [color:var(--pf-color-muted)]">{period?.name ?? '—'} · {formatDate(tx.paymentDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">+{formatVND(tx.amount)}</p>
                        {tx.isConfirmed
                          ? <span className="text-xs text-green-500">Đã xác nhận</span>
                          : <span className="text-xs text-amber-500">Chờ xác nhận</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Donut chart */}
            <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-[var(--shadow-card)] p-5">
              <h3 className="font-bold [color:var(--pf-text)] text-sm mb-3">Biểu đồ thu theo loại quỹ</h3>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={35} outerRadius={55}
                      dataKey="value" paddingAngle={3}>
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatVND(v as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-1">
                {donutData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs [color:var(--pf-color-muted)]">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: DONUT_COLORS[i] }} />
                    {d.name}
                  </div>
                ))}
              </div>
            </div>

            {/* QR thanh toán */}
            <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-[var(--shadow-card)] p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold [color:var(--pf-text)] text-sm flex items-center gap-1.5">
                  <QrCode size={15} className="[color:var(--pf-primary)]" />QR thanh toán
                </h3>
                {bankInfo && buildQrUrl(qrPeriodId) && (
                  <button onClick={() => setShowQrModal(true)}
                    className="p-1 rounded hover:[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] hover:[color:var(--pf-color-muted)] transition-colors"
                    title="Phóng to QR">
                    <Maximize2 size={13} />
                  </button>
                )}
              </div>

              {!bankInfo ? (
                <div className="text-center py-4">
                  <QrCode size={28} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-xs [color:var(--pf-color-muted)] font-medium">Chưa cấu hình tài khoản</p>
                  <p className="text-xs [color:var(--pf-color-muted)] mt-1">Vào Cài đặt → Thanh toán để thêm thông tin ngân hàng</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Period selector */}
                  {commonPeriods.length > 1 && (
                    <select value={qrPeriodId} onChange={e => setQrPeriodId(e.target.value)}
                      className="input-base text-xs py-1.5 w-full">
                      {commonPeriods.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}

                  {/* QR image */}
                  {buildQrUrl(qrPeriodId) ? (
                    <div className="flex justify-center">
                      <img
                        src={buildQrUrl(qrPeriodId)!}
                        alt="QR thanh toán"
                        className="w-40 h-40 rounded-lg border border-[color:var(--pf-border)]"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                  ) : (
                    <div className="flex justify-center py-3">
                      <div className="w-40 h-40 rounded-lg [background:var(--pf-surface-muted)] border border-[color:var(--pf-border)] flex items-center justify-center">
                        <QrCode size={32} className="text-slate-200" />
                      </div>
                    </div>
                  )}

                  {/* Bank info */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="[color:var(--pf-color-muted)]">Ngân hàng</span>
                      <span className="font-semibold [color:var(--pf-text)]">{bankInfo.bank_code}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="[color:var(--pf-color-muted)]">Số tài khoản</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-semibold [color:var(--pf-text)]">{bankInfo.bank_account_number}</span>
                        <button onClick={copyAcctNumber}
                          className="p-0.5 rounded hover:[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] hover:[color:var(--pf-primary)] transition-colors"
                          title="Copy số tài khoản">
                          {copiedAcct ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="[color:var(--pf-color-muted)]">Chủ tài khoản</span>
                      <span className="font-semibold [color:var(--pf-text)] text-right max-w-[60%] truncate">{bankInfo.bank_account_name}</span>
                    </div>
                    {qrPeriodId && commonPeriods.find(p => p.id === qrPeriodId) && (
                      <div className="flex justify-between pt-1 border-t border-[color:var(--pf-border)]">
                        <span className="[color:var(--pf-color-muted)]">Số tiền</span>
                        <span className="font-bold [color:var(--pf-primary)]">
                          {formatVND(commonPeriods.find(p => p.id === qrPeriodId)!.contributionAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quỹ Chính modal (create or edit) */}
      <FundModal
        open={showCreateChung}
        onClose={() => { setShowCreateChung(false); setEditingChung(null); setFormChung({ ...emptyForm }) }}
        title={editingChung ? 'Chỉnh sửa Quỹ Chính' : 'Tạo Quỹ Chính'}
        subtitle={editingChung ? `Đang sửa: ${editingChung.name}` : 'Kỳ thu Quỹ Chính cho CLB'}
        formId="form-chung"
        form={formChung}
        setForm={setFormChung}
        editing={!!editingChung}
        isSaving={isSaving}
        onSubmit={handleSave('chung', formChung, editingChung, () => { setShowCreateChung(false); setEditingChung(null); setFormChung({ ...emptyForm }) })}
        showCopyMembers
        prevPeriodInfo={prevChungPeriod}
        prevPeriodError={prevChungPeriodError}
      />

      {/* Quỹ Phụ modal (create or edit) */}
      <FundModal
        open={showCreateGame}
        onClose={() => { setShowCreateGame(false); setEditingGame(null); setFormGame({ ...emptyForm }) }}
        title={editingGame ? 'Chỉnh sửa Quỹ Phụ' : 'Tạo Quỹ Phụ'}
        subtitle={editingGame ? `Đang sửa: ${editingGame.name}` : 'Kỳ thu Quỹ Phụ / giải đấu'}
        formId="form-game"
        form={formGame}
        setForm={setFormGame}
        editing={!!editingGame}
        isSaving={isSaving}
        onSubmit={handleSave('game', formGame, editingGame, () => { setShowCreateGame(false); setEditingGame(null); setFormGame({ ...emptyForm }) })}
        showCopyMembers
        prevPeriodInfo={prevGamePeriod}
        prevPeriodError={prevGamePeriodError}
      />

      <BulkImportModal
        open={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onImported={() => window.location.reload()}
      />

      {/* View period detail modal */}
      {viewPeriod && (
        <Modal open title={viewPeriod.name} onClose={() => setViewPeriod(null)} size="sm">
          <div className="p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="[color:var(--pf-color-muted)]">Loại quỹ</span>
              <span className="font-medium">{(viewPeriod.type ?? 'chung') === 'chung' ? 'Quỹ Chính' : 'Quỹ Phụ'}</span>
            </div>
            <div className="flex justify-between">
              <span className="[color:var(--pf-color-muted)]">Trạng thái</span>
              <Badge variant={statusVariant[viewPeriod.status]} dot>{statusLabel[viewPeriod.status]}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="[color:var(--pf-color-muted)]">Ngày bắt đầu</span>
              <span className="font-medium">{formatDate(viewPeriod.startDate)}</span>
            </div>
            {viewPeriod.endDate && (
              <div className="flex justify-between">
                <span className="[color:var(--pf-color-muted)]">Ngày kết thúc</span>
                <span className="font-medium">{formatDate(viewPeriod.endDate)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="[color:var(--pf-color-muted)]">Số tiền/người</span>
              <span className="font-medium [color:var(--pf-primary)]">{formatVND(viewPeriod.contributionAmount)}</span>
            </div>
            {viewPeriod.notes && (
              <div>
                <span className="[color:var(--pf-color-muted)]">Ghi chú</span>
                <p className="mt-1 [color:var(--pf-text)] [background:var(--pf-surface-muted)] rounded-lg p-2">{viewPeriod.notes}</p>
              </div>
            )}
            <div className="pt-2 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setViewPeriod(null)}>Đóng</Button>
              {!isMember && (
                <Button size="sm" className="flex-1" onClick={() => { openEdit(viewPeriod); setViewPeriod(null) }}>
                  <Pencil size={13} />Sửa
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* QR Fullscreen Modal */}
      <Modal
        open={showQrModal}
        onClose={() => setShowQrModal(false)}
        title="QR thanh toán"
        size="sm"
      >
        <div className="flex flex-col items-center gap-4 py-2">
          {commonPeriods.length > 1 && (
            <select value={qrPeriodId} onChange={e => setQrPeriodId(e.target.value)}
              className="input-base text-sm py-2 w-full">
              {commonPeriods.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          {buildQrUrl(qrPeriodId) && (
            <img
              src={buildQrUrl(qrPeriodId)!}
              alt="QR thanh toán"
              className="w-64 h-64 rounded-xl border border-[color:var(--pf-border)]"
            />
          )}
          {bankInfo && (
            <div className="w-full rounded-lg [background:var(--pf-surface-muted)] border border-[color:var(--pf-border)] p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="[color:var(--pf-color-muted)]">Ngân hàng</span>
                <span className="font-bold">{bankInfo.bank_code}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="[color:var(--pf-color-muted)]">Số tài khoản</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold">{bankInfo.bank_account_number}</span>
                  <button onClick={copyAcctNumber} className="p-1 rounded hover:bg-slate-200 [color:var(--pf-color-muted)] hover:[color:var(--pf-primary)]">
                    {copiedAcct ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="[color:var(--pf-color-muted)]">Chủ tài khoản</span>
                <span className="font-bold">{bankInfo.bank_account_name}</span>
              </div>
              {qrPeriodId && commonPeriods.find(p => p.id === qrPeriodId) && (
                <div className="flex justify-between pt-2 border-t border-[color:var(--pf-border)]">
                  <span className="[color:var(--pf-color-muted)]">Số tiền đóng quỹ</span>
                  <span className="font-bold [color:var(--pf-primary)] text-base">
                    {formatVND(commonPeriods.find(p => p.id === qrPeriodId)!.contributionAmount)}
                  </span>
                </div>
              )}
            </div>
          )}
          <p className="text-xs [color:var(--pf-color-muted)] text-center">Quét mã QR để chuyển khoản đóng quỹ</p>
        </div>
      </Modal>

      {/* Import Excel Modal */}
      <Modal
        open={showImport}
        onClose={() => setShowImport(false)}
        title="Nhập đóng quỹ từ Excel"
        size="lg"
        footer={
          importResult ? (
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { resetImport() }}>Nhập thêm</Button>
              <Button onClick={() => setShowImport(false)}>Đóng</Button>
            </div>
          ) : (
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowImport(false)}>Hủy</Button>
              <Button
                disabled={importRows.length === 0 || !importPeriodId || importLoading}
                onClick={handleConfirmImport}
              >
                {importLoading ? 'Đang nhập...' : `Xác nhận nhập ${importRows.length > 0 ? `(${importRows.length} dòng)` : ''}`}
              </Button>
            </div>
          )
        }
      >
        <div className="space-y-4">
          {importResult ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-100">
                <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                <div>
                  <p className="font-medium text-green-800">Nhập thành công {importResult.imported}/{importResult.total} khoản</p>
                  {importResult.errors.length > 0 && (
                    <p className="text-sm text-green-700">{importResult.errors.length} dòng bị lỗi — xem bên dưới</p>
                  )}
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="rounded-lg border border-red-100 overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 flex items-center gap-1.5">
                    <AlertCircle size={13} />Dòng bị lỗi ({importResult.errors.length})
                  </div>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-red-100 text-xs [color:var(--pf-color-muted)]">
                      <th className="text-left px-4 py-2">Dòng</th>
                      <th className="text-left px-4 py-2">Họ và tên</th>
                      <th className="text-left px-4 py-2">Lỗi</th>
                    </tr></thead>
                    <tbody>
                      {importResult.errors.map((e, i) => (
                        <tr key={i} className="border-b border-red-50">
                          <td className="px-4 py-2 [color:var(--pf-color-muted)]">{e.row}</td>
                          <td className="px-4 py-2 font-medium">{e.memberName}</td>
                          <td className="px-4 py-2 text-red-600">{e.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 rounded-lg [background:var(--pf-primary-soft)] border [border-color:var(--pf-primary-soft)]">
                <div>
                  <p className="text-sm font-medium [color:var(--pf-primary)]">Bước 1 — Tải file mẫu</p>
                  <p className="text-xs [color:var(--pf-primary)] mt-0.5">Điền đúng cột: Họ và tên, Số tiền, Ngày đóng, Ghi chú</p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download size={13} />Tải mẫu
                </Button>
              </div>
              <div>
                <label className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">
                  Bước 2 — Chọn kỳ quỹ để nhập <span className="text-red-500">*</span>
                </label>
                <select value={importPeriodId} onChange={e => setImportPeriodId(e.target.value)} className="input-base text-sm">
                  <option value="">-- Chọn kỳ quỹ --</option>
                  {commonPeriods.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.status === 'active' ? 'Đang mở' : p.status === 'draft' ? 'Chuẩn bị' : 'Đã đóng'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">Bước 3 — Tải lên file Excel</label>
                <label
                  className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-[color:var(--pf-border)] rounded-lg cursor-pointer hover:[border-color:var(--pf-primary)] hover:[background:var(--pf-primary-soft)]/30 transition-colors"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImportFile(f) }}
                >
                  <Upload size={24} className="[color:var(--pf-color-muted)]" />
                  <span className="text-sm [color:var(--pf-color-muted)]">Kéo thả file vào đây hoặc <span className="[color:var(--pf-primary)] font-medium">chọn file</span></span>
                  <span className="text-xs [color:var(--pf-color-muted)]">Hỗ trợ .xlsx, .xls — tối đa 500 dòng</span>
                  <input
                    ref={importFileRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f) }}
                  />
                </label>
                {importFileError && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{importFileError}</p>
                )}
              </div>
              {importRows.length > 0 && (
                <div className="rounded-lg border border-[color:var(--pf-border)] overflow-hidden">
                  <div className="[background:var(--pf-surface-muted)] px-4 py-2 text-xs font-semibold [color:var(--pf-color-muted)] flex items-center justify-between">
                    <span>Xem trước dữ liệu ({importRows.length} dòng)</span>
                    <button onClick={resetImport} className="[color:var(--pf-color-muted)] hover:text-red-500 text-xs">Xóa</button>
                  </div>
                  <div className="overflow-x-auto max-h-56 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 [background:var(--pf-surface)]">
                        <tr className="border-b border-[color:var(--pf-border)] text-xs [color:var(--pf-color-muted)]">
                          <th className="text-left px-4 py-2">#</th>
                          <th className="text-left px-4 py-2">Họ và tên</th>
                          <th className="text-right px-4 py-2">Số tiền</th>
                          <th className="text-left px-4 py-2">Ngày đóng</th>
                          <th className="text-left px-4 py-2">Ghi chú</th>
                          <th className="text-center px-4 py-2">Tìm thấy?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.map((r, i) => {
                          const found = members.some(m => m.fullName.toLowerCase().trim() === r.memberName.toLowerCase().trim())
                          return (
                            <tr key={i} className="border-b border-[color:var(--pf-border)]">
                              <td className="px-4 py-1.5 [color:var(--pf-color-muted)] text-xs">{i + 2}</td>
                              <td className="px-4 py-1.5 font-medium">{r.memberName}</td>
                              <td className="px-4 py-1.5 text-right [color:var(--pf-primary)]">{r.amount.toLocaleString('vi-VN')}đ</td>
                              <td className="px-4 py-1.5 [color:var(--pf-color-muted)] text-xs">{r.paymentDate || '—'}</td>
                              <td className="px-4 py-1.5 [color:var(--pf-color-muted)] text-xs truncate max-w-[120px]">{r.notes || '—'}</td>
                              <td className="px-4 py-1.5 text-center">
                                {found
                                  ? <CheckCircle2 size={14} className="text-green-500 mx-auto" />
                                  : <AlertCircle size={14} className="text-red-400 mx-auto" />}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {importRows.some(r => !members.some(m => m.fullName.toLowerCase().trim() === r.memberName.toLowerCase().trim())) && (
                    <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-xs text-amber-700 flex items-center gap-1.5">
                      <AlertCircle size={12} />Một số tên không khớp thành viên — các dòng này sẽ bị bỏ qua khi nhập
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </PageShell>
  )
}

// ─── HistoryTab ────────────────────────────────────────────────────────────────

function HistoryTab({ contributions, periods, members }: {
  contributions: FundContribution[]
  periods: FundPeriod[]
  members: Member[]
}) {
  const [filterPeriod, setFilterPeriod] = useState('')
  const [filterStatus, setFilterStatus] = useState<'' | 'confirmed' | 'pending'>('')
  const [histPage, setHistPage] = useState(1)
  const PAGE = 12

  const sorted = useMemo(() => {
    return [...contributions]
      .filter(c => {
        if (filterPeriod && c.fundPeriodId !== filterPeriod) return false
        if (filterStatus === 'confirmed' && !c.isConfirmed) return false
        if (filterStatus === 'pending' && c.isConfirmed) return false
        return true
      })
      .sort((a, b) => new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime())
  }, [contributions, filterPeriod, filterStatus])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE))
  const paged = sorted.slice((histPage - 1) * PAGE, histPage * PAGE)

  const totalIncome = sorted.filter(c => c.isConfirmed).reduce((s, c) => s + c.amount, 0)
  const totalPending = sorted.filter(c => !c.isConfirmed).reduce((s, c) => s + c.amount, 0)

  return (
    <div className="p-5 space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
          <p className="text-xs text-emerald-600 font-medium">Tổng đã xác nhận</p>
          <p className="text-base font-bold text-emerald-700 mt-0.5">{formatVND(totalIncome)}</p>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
          <p className="text-xs text-amber-600 font-medium">Chờ xác nhận</p>
          <p className="text-base font-bold text-amber-700 mt-0.5">{formatVND(totalPending)}</p>
        </div>
        <div className="rounded-xl [background:var(--pf-primary-soft)] border [border-color:var(--pf-primary-soft)] px-4 py-3">
          <p className="text-xs [color:var(--pf-primary)] font-medium">Số giao dịch</p>
          <p className="text-base font-bold [color:var(--pf-primary)] mt-0.5">{sorted.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={14} className="[color:var(--pf-color-muted)] shrink-0" />
        <select
          value={filterPeriod}
          onChange={e => { setFilterPeriod(e.target.value); setHistPage(1) }}
          className="rounded-lg border border-[color:var(--pf-border)] [background:var(--pf-surface)] px-2.5 py-1.5 text-xs [color:var(--pf-text)] focus:outline-none focus:[border-color:var(--pf-primary)]"
        >
          <option value="">Tất cả kỳ quỹ</option>
          {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value as any); setHistPage(1) }}
          className="rounded-lg border border-[color:var(--pf-border)] [background:var(--pf-surface)] px-2.5 py-1.5 text-xs [color:var(--pf-text)] focus:outline-none focus:[border-color:var(--pf-primary)]"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="confirmed">Đã xác nhận</option>
          <option value="pending">Chờ xác nhận</option>
        </select>
      </div>

      {/* Table */}
      {paged.length === 0 ? (
        <div className="py-10 text-center [color:var(--pf-color-muted)] text-sm">
          <TrendingUp size={28} className="mx-auto mb-2 text-slate-200" />Chưa có giao dịch nào
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[color:var(--pf-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="[background:var(--pf-surface-muted)] border-b border-[color:var(--pf-border)]">
                <th className="px-4 py-2.5 text-left text-xs font-semibold [color:var(--pf-color-muted)]">Ngày</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold [color:var(--pf-color-muted)]">Thành viên</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold [color:var(--pf-color-muted)]">Kỳ quỹ</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold [color:var(--pf-color-muted)]">Loại quỹ</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold [color:var(--pf-color-muted)]">Số tiền</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold [color:var(--pf-color-muted)]">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paged.map(c => {
                const member = members.find(m => m.id === c.memberId)
                const period = periods.find(p => p.id === c.fundPeriodId)
                return (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-2.5 text-xs [color:var(--pf-color-muted)] whitespace-nowrap">{formatDate(c.paymentDate || c.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full [background:var(--pf-primary-soft)] flex items-center justify-center text-[10px] font-bold [color:var(--pf-primary)] shrink-0">
                          {(member?.fullName ?? c.payerName ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium [color:var(--pf-text)]">{member?.fullName ?? c.payerName ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs [color:var(--pf-color-muted)]">{period?.name ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${c.fundSource === 'MINI' ? '[background:var(--pf-primary-soft)] [color:var(--pf-primary)]' : '[background:var(--pf-primary-soft)] [color:var(--pf-primary)]'}`}>
                        {c.fundSource === 'MINI' ? 'Quỹ Phụ' : 'Quỹ Chính'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-xs font-bold text-emerald-600">+{formatVND(c.amount)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {c.isConfirmed
                        ? <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Đã xác nhận</span>
                        : <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Chờ xác nhận</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs [color:var(--pf-color-muted)]">{sorted.length} giao dịch</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setHistPage(p => Math.max(1, p - 1))} disabled={histPage === 1}
              className="p-1.5 rounded-lg hover:[background:var(--pf-color-muted-soft)] disabled:opacity-30 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs [color:var(--pf-color-muted)] px-2">{histPage}/{totalPages}</span>
            <button onClick={() => setHistPage(p => Math.min(totalPages, p + 1))} disabled={histPage === totalPages}
              className="p-1.5 rounded-lg hover:[background:var(--pf-color-muted-soft)] disabled:opacity-30 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── HighlightsTab ──────────────────────────────────────────────────────────────

function HighlightsTab({ contributions, periods, members }: {
  contributions: FundContribution[]
  periods: FundPeriod[]
  members: Member[]
}) {
  // Top 5 contributors by total confirmed amount
  const topContributors = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>()
    for (const c of contributions) {
      if (!c.isConfirmed || !c.memberId) continue
      const member = members.find(m => m.id === c.memberId)
      const name = member?.fullName ?? c.payerName ?? c.memberId
      const prev = map.get(c.memberId) ?? { name, total: 0, count: 0 }
      map.set(c.memberId, { name, total: prev.total + c.amount, count: prev.count + 1 })
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5)
  }, [contributions, members])

  // Per-period collection stats for bar chart
  const periodStats = useMemo(() => {
    return periods
      .filter(p => contributions.some(c => c.fundPeriodId === p.id))
      .map(p => {
        const confirmed = contributions.filter(c => c.fundPeriodId === p.id && c.isConfirmed).reduce((s, c) => s + c.amount, 0)
        const pending = contributions.filter(c => c.fundPeriodId === p.id && !c.isConfirmed).reduce((s, c) => s + c.amount, 0)
        return { name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name, confirmed, pending }
      })
      .slice(-6)
  }, [contributions, periods])

  // Largest single transactions
  const topTx = useMemo(() => {
    return [...contributions]
      .filter(c => c.isConfirmed)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [contributions])

  const medals = ['🥇', '🥈', '🥉', '4.', '5.']

  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Top contributors */}
        <div>
          <h3 className="text-sm font-bold [color:var(--pf-text)] mb-3 flex items-center gap-2">
            <Trophy size={15} className="text-amber-500" />Top đóng quỹ
          </h3>
          {topContributors.length === 0 ? (
            <p className="text-xs [color:var(--pf-color-muted)] py-4 text-center">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-2.5">
              {topContributors.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-sm w-6 text-center shrink-0">{medals[i]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold [color:var(--pf-text)] truncate">{c.name}</span>
                      <span className="text-xs font-bold text-emerald-600 shrink-0 ml-2">{formatVND(c.total)}</span>
                    </div>
                    <div className="h-1.5 [background:var(--pf-color-muted-soft)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[var(--pf-primary)] to-emerald-400"
                        style={{ width: `${Math.round((c.total / (topContributors[0]?.total || 1)) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-[10px] [color:var(--pf-color-muted)] shrink-0">{c.count} lần</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Largest single transactions */}
        <div>
          <h3 className="text-sm font-bold [color:var(--pf-text)] mb-3 flex items-center gap-2">
            <Star size={15} className="[color:var(--pf-primary)]" />Giao dịch lớn nhất
          </h3>
          {topTx.length === 0 ? (
            <p className="text-xs [color:var(--pf-color-muted)] py-4 text-center">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-2">
              {topTx.map((c, i) => {
                const member = members.find(m => m.id === c.memberId)
                const period = periods.find(p => p.id === c.fundPeriodId)
                return (
                  <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl [background:var(--pf-surface-muted)] hover:bg-slate-100/60 transition-colors">
                    <span className="text-sm w-5 text-center shrink-0 font-bold [color:var(--pf-color-muted)]">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold [color:var(--pf-text)] truncate">{member?.fullName ?? c.payerName ?? '—'}</p>
                      <p className="text-[10px] [color:var(--pf-color-muted)]">{period?.name ?? '—'} · {formatDate(c.paymentDate)}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 shrink-0">{formatVND(c.amount)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Per-period bar chart */}
      {periodStats.length > 0 && (
        <div>
          <h3 className="text-sm font-bold [color:var(--pf-text)] mb-3 flex items-center gap-2">
            <TrendingUp size={15} className="[color:var(--pf-primary)]" />Thu quỹ theo kỳ
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={periodStats} margin={{ top: 4, right: 4, left: 0, bottom: 4 }} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${Math.round(v / 1000)}k`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatVND(Number(v))} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="confirmed" name="Đã xác nhận" fill="var(--pf-primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Chờ xác nhận" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 justify-center mt-1">
            <div className="flex items-center gap-1.5 text-xs [color:var(--pf-color-muted)]"><span className="w-3 h-3 rounded-sm [background:var(--pf-primary)] inline-block" />Đã xác nhận</div>
            <div className="flex items-center gap-1.5 text-xs [color:var(--pf-color-muted)]"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />Chờ xác nhận</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface KpiStats {
  balance: number; pct: number; remainPct: number; remaining: number
  unpaidCount: number; txCount: number; totalTarget: number; totalPending: number
  prevCarryover?: number
}

function KpiSummaryCard({ title, icon, iconBg, accentColor, stats, label, labelValue }: {
  title: string; icon: React.ReactNode; iconBg: string; accentColor: string
  stats: KpiStats; label: string; labelValue?: number
}) {
  return (
    <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-[var(--shadow-card)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
        <span className="text-xs font-bold [color:var(--pf-color-muted)] uppercase tracking-wide">{title}</span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-[10px] [color:var(--pf-color-muted)] uppercase font-semibold mb-0.5">Số dư</p>
          <p className={`text-base font-bold ${accentColor}`}>{formatVND(stats.balance)}</p>
          {stats.prevCarryover != null && stats.prevCarryover > 0 && (
            <p className="text-[10px] text-emerald-600 mt-0.5">↩ Kết dư +{formatVND(stats.prevCarryover)}</p>
          )}
          {stats.totalPending > 0 && (
            <p className="text-[10px] text-amber-500 mt-0.5">+{formatVND(stats.totalPending)} chờ</p>
          )}
        </div>
        <div>
          <p className="text-[10px] [color:var(--pf-color-muted)] uppercase font-semibold mb-0.5">Đã thu</p>
          <p className="text-base font-bold text-green-600">{stats.pct}%</p>
          <p className="text-[10px] text-green-500">{formatVND(stats.balance)}</p>
        </div>
        <div>
          <p className="text-[10px] [color:var(--pf-color-muted)] uppercase font-semibold mb-0.5">Còn thiếu</p>
          <p className="text-base font-bold text-red-500">{stats.remainPct}%</p>
          <p className="text-[10px] text-red-400">{formatVND(stats.remaining)}</p>
        </div>
      </div>
      {stats.totalPending > 0 && (
        <div className="mt-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-between text-xs">
          <span className="text-amber-700 font-medium">⏳ Chờ xác nhận</span>
          <span className="font-bold text-amber-700">{formatVND(stats.totalPending)}</span>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between text-xs [color:var(--pf-color-muted)]">
        <span>{label}: <strong className="[color:var(--pf-text)]">{labelValue ?? stats.unpaidCount}</strong></span>
        <span>Giao dịch: <strong className="[color:var(--pf-text)]">{stats.txCount}</strong></span>
      </div>
    </div>
  )
}

function FundDetailCard({ title, icon, period, color, memberCount, contributions, onEdit, onView, miniMode, prevBalance = 0, isMember = false }: {
  title: string; icon: React.ReactNode; period: FundPeriod | undefined
  color: 'indigo' | 'violet'; memberCount: number
  contributions: import('../../types').FundContribution[]; onEdit: () => void; onView?: () => void
  miniMode?: boolean; prevBalance?: number; isMember?: boolean
}) {
  const target = period ? (miniMode ? period.contributionAmount : period.contributionAmount * memberCount) : 0
  const miniCollected = miniMode
    ? contributions.filter(c => c.fundSource === 'MINI' && c.isConfirmed).reduce((a, c) => a + c.amount, 0)
    : 0
  const collected = miniMode
    ? miniCollected
    : period
      ? contributions.filter(c => c.fundPeriodId === period.id && c.isConfirmed).reduce((a, c) => a + c.amount, 0)
      : 0
  // CANONICAL "% đã thu kỳ này" = thu ĐÃ xác nhận / target — KHÔNG cộng số dư chuyển kỳ vào tử số
  // (chuyển kỳ là tiền kỳ trước, không phải "thu kỳ này"). Đồng nhất với KPI Tổng quan + cột danh sách.
  const pct = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : (miniMode && collected > 0 ? 100 : 0)
  const barColor = color === 'indigo' ? '[background:var(--pf-primary)]' : '[background:var(--pf-primary)]'
  const borderColor = color === 'indigo' ? '[border-color:var(--pf-primary-soft)]' : '[border-color:var(--pf-primary-soft)]'

  return (
    <div className={`[background:var(--pf-surface)] rounded-xl border ${borderColor} shadow-[var(--shadow-card)] p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-bold [color:var(--pf-text)] text-sm">{title}</span>
        </div>
        {period && <Badge variant={color === 'indigo' ? 'indigo' : 'purple'} dot>{statusLabel[period.status]}</Badge>}
      </div>
      {period ? (
        <>
          <p className="text-xs [color:var(--pf-color-muted)] mb-1">{period.name}</p>
          <p className="text-xs [color:var(--pf-color-muted)] mb-3">{formatDate(period.startDate)} – {formatDate(period.endDate)}</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-2 rounded-full [background:var(--pf-color-muted-soft)] overflow-hidden">
              <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-medium [color:var(--pf-color-muted)]">{pct}%</span>
          </div>
          {!miniMode && prevBalance > 0 && (
            <div className="flex items-center justify-between text-xs mt-1 mb-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100">
              <span className="text-emerald-700">↩ Kết dư kỳ trước</span>
              <span className="font-semibold text-emerald-700">+{formatVND(prevBalance)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs [color:var(--pf-color-muted)] mt-2">
            <span>Đã thu: <strong className="[color:var(--pf-text)]">{formatVND(collected)}</strong></span>
            {miniMode
              ? <span>Giao dịch: <strong className="[color:var(--pf-text)]">{contributions.filter(c => c.fundSource === 'MINI').length}</strong></span>
              : <span>Mục tiêu: <strong className="[color:var(--pf-text)]">{formatVND(target)}</strong></span>
            }
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
              <Eye size={13} />Chi tiết
            </Button>
            {!isMember && (
              <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
                <Pencil size={13} />Sửa quỹ
              </Button>
            )}
          </div>
        </>
      ) : miniMode && collected > 0 ? (
        <>
          <p className="text-xs [color:var(--pf-color-muted)] mb-3">Chưa có kỳ quỹ đang mở</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-2 rounded-full [background:var(--pf-color-muted-soft)] overflow-hidden">
              <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: '100%' }} />
            </div>
            <span className="text-xs font-medium [color:var(--pf-color-muted)]">—</span>
          </div>
          <div className="flex justify-between text-xs [color:var(--pf-color-muted)] mt-2 mb-4">
            <span>Đã thu: <strong className="[color:var(--pf-text)]">{formatVND(collected)}</strong></span>
          </div>
          {!isMember && <Button size="sm" onClick={onEdit}><Plus size={13} />Tạo kỳ quỹ</Button>}
        </>
      ) : (
        <div className="py-4 text-center">
          <p className="text-xs [color:var(--pf-color-muted)] mb-3">Chưa có kỳ quỹ đang mở</p>
          {!isMember && <Button size="sm" onClick={onEdit}><Plus size={13} />Tạo kỳ quỹ</Button>}
        </div>
      )}
    </div>
  )
}

function FundModal({ open, onClose, title, subtitle, formId, form, setForm, onSubmit, editing, isSaving, showCopyMembers, prevPeriodInfo, prevPeriodError }: {
  open: boolean; onClose: () => void; title: string; subtitle: string
  formId: string; form: FormData
  setForm: (f: FormData) => void; onSubmit: (e: React.FormEvent) => void
  editing?: boolean; isSaving?: boolean
  // FUND-IMPL-01 — chỉ modal Tạo Quỹ Phụ (create) truyền các prop này.
  showCopyMembers?: boolean
  prevPeriodInfo?: PreviousPeriodInfo | null
  prevPeriodError?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSaving}>Hủy bỏ</Button>
          <Button type="submit" form={formId} disabled={isSaving}>{isSaving ? 'Đang lưu...' : (editing ? 'Cập nhật kỳ quỹ' : 'Tạo kỳ quỹ')}</Button>
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">Tên kỳ <span className="text-red-500">*</span></label>
          <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="VD: Quý 3/2026" className="input-base" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">Ngày bắt đầu <span className="text-red-500">*</span></label>
            <input required type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="input-base" />
          </div>
          <div>
            <label className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">Ngày kết thúc <span className="text-red-500">*</span></label>
            <input required type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="input-base" />
          </div>
          <div>
            <label className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">Mức đóng/người (VNĐ) <span className="text-red-500">*</span></label>
            <input required type="number" value={form.contributionAmount}
              onChange={e => setForm({ ...form, contributionAmount: Number(e.target.value) })} className="input-base" />
          </div>
          <div>
            <label className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">Số buổi dự kiến</label>
            <input type="number" value={form.totalSessions}
              onChange={e => setForm({ ...form, totalSessions: Number(e.target.value) })} className="input-base" />
          </div>
        </div>

        {showCopyMembers && !editing && (
          <div className="rounded-[16px] border p-3.5 [border-color:var(--pf-primary-soft)] [background:var(--pf-primary-soft)]">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded shrink-0"
                style={{ accentColor: 'var(--pf-primary)' }}
                checked={form.copyMembersFromPreviousPeriod}
                disabled={prevPeriodError || prevPeriodInfo === null || prevPeriodInfo === undefined}
                onChange={e => setForm({ ...form, copyMembersFromPreviousPeriod: e.target.checked })}
              />
              <span className="flex items-center gap-2 flex-wrap text-[13px] font-medium [color:var(--pf-text)]">
                Sao chép thành viên từ kỳ quỹ trước
                <Badge variant="green">Đề xuất</Badge>
              </span>
            </label>

            {prevPeriodInfo === undefined && !prevPeriodError && (
              <p className="mt-2 text-xs [color:var(--pf-color-muted)]">Đang tải thông tin kỳ quỹ trước...</p>
            )}

            {prevPeriodError && (
              <p className="mt-2 text-xs text-amber-600">
                Không tải được thông tin kỳ quỹ trước. Bạn vẫn có thể tạo kỳ quỹ không sao chép.
              </p>
            )}

            {!prevPeriodError && prevPeriodInfo === null && (
              <p className="mt-2 text-xs [color:var(--pf-color-muted)]">Chưa có kỳ quỹ trước để sao chép thành viên.</p>
            )}

            {!prevPeriodError && prevPeriodInfo && prevPeriodInfo.memberCount === 0 && (
              <p className="mt-2 text-xs [color:var(--pf-color-muted)]">Kỳ quỹ trước chưa có thành viên để sao chép.</p>
            )}

            {!prevPeriodError && prevPeriodInfo && prevPeriodInfo.memberCount > 0 && form.copyMembersFromPreviousPeriod && (
              <div className="mt-2.5 space-y-2.5">
                <p className="text-xs [color:var(--pf-color-muted)]">
                  Hệ thống sẽ sao chép danh sách thành viên từ kỳ quỹ gần nhất cùng loại.
                </p>
                <div className="rounded-[12px] border p-3 [background:var(--pf-surface)] [border-color:var(--pf-primary-soft)] space-y-1">
                  <p className="text-[11px] font-[600] uppercase tracking-wide [color:var(--pf-color-muted)]">Kỳ quỹ gần nhất</p>
                  <p className="text-sm font-semibold [color:var(--pf-text)]">{prevPeriodInfo.name}</p>
                  <p className="text-xs [color:var(--pf-color-muted)]">Thời gian: {formatDate(prevPeriodInfo.startDate)} - {formatDate(prevPeriodInfo.endDate)}</p>
                  <p className="text-xs [color:var(--pf-color-muted)]">Số lượng thành viên: {prevPeriodInfo.memberCount} thành viên</p>
                </div>
                <p className="text-[11px] leading-relaxed [color:var(--pf-color-muted)]">
                  Danh sách thành viên sẽ được sao chép sang kỳ quỹ mới.<br />
                  Mức đóng/người sẽ áp dụng theo giá trị bạn nhập ở trên.<br />
                  Trạng thái mặc định: Chưa đóng (0 đ).
                </p>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">Ghi chú</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={2} className="input-base resize-none" placeholder="Thông tin thêm về kỳ quỹ..." />
        </div>
      </form>
    </Modal>
  )
}
