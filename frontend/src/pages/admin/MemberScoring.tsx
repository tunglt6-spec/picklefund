/**
 * MemberScoring — Chấm điểm thành viên động (Phase 3 UI).
 * 2 tab: "Bảng điểm" (mọi staff xem) + "Thang điểm" (chỉ CLUB_ADMIN).
 * API envelope { success, data, message } → luôn đọc res.data.data.
 * clubId lấy từ JWT ở backend (KHÔNG truyền). Quyền sửa (rule/event/finalize) = CLUB_ADMIN.
 * Engine tính LIVE: điểm mặc định 100, trừ tự động theo điểm danh & đóng quỹ (autoLines),
 * cộng thêm điều chỉnh thủ công (events MANUAL). KHÔNG còn "chạy tự động".
 * Chuẩn UI V2.2 shared-kit, token --pf-*, responsive DataTable + MobileCardList.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Award, Lock, Plus, Trash2, TrendingUp, TrendingDown, Users, Star } from 'lucide-react'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { exportGenericExcel, exportGenericTablePDF } from '../../lib/export'
import {
  PageShell, PageHeader, MetricCard, DataTable, MobileCardList,
  StatusBadge, EmptyState, LoadingState, ErrorState, ActionButton, ExportActions, ResponsiveTabs,
  type Column, type TabItem, type StatusTone,
} from '../../components/shared'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'

// ── Kiểu dữ liệu theo API backend ──────────────────────────────────────────
type Category = 'PARTICIPATION' | 'CONDUCT' | 'CONTRIBUTION' | 'DISCIPLINE' | 'FINANCE' | 'BONUS'
type Source = 'AUTO' | 'MANUAL'

interface ScoringRule {
  id: string
  category: Category
  label: string
  delta: number
  source: Source
  active: boolean
  sortOrder: number
}
interface PeriodRow {
  memberId: string
  memberName: string
  total: number
  classification: string
}
interface ScoreEvent {
  id: string
  category: Category
  label: string
  delta: number
  source: Source
  note?: string | null
  createdAt: string
}
interface AutoLine {
  label: string
  delta: number
}
interface MemberDetail {
  memberId: string
  memberName: string
  total: number
  classification: string
  autoLines: AutoLine[]
  events: ScoreEvent[]
}

const CATEGORY_LABELS: Record<Category, string> = {
  PARTICIPATION: 'Tham gia',
  CONDUCT: 'Ứng xử',
  CONTRIBUTION: 'Đóng góp',
  DISCIPLINE: 'Kỷ luật',
  FINANCE: 'Tài chính',
  BONUS: 'Thưởng',
}
const CATEGORY_ORDER: Category[] = [
  'PARTICIPATION', 'CONDUCT', 'CONTRIBUTION', 'DISCIPLINE', 'FINANCE', 'BONUS',
]

/** Xếp loại → tone StatusBadge. */
function classificationTone(c: string): StatusTone {
  const v = c.toLowerCase()
  if (v.includes('xuất sắc')) return 'success'
  if (v.includes('tốt')) return 'info'
  if (v.includes('cần cải thiện')) return 'warning'
  if (v.includes('xem xét')) return 'danger'
  return 'neutral' // Đạt / mặc định
}

/** Danh sách 12 tháng gần nhất dạng 'YYYY-MM' (tính từ hôm nay, KHÔNG hardcode). */
function recentMonths(): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}
function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(m: string): string {
  const [y, mo] = m.split('-')
  return `Tháng ${mo}/${y}`
}
function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function apiMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } } }
  return e?.response?.data?.message ?? fallback
}

export function MemberScoring() {
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role === 'SUPER_ADMIN' || role === 'CLUB_ADMIN'
  // MEMBER_VIEW: chỉ xem (read-only). Ẩn mọi control ghi ở lớp UX
  // (backend đã chặn ghi: GET mở cho member, POST/PATCH/DELETE admin-only).
  const isMember = role === 'MEMBER_VIEW'

  const months = useMemo(() => recentMonths(), [])
  const [month, setMonth] = useState<string>(currentMonth())
  const [tab, setTab] = useState<'scoreboard' | 'rules'>('scoreboard')

  const tabs: TabItem[] = useMemo(() => {
    const list: TabItem[] = [{ key: 'scoreboard', label: 'Bảng điểm' }]
    if (isAdmin && !isMember) list.push({ key: 'rules', label: 'Thang điểm' })
    return list
  }, [isAdmin, isMember])

  return (
    <PageShell>
      <PageHeader
        title="Chấm điểm thành viên"
        subtitle="Theo dõi điểm & xếp loại thành viên theo tháng"
      />
      <div className="mb-4">
        <ResponsiveTabs
          tabs={tabs}
          active={tab}
          onChange={(k) => setTab(k as 'scoreboard' | 'rules')}
        />
      </div>

      {tab === 'scoreboard' ? (
        <ScoreboardTab
          month={month}
          months={months}
          onMonthChange={setMonth}
          isAdmin={isAdmin}
          isMember={isMember}
        />
      ) : (
        isAdmin && !isMember && <RulesTab />
      )}
    </PageShell>
  )
}

// ════════════════════════ TAB 1: BẢNG ĐIỂM ════════════════════════
interface ScoreboardTabProps {
  month: string
  months: string[]
  onMonthChange: (m: string) => void
  isAdmin: boolean
  isMember: boolean
}

function ScoreboardTab({ month, months, onMonthChange, isAdmin, isMember }: ScoreboardTabProps) {
  const [rows, setRows] = useState<PeriodRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmFinalize, setConfirmFinalize] = useState(false)
  const [detailMemberId, setDetailMemberId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await api.get(`/scoring/period?month=${month}`)
      setRows((res.data?.data ?? []) as PeriodRow[])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    let excellent = 0
    let good = 0
    let review = 0
    for (const r of rows) {
      const tone = classificationTone(r.classification)
      if (tone === 'success') excellent++
      else if (tone === 'info') good++
      else if (tone === 'warning' || tone === 'danger') review++
    }
    return { total: rows.length, excellent, good, review }
  }, [rows])

  const doExportExcel = () => {
    exportGenericExcel(`Cham_Diem_${month}`, 'Bảng điểm',
      ['Thành viên', 'Điểm', 'Xếp loại'],
      rows.map((r) => [r.memberName, r.total, r.classification]),
    )
    toast.success('Đã xuất Excel bảng điểm')
  }
  const doExportPdf = () => {
    exportGenericTablePDF({
      fileBase: `Cham_Diem_${month}`,
      title: 'Bảng Điểm Thành Viên',
      subtitle: monthLabel(month),
      metaLeft: `${stats.total} TV · Xuất sắc ${stats.excellent} · Tốt ${stats.good} · Cần lưu ý ${stats.review}`,
      columns: [
        { header: '#', align: 'center' }, { header: 'Thành viên' },
        { header: 'Điểm', align: 'center' }, { header: 'Xếp loại', align: 'center' },
      ],
      rows: rows.map((r, i) => [i + 1, r.memberName, r.total, r.classification]),
    })
    toast.success('Đã xuất PDF bảng điểm')
  }

  const handleFinalize = async () => {
    setConfirmFinalize(false)
    setBusy(true)
    try {
      await api.post(`/scoring/finalize?month=${month}`)
      toast.success(`Đã chốt điểm ${monthLabel(month)}`)
      await load()
    } catch (err) {
      toast.error(apiMessage(err, 'Chốt tháng thất bại'))
    } finally {
      setBusy(false)
    }
  }

  const columns: Column<PeriodRow>[] = [
    {
      key: 'memberName', header: 'Thành viên',
      render: (r) => <span className="font-medium [color:var(--pf-text)]">{r.memberName}</span>,
    },
    {
      key: 'total', header: 'Điểm', align: 'center',
      render: (r) => <span className="font-bold tabular-nums [color:var(--pf-text)]">{r.total}</span>,
    },
    {
      key: 'classification', header: 'Xếp loại', align: 'center',
      render: (r) => <StatusBadge tone={classificationTone(r.classification)}>{r.classification}</StatusBadge>,
    },
    {
      key: 'actions', header: '', align: 'right',
      render: (r) => (
        <button
          type="button"
          onClick={() => setDetailMemberId(r.memberId)}
          className="min-h-11 rounded-full px-3 text-sm font-semibold [color:var(--pf-primary)] hover:[background:var(--pf-primary-soft)] transition-colors"
        >
          Chi tiết
        </button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Bộ chọn tháng + actions */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex items-center gap-2 text-sm font-medium [color:var(--pf-text)]">
          <span className="[color:var(--pf-color-muted)]">Tháng</span>
          <select
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="min-h-11 rounded-xl border px-3 text-sm [background:var(--pf-surface)] border-[color:var(--pf-border)] [color:var(--pf-text)]"
          >
            {months.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          {rows.length > 0 && <ExportActions onExcel={doExportExcel} onPdf={doExportPdf} />}
          {isAdmin && !isMember && (
            <ActionButton
              icon={<Lock size={16} />}
              onClick={() => setConfirmFinalize(true)}
              disabled={busy}
              className="min-h-11"
            >
              Chốt tháng
            </ActionButton>
          )}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard accent="violet" icon={<Users size={18} />} label="Tổng TV" value={stats.total} />
        <MetricCard accent="teal" icon={<Star size={18} />} label="Xuất sắc" value={stats.excellent} />
        <MetricCard accent="blue" icon={<Award size={18} />} label="Tốt" value={stats.good} />
        <MetricCard accent="amber" icon={<TrendingDown size={18} />} label="Cần lưu ý" value={stats.review} sub="cần cải thiện / xem xét" />
      </div>

      <p className="text-xs [color:var(--pf-color-muted)]">
        Điểm cập nhật tự động theo điểm danh &amp; đóng quỹ. Mỗi thành viên bắt đầu ở 100 điểm,
        bị trừ khi vắng/nợ quỹ/vi phạm; có thể cộng/trừ thêm bằng điều chỉnh thủ công.
      </p>

      {/* Bảng điểm */}
      <div className="rounded-[20px] border p-4 sm:p-5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
        {loading ? (
          <LoadingState rows={4} />
        ) : error ? (
          <ErrorState onRetry={load} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Award size={24} />}
            title="Chưa có dữ liệu chấm điểm"
            description="Điểm cập nhật tự động theo điểm danh & đóng quỹ. Mặc định 100, trừ khi vắng/nợ/vi phạm."
          />
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable columns={columns} rows={rows} rowKey={(r) => r.memberId} />
            </div>
            <div className="md:hidden">
              <MobileCardList
                items={rows}
                itemKey={(r) => r.memberId}
                renderCard={(r) => (
                  <button
                    type="button"
                    onClick={() => setDetailMemberId(r.memberId)}
                    className="flex w-full items-center justify-between gap-3 rounded-[16px] border p-4 text-left [background:var(--pf-surface)] border-[color:var(--pf-border)]"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold [color:var(--pf-text)] truncate">{r.memberName}</p>
                      <div className="mt-1"><StatusBadge tone={classificationTone(r.classification)}>{r.classification}</StatusBadge></div>
                    </div>
                    <span className="shrink-0 text-lg font-bold tabular-nums [color:var(--pf-text)]">{r.total}</span>
                  </button>
                )}
              />
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmFinalize}
        variant="warning"
        title={`Chốt điểm ${monthLabel(month)}?`}
        message="Sau khi chốt, điểm của tháng này sẽ được ghi nhận cố định."
        confirmLabel="Chốt tháng"
        onConfirm={handleFinalize}
        onCancel={() => setConfirmFinalize(false)}
      />

      {detailMemberId && (
        <MemberDetailModal
          memberId={detailMemberId}
          month={month}
          isAdmin={isAdmin}
          isMember={isMember}
          onClose={() => setDetailMemberId(null)}
          onChanged={load}
        />
      )}
    </div>
  )
}

// ════════════════════════ MODAL CHI TIẾT THÀNH VIÊN ════════════════════════
interface MemberDetailModalProps {
  memberId: string
  month: string
  isAdmin: boolean
  isMember: boolean
  onClose: () => void
  onChanged: () => void
}

function MemberDetailModal({ memberId, month, isAdmin, isMember, onClose, onChanged }: MemberDetailModalProps) {
  const [detail, setDetail] = useState<MemberDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [rules, setRules] = useState<ScoringRule[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null)

  // Form thêm event
  const [ruleId, setRuleId] = useState<string>('')
  const [category, setCategory] = useState<Category>('BONUS')
  const [label, setLabel] = useState('')
  const [delta, setDelta] = useState<string>('')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await api.get(`/scoring/member/${memberId}?month=${month}`)
      setDetail((res.data?.data ?? null) as MemberDetail | null)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [memberId, month])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!isAdmin) return
    api.get('/scoring/rules')
      .then((res) => setRules((res.data?.data ?? []) as ScoringRule[]))
      .catch(() => setRules([]))
  }, [isAdmin])

  const activeRules = useMemo(() => rules.filter((r) => r.active), [rules])

  const resetForm = () => {
    setRuleId('')
    setCategory('BONUS')
    setLabel('')
    setDelta('')
    setNote('')
  }

  const onSelectRule = (id: string) => {
    setRuleId(id)
    const rule = activeRules.find((r) => r.id === id)
    if (rule) {
      setCategory(rule.category)
      setLabel(rule.label)
      setDelta(String(rule.delta))
    }
  }

  const handleAddEvent = async () => {
    const parsedDelta = Number(delta)
    if (!label.trim()) { toast.error('Vui lòng nhập nội dung'); return }
    if (!Number.isInteger(parsedDelta) || parsedDelta < -100 || parsedDelta > 100) {
      toast.error('Điểm phải là số nguyên từ -100 đến 100')
      return
    }
    setSaving(true)
    try {
      await api.post('/scoring/events', {
        memberId,
        ruleId: ruleId || undefined,
        category,
        label: label.trim(),
        delta: parsedDelta,
        periodMonth: month,
        note: note.trim() || undefined,
      })
      toast.success('Đã thêm sự kiện chấm điểm')
      resetForm()
      setShowForm(false)
      await load()
      onChanged()
    } catch (err) {
      toast.error(apiMessage(err, 'Thêm sự kiện thất bại'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!deleteEventId) return
    const id = deleteEventId
    setDeleteEventId(null)
    try {
      await api.delete(`/scoring/events/${id}`)
      toast.success('Đã xóa sự kiện')
      await load()
      onChanged()
    } catch (err) {
      toast.error(apiMessage(err, 'Xóa sự kiện thất bại'))
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={detail?.memberName ?? 'Chi tiết chấm điểm'}
      subtitle={monthLabel(month)}
    >
      {loading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : !detail ? (
        <EmptyState icon={<Award size={24} />} title="Không có dữ liệu" />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Tổng + xếp loại */}
          <div className="flex items-center justify-between rounded-[16px] border p-4 [background:var(--pf-primary-soft)] border-[color:var(--pf-border)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide [color:var(--pf-color-muted)]">Tổng điểm</p>
              <p className="text-3xl font-bold tabular-nums [color:var(--pf-text)]">{detail.total}</p>
            </div>
            <StatusBadge tone={classificationTone(detail.classification)}>{detail.classification}</StatusBadge>
          </div>

          {/* Điểm tự động (điểm danh + tài chính) — chỉ hiển thị, không sửa/xóa */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold [color:var(--pf-text)]">
              Điểm tự động (điểm danh + tài chính)
            </p>
            {detail.autoLines.length === 0 ? (
              <p className="rounded-[16px] border border-dashed p-3 text-sm [color:var(--pf-color-muted)] border-[color:var(--pf-border)]">
                Không có khoản trừ tự động (đủ chuyên cần, đóng quỹ đầy đủ).
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {detail.autoLines.map((line, i) => (
                  <li
                    key={`${line.label}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-[16px] border p-3 [background:var(--pf-surface)] border-[color:var(--pf-border)]"
                  >
                    <span className="min-w-0 text-sm [color:var(--pf-text)]">{line.label}</span>
                    <span
                      className="inline-flex shrink-0 items-center gap-1 text-sm font-bold tabular-nums"
                      style={{ color: line.delta >= 0 ? 'var(--pf-color-success)' : 'var(--pf-color-danger)' }}
                    >
                      {line.delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {line.delta > 0 ? '+' : ''}{line.delta}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Điều chỉnh thủ công */}
          <p className="text-sm font-semibold [color:var(--pf-text)]">Điều chỉnh thủ công</p>

          {/* Form thêm event (chỉ admin, ẩn với MEMBER_VIEW) */}
          {isAdmin && !isMember && (
            showForm ? (
              <div className="flex flex-col gap-3 rounded-[16px] border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)]">
                <p className="text-sm font-semibold [color:var(--pf-text)]">Thêm sự kiện chấm điểm</p>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="[color:var(--pf-color-muted)]">Chọn quy tắc (tùy chọn)</span>
                  <select
                    value={ruleId}
                    onChange={(e) => onSelectRule(e.target.value)}
                    className="min-h-11 rounded-xl border px-3 [background:var(--pf-surface)] border-[color:var(--pf-border)] [color:var(--pf-text)]"
                  >
                    <option value="">— Nhập tay —</option>
                    {activeRules.map((r) => (
                      <option key={r.id} value={r.id}>
                        {CATEGORY_LABELS[r.category]} · {r.label} ({r.delta > 0 ? '+' : ''}{r.delta})
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="[color:var(--pf-color-muted)]">Nhóm</span>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Category)}
                      disabled={!!ruleId}
                      className="min-h-11 rounded-xl border px-3 [background:var(--pf-surface)] border-[color:var(--pf-border)] [color:var(--pf-text)] disabled:opacity-60"
                    >
                      {CATEGORY_ORDER.map((c) => (
                        <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="[color:var(--pf-color-muted)]">Điểm (−100…100)</span>
                    <input
                      type="number"
                      min={-100}
                      max={100}
                      value={delta}
                      onChange={(e) => setDelta(e.target.value)}
                      disabled={!!ruleId}
                      className="min-h-11 rounded-xl border px-3 tabular-nums [background:var(--pf-surface)] border-[color:var(--pf-border)] [color:var(--pf-text)] disabled:opacity-60"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="[color:var(--pf-color-muted)]">Nội dung</span>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    disabled={!!ruleId}
                    placeholder="Vd: Tham gia đầy đủ buổi sinh hoạt"
                    className="min-h-11 rounded-xl border px-3 [background:var(--pf-surface)] border-[color:var(--pf-border)] [color:var(--pf-text)] disabled:opacity-60"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="[color:var(--pf-color-muted)]">Ghi chú (tùy chọn)</span>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="min-h-11 rounded-xl border px-3 [background:var(--pf-surface)] border-[color:var(--pf-border)] [color:var(--pf-text)]"
                  />
                </label>

                <div className="flex justify-end gap-2">
                  <ActionButton variant="ghost" onClick={() => { resetForm(); setShowForm(false) }} className="min-h-11">Hủy</ActionButton>
                  <ActionButton onClick={handleAddEvent} disabled={saving} className="min-h-11">Lưu</ActionButton>
                </div>
              </div>
            ) : (
              <ActionButton variant="secondary" icon={<Plus size={16} />} onClick={() => setShowForm(true)} className="min-h-11 self-start">
                Thêm sự kiện
              </ActionButton>
            )
          )}

          {/* Danh sách điều chỉnh thủ công */}
          {detail.events.length === 0 ? (
            <EmptyState icon={<Award size={22} />} title="Chưa có điều chỉnh thủ công nào" />
          ) : (
            <ul className="flex flex-col gap-2">
              {detail.events.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-center justify-between gap-3 rounded-[16px] border p-3 [background:var(--pf-surface)] border-[color:var(--pf-border)]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium [color:var(--pf-text)]">{ev.label}</span>
                    </div>
                    <p className="mt-0.5 text-xs [color:var(--pf-color-muted)]">
                      {CATEGORY_LABELS[ev.category]} · {formatDate(ev.createdAt)}
                      {ev.note ? ` · ${ev.note}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1 text-sm font-bold tabular-nums"
                      style={{ color: ev.delta >= 0 ? 'var(--pf-color-success)' : 'var(--pf-color-danger)' }}
                    >
                      {ev.delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {ev.delta > 0 ? '+' : ''}{ev.delta}
                    </span>
                    {isAdmin && !isMember && (
                      <button
                        type="button"
                        onClick={() => setDeleteEventId(ev.id)}
                        aria-label="Xóa sự kiện"
                        className="flex h-11 w-11 items-center justify-center rounded-full [color:var(--pf-color-danger)] hover:[background:var(--pf-color-danger-soft)] transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteEventId}
        title="Xóa sự kiện chấm điểm?"
        message="Sự kiện sẽ bị xóa và điểm tổng được tính lại."
        onConfirm={handleDeleteEvent}
        onCancel={() => setDeleteEventId(null)}
      />
    </Modal>
  )
}

// ════════════════════════ TAB 2: THANG ĐIỂM ════════════════════════
function RulesTab() {
  const [rules, setRules] = useState<ScoringRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editRule, setEditRule] = useState<ScoringRule | null>(null)
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await api.get('/scoring/rules')
      setRules((res.data?.data ?? []) as ScoringRule[])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const grouped = useMemo(() => {
    const map: Record<Category, ScoringRule[]> = {
      PARTICIPATION: [], CONDUCT: [], CONTRIBUTION: [], DISCIPLINE: [], FINANCE: [], BONUS: [],
    }
    for (const r of rules) map[r.category]?.push(r)
    for (const c of CATEGORY_ORDER) {
      map[c].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'vi'))
    }
    return map
  }, [rules])

  const handleDelete = async () => {
    if (!deleteRuleId) return
    const id = deleteRuleId
    setDeleteRuleId(null)
    try {
      await api.delete(`/scoring/rules/${id}`)
      toast.success('Đã xóa quy tắc')
      await load()
    } catch (err) {
      toast.error(apiMessage(err, 'Xóa quy tắc thất bại'))
    }
  }

  const toggleActive = async (rule: ScoringRule) => {
    try {
      await api.patch(`/scoring/rules/${rule.id}`, { active: !rule.active })
      toast.success(rule.active ? 'Đã tắt quy tắc' : 'Đã bật quy tắc')
      await load()
    } catch (err) {
      toast.error(apiMessage(err, 'Cập nhật thất bại'))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <ActionButton icon={<Plus size={16} />} onClick={() => setShowAdd(true)} className="min-h-11">
          Thêm quy tắc
        </ActionButton>
      </div>

      {loading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : rules.length === 0 ? (
        <EmptyState
          icon={<Award size={24} />}
          title="Chưa có quy tắc chấm điểm"
          description='Bấm "Thêm quy tắc" để bắt đầu.'
        />
      ) : (
        <div className="flex flex-col gap-5">
          {CATEGORY_ORDER.filter((c) => grouped[c].length > 0).map((c) => (
            <div key={c} className="rounded-[20px] border p-4 sm:p-5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide [color:var(--pf-color-muted)]">
                {CATEGORY_LABELS[c]}
              </h3>
              <ul className="flex flex-col gap-2">
                {grouped[c].map((rule) => (
                  <li
                    key={rule.id}
                    className="flex items-center justify-between gap-3 rounded-[16px] border p-3 border-[color:var(--pf-border)]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-medium [color:var(--pf-text)] ${rule.active ? '' : 'line-through opacity-60'}`}>
                          {rule.label}
                        </span>
                        <StatusBadge tone={rule.source === 'AUTO' ? 'info' : 'neutral'}>
                          {rule.source === 'AUTO' ? 'Tự động' : 'Thủ công'}
                        </StatusBadge>
                        {!rule.active && <StatusBadge tone="warning">Đang tắt</StatusBadge>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{ color: rule.delta >= 0 ? 'var(--pf-color-success)' : 'var(--pf-color-danger)' }}
                      >
                        {rule.delta > 0 ? '+' : ''}{rule.delta}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleActive(rule)}
                        className="min-h-11 rounded-full px-3 text-sm font-semibold [color:var(--pf-primary)] hover:[background:var(--pf-primary-soft)] transition-colors"
                      >
                        {rule.active ? 'Tắt' : 'Bật'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditRule(rule)}
                        className="min-h-11 rounded-full px-3 text-sm font-semibold [color:var(--pf-text)] hover:[background:var(--pf-color-muted-soft)] transition-colors"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteRuleId(rule.id)}
                        aria-label="Xóa quy tắc"
                        className="flex h-11 w-11 items-center justify-center rounded-full [color:var(--pf-color-danger)] hover:[background:var(--pf-color-danger-soft)] transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <RuleFormModal
          mode="add"
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load() }}
        />
      )}
      {editRule && (
        <RuleFormModal
          mode="edit"
          rule={editRule}
          onClose={() => setEditRule(null)}
          onSaved={() => { setEditRule(null); load() }}
        />
      )}

      <ConfirmDialog
        open={!!deleteRuleId}
        title="Xóa quy tắc chấm điểm?"
        message="Quy tắc sẽ bị xóa vĩnh viễn."
        onConfirm={handleDelete}
        onCancel={() => setDeleteRuleId(null)}
      />
    </div>
  )
}

// ── Form thêm/sửa quy tắc ────────────────────────────────────────────────
interface RuleFormModalProps {
  mode: 'add' | 'edit'
  rule?: ScoringRule
  onClose: () => void
  onSaved: () => void
}

function RuleFormModal({ mode, rule, onClose, onSaved }: RuleFormModalProps) {
  const [category, setCategory] = useState<Category>(rule?.category ?? 'BONUS')
  const [label, setLabel] = useState(rule?.label ?? '')
  const [delta, setDelta] = useState<string>(rule ? String(rule.delta) : '')
  const [active, setActive] = useState(rule?.active ?? true)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const parsedDelta = Number(delta)
    if (!label.trim()) { toast.error('Vui lòng nhập nội dung quy tắc'); return }
    if (!Number.isInteger(parsedDelta) || parsedDelta < -100 || parsedDelta > 100) {
      toast.error('Điểm phải là số nguyên từ -100 đến 100')
      return
    }
    setSaving(true)
    try {
      if (mode === 'add') {
        await api.post('/scoring/rules', {
          category,
          label: label.trim(),
          delta: parsedDelta,
          source: 'MANUAL',
        })
        toast.success('Đã thêm quy tắc')
      } else if (rule) {
        await api.patch(`/scoring/rules/${rule.id}`, {
          label: label.trim(),
          delta: parsedDelta,
          active,
        })
        toast.success('Đã cập nhật quy tắc')
      }
      onSaved()
    } catch (err) {
      toast.error(apiMessage(err, 'Lưu quy tắc thất bại'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={mode === 'add' ? 'Thêm quy tắc chấm điểm' : 'Sửa quy tắc chấm điểm'}
      footer={
        <>
          <ActionButton variant="ghost" onClick={onClose} className="min-h-11">Hủy</ActionButton>
          <ActionButton onClick={handleSave} disabled={saving} className="min-h-11">Lưu</ActionButton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="[color:var(--pf-color-muted)]">Nhóm</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            disabled={mode === 'edit'}
            className="min-h-11 rounded-xl border px-3 [background:var(--pf-surface)] border-[color:var(--pf-border)] [color:var(--pf-text)] disabled:opacity-60"
          >
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="[color:var(--pf-color-muted)]">Nội dung</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Vd: Đi trễ buổi sinh hoạt"
            className="min-h-11 rounded-xl border px-3 [background:var(--pf-surface)] border-[color:var(--pf-border)] [color:var(--pf-text)]"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="[color:var(--pf-color-muted)]">Điểm (−100…100)</span>
          <input
            type="number"
            min={-100}
            max={100}
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            className="min-h-11 rounded-xl border px-3 tabular-nums [background:var(--pf-surface)] border-[color:var(--pf-border)] [color:var(--pf-text)]"
          />
        </label>

        {mode === 'edit' && (
          <label className="flex items-center gap-2 text-sm [color:var(--pf-text)]">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
            Quy tắc đang áp dụng
          </label>
        )}
      </div>
    </Modal>
  )
}
