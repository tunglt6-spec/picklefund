import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import {
  Users, UserCheck, CalendarDays, TrendingUp, TrendingDown, Wallet,
  Trophy, Bot, Sparkles, AlertTriangle, Info, ListChecks, RefreshCw,
  FileText, Sheet, Image as ImageIcon, Printer, Crown, ArrowUpRight, ArrowDownLeft,
  Fingerprint, LineChart, Mail, Send,
} from 'lucide-react'
import { ChartCard, MetricCard, ActionButton } from '../../components/shared'
import { useAuthStore } from '../../store/authStore'
import { useClubDataStore } from '../../store/clubDataStore'
import api from '../../lib/api'
import { formatVND, getActiveChungPeriod } from '../../lib/utils'
import {
  exportExcel, captureElementAsReportPng, captureElementAsReportPDF, setExportBranding,
} from '../../lib/export'
import toast from 'react-hot-toast'

const CHART_INCOME = '#059669'
const CHART_EXPENSE = '#E11D48'
const CAPTURE_ID = 'exec-report-capture'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Report = any

function healthColor(v: number) {
  if (v >= 80) return '#059669'
  if (v >= 60) return '#0EA5E9'
  if (v >= 50) return '#F59E0B'
  return '#E11D48'
}
function Stars({ n }: { n: number }) {
  if (n <= 0) return <span title="Dưới 50 điểm">⚠️</span>
  return <span className="tracking-tight">{'⭐'.repeat(n)}</span>
}
function fmtDate(d: string | Date | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}
function DeltaBadge({ v }: { v: number | null }) {
  if (v == null) return <span className="text-[11px] [color:var(--pf-color-muted)]">— (không có kỳ trước)</span>
  const up = v >= 0
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[11px] font-semibold"
      style={{ color: up ? 'var(--pf-green)' : 'var(--pf-accent-rose, #E11D48)' }}
    >
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? '+' : ''}{v}% vs kỳ trước
    </span>
  )
}

export function ExecutiveReport() {
  const clubId = useAuthStore((s) => s.user?.clubId ?? '')
  const { getClubData } = useClubDataStore()
  const clubData = getClubData(clubId)
  const periods = useMemo(
    () => [...clubData.fundPeriods].sort((a, b) => (a.startDate < b.startDate ? 1 : -1)),
    [clubData.fundPeriods],
  )
  const defaultPeriod =
    getActiveChungPeriod(clubData.fundPeriods) ??
    clubData.fundPeriods.find((p) => (p.type ?? 'chung') === 'chung') ??
    clubData.fundPeriods[0]

  const [periodId, setPeriodId] = useState(defaultPeriod?.id ?? '')
  const [data, setData] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [aiSum, setAiSum] = useState<{ text: string; generatedBy: string } | null>(null)
  const [aiSumLoading, setAiSumLoading] = useState(false)
  const [emailCfg, setEmailCfg] = useState<any>(null)
  const [emailBusy, setEmailBusy] = useState(false)

  const loadEmailCfg = useCallback(async () => {
    try {
      const res = await api.get('/aido/executive-report/auto-email')
      setEmailCfg(res.data?.data ?? res.data)
    } catch { /* im lặng — chỉ là cấu hình phụ */ }
  }, [])
  useEffect(() => { void loadEmailCfg() }, [loadEmailCfg])

  const toggleAutoEmail = async () => {
    if (!emailCfg) return
    setEmailBusy(true)
    try {
      const res = await api.patch('/aido/executive-report/auto-email', { enabled: !emailCfg.enabled })
      setEmailCfg(res.data?.data ?? res.data)
      toast.success(!emailCfg.enabled ? 'Đã bật tự-gửi email hằng tháng' : 'Đã tắt tự-gửi email')
    } catch { toast.error('Không đổi được cài đặt') }
    setEmailBusy(false)
  }
  const testEmail = async () => {
    setEmailBusy(true)
    const t = toast.loading('Đang gửi thử…')
    try {
      const res = await api.post('/aido/executive-report/auto-email/test')
      const d = res.data?.data ?? res.data
      toast.dismiss(t)
      if (!d.smtpReady) toast.error('Server chưa cấu hình SMTP — chưa gửi được email')
      else if (d.sent > 0) toast.success(`Đã gửi ${d.sent} email tới admin CLB`)
      else toast('Không có email admin hợp lệ để gửi (kiểm tra email tài khoản admin)', { icon: '⚠️' })
    } catch { toast.dismiss(t); toast.error('Gửi thử thất bại') }
    setEmailBusy(false)
  }

  const load = useCallback(async (pid: string) => {
    if (!pid) return
    setLoading(true)
    setError(false)
    try {
      const res = await api.get(`/aido/executive-report?fundPeriodId=${pid}`, { timeout: 30000 })
      setData(res.data?.data ?? res.data)
    } catch {
      setError(true)
    }
    setLoading(false)
  }, [])

  // AI Executive Summary — tải LƯỜI riêng (LLM có độ trễ) để không chặn render báo cáo.
  const loadAi = useCallback(async (pid: string) => {
    if (!pid) return
    setAiSumLoading(true)
    setAiSum(null)
    try {
      const res = await api.get(`/aido/executive-report/ai-summary?fundPeriodId=${pid}`, { timeout: 45000 })
      const d = res.data?.data ?? res.data
      setAiSum({ text: d.text, generatedBy: d.generatedBy })
    } catch {
      setAiSum(null)
    }
    setAiSumLoading(false)
  }, [])

  useEffect(() => {
    if (periodId) { void load(periodId); void loadAi(periodId) }
  }, [periodId, load, loadAi])

  // ── Export ────────────────────────────────────────────────────────────
  const prepBranding = () => {
    setExportBranding({ displayName: data?.meta?.clubName || 'PickleFund' })
  }
  const exportImage = async () => {
    if (!data) return
    prepBranding()
    try {
      await captureElementAsReportPng(CAPTURE_ID, `BaoCao_DieuHanh_${data.meta.periodName}`, {
        title: 'Báo cáo điều hành',
        subtitle: `${data.meta.clubName} · ${data.meta.periodName}`,
        meta: `Điểm sức khỏe CLB: ${data.summary.clubHealthScore}/100`,
      })
    } catch {
      toast.error('Không xuất được ảnh')
    }
  }
  const exportPdf = async () => {
    if (!data) return
    prepBranding()
    const t = toast.loading('Đang tạo PDF toàn trang…')
    try {
      await captureElementAsReportPDF(CAPTURE_ID, `BaoCao_DieuHanh_${data.meta.periodName}`, {
        title: 'Báo cáo điều hành',
        subtitle: `${data.meta.clubName} · ${data.meta.periodName}`,
        meta: `Điểm sức khỏe CLB: ${data.summary.clubHealthScore}/100`,
      })
      toast.dismiss(t)
    } catch {
      toast.dismiss(t)
      toast.error('Không tạo được PDF')
    }
  }
  const exportXlsx = () => {
    if (!data) return
    prepBranding()
    const f = data.finance
    exportExcel(`BaoCao_DieuHanh_${data.meta.periodName}`, [
      {
        name: 'Tổng quan',
        headers: ['Chỉ số', 'Giá trị'],
        rows: [
          ['Kỳ', data.meta.periodName],
          ['Điểm sức khỏe CLB', `${data.summary.clubHealthScore}/100`],
          ['Thành viên hoạt động', `${data.summary.activeMembers}/${data.summary.totalMembers}`],
          ['Tỷ lệ tham gia', `${data.summary.participationRate}%`],
          ['Tổng thu', f.totalIncome],
          ['Tổng chi', f.totalExpense],
          ['Cân đối', f.balance],
          ['Quỹ đầu kỳ', f.carryForward],
          ['Tổng tài sản (cuối kỳ)', f.clubAssets],
          ['Công nợ (số TV)', data.summary.outstandingCount],
        ],
      },
      {
        name: 'Thành viên',
        headers: ['#', 'Thành viên', 'Tham gia (%)', 'Đóng quỹ', 'Hạnh kiểm', 'Sức khỏe'],
        rows: data.members.all.map((m: any, i: number) => [
          i + 1, m.name, m.participationRate,
          m.paymentStatus === 'paid' ? 'Đã đóng' : m.paymentStatus === 'debt' ? 'Nợ' : '—',
          m.conductScore ?? '', m.healthScore,
        ]),
      },
    ])
  }

  // ── States ────────────────────────────────────────────────────────────
  if (periods.length === 0)
    return (
      <div className="rounded-2xl border p-8 text-center [border-color:var(--pf-border)]" style={{ background: 'var(--pf-surface)' }}>
        <p className="text-sm font-medium [color:var(--pf-text)]">Chưa có kỳ quỹ nào</p>
        <p className="mt-1 text-xs [color:var(--pf-color-muted)]">Tạo kỳ quỹ ở màn Tài chính để xem báo cáo điều hành.</p>
      </div>
    )

  const periodPicker = (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={periodId}
        onChange={(e) => setPeriodId(e.target.value)}
        className="rounded-xl border px-3 py-2 text-sm font-medium [border-color:var(--pf-border)] [color:var(--pf-text)]"
        style={{ background: 'var(--pf-surface)' }}
      >
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}{p.status === 'active' ? ' (đang mở)' : ''}
          </option>
        ))}
      </select>
      <ActionButton variant="ghost" icon={<RefreshCw size={15} className={loading ? 'animate-spin' : ''} />} onClick={() => void load(periodId)} disabled={loading}>
        {loading ? 'Đang tải…' : 'Làm mới'}
      </ActionButton>
      {data && (
        <div className="flex flex-wrap items-center gap-1.5">
          <ActionButton variant="ghost" icon={<FileText size={15} />} onClick={() => void exportPdf()}>PDF</ActionButton>
          <ActionButton variant="ghost" icon={<Sheet size={15} />} onClick={exportXlsx}>Excel</ActionButton>
          <ActionButton variant="ghost" icon={<ImageIcon size={15} />} onClick={() => void exportImage()}>Ảnh</ActionButton>
          <ActionButton variant="ghost" icon={<Printer size={15} />} onClick={() => window.print()}>In</ActionButton>
        </div>
      )}
    </div>
  )

  if (loading && !data) return <div className="space-y-3">{periodPicker}<ReportSkeleton /></div>
  if (error)
    return (
      <div className="space-y-3">
        {periodPicker}
        <div className="rounded-2xl border p-6 text-center [border-color:var(--pf-border)]" style={{ background: 'var(--pf-surface)' }}>
          <p className="text-sm font-medium [color:var(--pf-text)]">Không tải được báo cáo</p>
          <ActionButton className="mt-3" onClick={() => void load(periodId)}>Thử lại</ActionButton>
        </div>
      </div>
    )
  if (!data) return <div>{periodPicker}</div>

  const s = data.summary
  const f = data.finance
  const health = data.health
  const ai = data.ai

  return (
    <div className="space-y-5">
      {periodPicker}

      {/* Cài đặt tự-gửi email hằng tháng (ngoài vùng capture — không vào PDF/ảnh) */}
      {emailCfg && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border p-3.5 [border-color:var(--pf-border)]" style={{ background: 'var(--pf-surface)' }}>
          <Mail size={16} className="[color:var(--pf-primary,#6D5DFB)]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold [color:var(--pf-text)]">Tự gửi báo cáo qua email đầu mỗi tháng</p>
            <p className="text-[11px] [color:var(--pf-color-muted)]">
              Gửi cho admin CLB{emailCfg.recipients?.length ? `: ${emailCfg.recipients.filter((r: any) => !r.isPlaceholder).map((r: any) => r.email).join(', ') || '(chưa có email hợp lệ)'}` : ''}
              {emailCfg.recipients?.some((r: any) => r.isPlaceholder) && ' · một số admin chưa đặt email thật'}
              {!emailCfg.smtpReady && ' · ⚠️ server chưa cấu hình SMTP (chưa gửi được)'}
              {emailCfg.lastSent && ` · gửi gần nhất: ${emailCfg.lastSent}`}
            </p>
          </div>
          <button onClick={() => void testEmail()} disabled={emailBusy} className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium [border-color:var(--pf-border)] [color:var(--pf-text)] disabled:opacity-50">
            <Send size={13} /> Gửi thử
          </button>
          <button
            onClick={() => void toggleAutoEmail()}
            disabled={emailBusy}
            className="relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50"
            style={{ background: emailCfg.enabled ? 'var(--pf-primary,#6D5DFB)' : 'var(--pf-border)' }}
            aria-label="Bật/tắt tự gửi email"
          >
            <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all" style={{ left: emailCfg.enabled ? '22px' : '2px' }} />
          </button>
        </div>
      )}

      <div id={CAPTURE_ID} className="space-y-5">
        {/* ── AI Executive Summary (tải lười) ──────────────────────── */}
        <div className="rounded-2xl border p-4 [border-color:var(--pf-border)]" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, #6D5DFB 8%, var(--pf-surface)), var(--pf-surface))' }}>
          <div className="mb-2 flex items-center gap-2">
            <Bot size={16} className="[color:var(--pf-primary,#6D5DFB)]" />
            <h3 className="text-sm font-bold [color:var(--pf-text)]">Tóm tắt điều hành (AI)</h3>
            {aiSum && (
              <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: 'color-mix(in srgb, var(--pf-primary,#6D5DFB) 14%, transparent)', color: 'var(--pf-primary,#6D5DFB)' }}>
                {aiSum.generatedBy === 'ai' ? '✨ Maika AI viết' : 'Tổng hợp tự động'}
              </span>
            )}
          </div>
          {aiSumLoading ? (
            <div className="space-y-1.5">
              <div className="h-3 w-3/4 animate-pulse rounded" style={{ background: 'var(--pf-border)' }} />
              <div className="h-3 w-full animate-pulse rounded" style={{ background: 'var(--pf-border)' }} />
              <div className="h-3 w-5/6 animate-pulse rounded" style={{ background: 'var(--pf-border)' }} />
              <p className="pt-1 text-[11px] [color:var(--pf-color-muted)]">Maika đang soạn tóm tắt…</p>
            </div>
          ) : aiSum ? (
            <p className="whitespace-pre-line text-[13px] leading-relaxed [color:var(--pf-text)]">{aiSum.text}</p>
          ) : (
            <p className="text-xs [color:var(--pf-color-muted)]">Chưa tạo được tóm tắt. <button className="underline" onClick={() => void loadAi(periodId)}>Thử lại</button></p>
          )}
        </div>

        {/* ── Club Health Score (hero) ─────────────────────────────── */}
        <div
          className="rounded-2xl border p-5 sm:flex sm:items-center sm:gap-6 [border-color:var(--pf-border)]"
          style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--pf-primary, #6D5DFB) 12%, var(--pf-surface)), var(--pf-surface))' }}
        >
          <div className="flex items-center gap-4">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(${healthColor(health.overall)} ${health.overall}%, var(--pf-border) 0)` }}>
              <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full" style={{ background: 'var(--pf-surface)' }}>
                <span className="text-2xl font-bold tabular-nums" style={{ color: healthColor(health.overall) }}>{health.overall}</span>
                <span className="text-[10px] [color:var(--pf-color-muted)]">/ 100</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="[color:var(--pf-primary,#6D5DFB)]" />
                <h3 className="text-base font-bold [color:var(--pf-text)]">Điểm sức khỏe CLB</h3>
              </div>
              <p className="mt-0.5 text-xs [color:var(--pf-color-muted)]">{data.meta.clubName} · {data.meta.periodName}</p>
              <p className="mt-1 text-[11px] [color:var(--pf-color-muted)]">Tổng hợp 6 chiều · số liệu thật từ kỳ quỹ</p>
            </div>
          </div>
          <div className="mt-4 grid flex-1 grid-cols-2 gap-2 sm:mt-0 sm:grid-cols-3">
            {health.dimensions.map((d: any) => (
              <div key={d.key} className="rounded-xl border p-2.5 [border-color:var(--pf-border)]" style={{ background: 'var(--pf-surface)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium [color:var(--pf-color-muted)]">{d.key}</span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: d.score == null ? 'var(--pf-color-muted)' : healthColor(d.score) }}>
                    {d.score == null ? '—' : d.score}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--pf-border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${d.score ?? 0}%`, background: d.score == null ? 'transparent' : healthColor(d.score) }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Executive Summary KPIs ───────────────────────────────── */}
        <div>
          <SectionTitle icon={<Sparkles size={15} />} title="Tổng quan điều hành" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            <MetricCard accent="blue" icon={<Users size={18} />} label="Thành viên" value={s.totalMembers} sub={`${s.activeMembers} đang hoạt động`} />
            <MetricCard accent="teal" icon={<UserCheck size={18} />} label="Tỷ lệ tham gia" value={`${s.participationRate}%`} sub="điểm danh / sĩ số" />
            <MetricCard accent="violet" icon={<CalendarDays size={18} />} label="Buổi chơi" value={s.totalSessions} sub={`${s.completedSessions} xong · ${s.cancelledSessions} hủy`} />
            <MetricCard accent="amber" icon={<Trophy size={18} />} label="Giải / Minigame" value={s.tournamentsCount} sub="trong kỳ" />
            <MetricCard accent="green" icon={<ArrowUpRight size={18} />} label="Tổng thu" value={formatVND(s.totalIncome)} />
            <MetricCard accent="rose" icon={<ArrowDownLeft size={18} />} label="Tổng chi" value={formatVND(s.totalExpense)} />
            <MetricCard accent="blue" icon={<Wallet size={18} />} label="Tổng tài sản" value={formatVND(s.clubAssets)} sub="quỹ cuối kỳ" negative={s.clubAssets < 0} />
            <MetricCard accent="rose" icon={<AlertTriangle size={18} />} label="Công nợ" value={`${s.outstandingCount} TV`} sub="chưa/không đủ đóng" negative={s.outstandingCount > 0} />
          </div>
        </div>

        {/* ── Tài chính ────────────────────────────────────────────── */}
        <div>
          <SectionTitle icon={<Wallet size={15} />} title="Tài chính" note="Số liệu chuẩn theo kỳ quỹ (carry-forward)" />
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <ChartCard title="Thu / Chi theo kỳ" subtitle="6 kỳ gần nhất — dữ liệu tổ chức theo kỳ quỹ (không phải theo tuần)">
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(f.trends || []).map((t: any) => ({ name: t.name, Thu: t.thu, Chi: t.chi }))} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--pf-border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--pf-color-muted)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--pf-color-muted)' }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => { const x = Number(v); return x >= 1e6 ? `${(x / 1e6).toFixed(0)}M` : `${x / 1e3}k` }} />
                    <Tooltip formatter={(v) => formatVND(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid var(--pf-border)', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Thu" fill={CHART_INCOME} radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Chi" fill={CHART_EXPENSE} radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <div className="space-y-2.5 rounded-2xl border p-4 [border-color:var(--pf-border)]" style={{ background: 'var(--pf-surface)' }}>
              <FinRow label="Tổng thu" value={formatVND(f.totalIncome)} delta={f.compare?.incomeDeltaPct} />
              <FinRow label="Tổng chi" value={formatVND(f.totalExpense)} delta={f.compare?.expenseDeltaPct} />
              <FinRow label="Cân đối kỳ" value={formatVND(f.balance)} delta={f.compare?.balanceDeltaPct} strong negative={f.balance < 0} />
              <div className="my-1 border-t [border-color:var(--pf-border)]" />
              <FinRow label="Quỹ đầu kỳ" value={formatVND(f.carryForward)} />
              <FinRow label="Tổng tài sản (cuối kỳ)" value={formatVND(f.clubAssets)} strong />
              <FinRow label="Thu bình quân / TV" value={formatVND(f.avgIncomePerMember)} />
              <FinRow label="Chi bình quân / lượt" value={formatVND(Math.round(f.costPerAttendance || 0))} />
            </div>
          </div>
        </div>

        {/* ── Dự báo + Club DNA ────────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border p-4 [border-color:var(--pf-border)]" style={{ background: 'var(--pf-surface)' }}>
            <SectionTitle icon={<LineChart size={15} />} title="Dự báo 30–90 ngày" note="ước lượng theo xu hướng" compact />
            <div className="grid grid-cols-3 gap-2">
              {[['+30 ngày', data.forecast.projected30], ['+60 ngày', data.forecast.projected60], ['+90 ngày', data.forecast.projected90]].map(([lbl, val]) => (
                <div key={lbl as string} className="rounded-xl border px-3 py-2 text-center [border-color:var(--pf-border)]">
                  <p className="text-[11px] [color:var(--pf-color-muted)]">{lbl}</p>
                  <p className="text-sm font-bold tabular-nums" style={{ color: (val as number) < 0 ? 'var(--pf-accent-rose,#E11D48)' : 'var(--pf-text)' }}>{formatVND(val as number)}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs [color:var(--pf-color-muted)]">
              {data.forecast.dailyNet >= 0 ? <TrendingUp size={13} className="[color:var(--pf-green)]" /> : <TrendingDown size={13} style={{ color: 'var(--pf-accent-rose,#E11D48)' }} />}
              <span>{data.forecast.trendLabel} · dòng tiền ~{formatVND(data.forecast.dailyNet)}/ngày</span>
            </div>
            {data.forecast.runwayMonths != null && (
              <p className="mt-1 text-xs font-medium" style={{ color: 'var(--pf-accent-rose,#E11D48)' }}>⚠️ Nếu tiếp tục âm, quỹ trụ được ~{data.forecast.runwayMonths} tháng.</p>
            )}
            <p className="mt-2 text-[10px] italic [color:var(--pf-color-muted)]">{data.forecast.note}</p>
          </div>
          <div className="rounded-2xl border p-4 [border-color:var(--pf-border)]" style={{ background: 'var(--pf-surface)' }}>
            <SectionTitle icon={<Fingerprint size={15} />} title="Club DNA" note="phong cách vận hành" compact />
            <p className="mb-2 text-sm font-bold [color:var(--pf-primary,#6D5DFB)]">{data.dna.archetype}</p>
            <div className="space-y-1.5">
              {data.dna.traits.map((t: any) => (
                <div key={t.key}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="[color:var(--pf-color-muted)]">{t.key}</span>
                    <span className="font-semibold tabular-nums" style={{ color: healthColor(t.score) }}>{t.score}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--pf-border)' }}>
                    <div className="h-full rounded-full" style={{ width: `${t.score}%`, background: healthColor(t.score) }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] italic [color:var(--pf-color-muted)]">{data.dna.note}</p>
          </div>
        </div>

        {/* ── Member Intelligence ──────────────────────────────────── */}
        <div>
          <SectionTitle icon={<Users size={15} />} title="Thành viên — Health Score" note="40% tham gia · 30% đóng quỹ · 30% hạnh kiểm" />
          <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
            <div className="rounded-2xl border p-4 [border-color:var(--pf-border)]" style={{ background: 'var(--pf-surface)' }}>
              <p className="text-xs font-medium [color:var(--pf-color-muted)]">Điểm sức khỏe TB</p>
              <p className="text-3xl font-bold tabular-nums" style={{ color: healthColor(data.members.avgHealth) }}>{data.members.avgHealth}<span className="text-base [color:var(--pf-color-muted)]">/100</span></p>
              <div className="mt-3 space-y-1.5 text-xs">
                <DistRow label="Xuất sắc (≥90)" value={data.members.distribution.excellent} color="#059669" />
                <DistRow label="Tốt (80–89)" value={data.members.distribution.good} color="#0EA5E9" />
                <DistRow label="Khá (50–79)" value={data.members.distribution.fair} color="#F59E0B" />
                <DistRow label="Cần quan tâm (<50)" value={data.members.distribution.atRisk} color="#E11D48" />
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border [border-color:var(--pf-border)]" style={{ background: 'var(--pf-surface)' }}>
              <div className="border-b px-4 py-2.5 text-xs font-semibold [border-color:var(--pf-border)] [color:var(--pf-text)]">Top 10 thành viên</div>
              <div className="divide-y [--tw-divide-opacity:1] [&>*]:border-[color:var(--pf-border-soft,var(--pf-border))]">
                {data.members.top10.map((m: any, i: number) => (
                  <div key={m.memberId} className="flex items-center gap-3 px-4 py-2">
                    <span className="w-5 text-center text-xs font-bold [color:var(--pf-color-muted)]">{i + 1}</span>
                    <span className="flex-1 truncate text-sm [color:var(--pf-text)]">{m.name}</span>
                    <span className="hidden w-16 text-right text-xs [color:var(--pf-color-muted)] sm:inline">{m.participationRate}%</span>
                    <span className="w-14 text-right text-xs">{m.paymentStatus === 'debt' ? <span style={{ color: 'var(--pf-accent-rose,#E11D48)' }}>Nợ</span> : m.paymentStatus === 'paid' ? <span style={{ color: 'var(--pf-green)' }}>Đã đóng</span> : <span className="[color:var(--pf-color-muted)]">—</span>}</span>
                    <span className="w-20 text-right text-xs"><Stars n={m.stars} /></span>
                    <span className="w-9 text-right text-sm font-bold tabular-nums" style={{ color: healthColor(m.healthScore) }}>{m.healthScore}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Hoạt động + Thi đấu ──────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border p-4 [border-color:var(--pf-border)]" style={{ background: 'var(--pf-surface)' }}>
            <SectionTitle icon={<CalendarDays size={15} />} title="Hoạt động" compact />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label="Tổng buổi" value={data.activity.totalSessions} />
              <Stat label="Hoàn thành" value={data.activity.completed} />
              <Stat label="Bị hủy" value={data.activity.cancelled} />
              <Stat label="TB người/buổi" value={data.activity.avgPresentPerSession} />
            </div>
            <div className="mt-2 space-y-1 text-xs [color:var(--pf-color-muted)]">
              {data.activity.busiest && <p>🔥 Đông nhất: <b className="[color:var(--pf-text)]">{data.activity.busiest.name}</b> ({data.activity.busiest.present} người · {fmtDate(data.activity.busiest.date)})</p>}
              {data.activity.emptiest && <p>💤 Ít nhất: {data.activity.emptiest.name} ({data.activity.emptiest.present} người · {fmtDate(data.activity.emptiest.date)})</p>}
              <p className="italic">Tỷ lệ lấp đầy tính theo sĩ số hoạt động (hệ thống chưa có sức chứa/buổi).</p>
            </div>
          </div>
          <div className="rounded-2xl border p-4 [border-color:var(--pf-border)]" style={{ background: 'var(--pf-surface)' }}>
            <SectionTitle icon={<Trophy size={15} />} title="Thi đấu / Minigame" compact />
            <div className="grid grid-cols-3 gap-2 text-sm">
              <Stat label="Giải" value={data.tournament.tournamentsCount} />
              <Stat label="Trận" value={data.tournament.matchesCount} />
              <Stat label="Đội" value={data.tournament.teamsCount} />
            </div>
            {data.tournament.topPlayers.length > 0 ? (
              <div className="mt-2 space-y-1">
                {data.tournament.topPlayers.slice(0, 3).map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {i === 0 ? <Crown size={13} className="text-amber-500" /> : <span className="w-[13px] text-center [color:var(--pf-color-muted)]">{i + 1}</span>}
                    <span className="flex-1 truncate [color:var(--pf-text)]">{p.name}</span>
                    <span className="[color:var(--pf-color-muted)]">{p.wins}T · {p.winRate}%</span>
                  </div>
                ))}
                <p className="pt-1 text-[11px] italic [color:var(--pf-color-muted)]">Người dẫn đầu BXH (chưa có giải MVP chính thức).</p>
              </div>
            ) : (
              <p className="mt-3 text-xs [color:var(--pf-color-muted)]">Chưa có giải/minigame trong kỳ.</p>
            )}
          </div>
        </div>

        {/* ── AI Office ────────────────────────────────────────────── */}
        <div>
          <SectionTitle icon={<Bot size={15} />} title="Văn phòng AI (AIDO)" note={`Trong kỳ · điểm tự động hóa ${ai.automationScore.score}/100`} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <AiCard color="#6D5DFB" name="Hermes" main={`${ai.hermes.completed}/${ai.hermes.runs}`} unit="workflow xong" detail={`${ai.hermes.failed} lỗi · ${ai.hermes.running} đang chạy`} />
            <AiCard color="#0EA5E9" name="Lisa" main={String(ai.lisa.answered)} unit="hỏi–đáp" detail={`${ai.lisa.reminders} lượt nhắc`} />
            <AiCard color="#DB2777" name="Maika" main={String(ai.maika.insights)} unit="insight" detail={`${ai.maika.actions} đề xuất`} />
            <AiCard color="#EA580C" name="Mít Đặc" main={String(ai.mitdac.executed)} unit="tác vụ" detail={`${ai.mitdac.failed} lỗi · TB ${ai.mitdac.avgMs}ms`} />
            <AiCard color="#C026D3" name="Thông báo" main={String(ai.notification.sent)} unit="đã gửi" detail={`In-app ${ai.notification.byChannel.IN_APP} · Email ${ai.notification.byChannel.EMAIL} · TG ${ai.notification.byChannel.TELEGRAM}`} />
          </div>
          {ai.automationScore.noActivity && (
            <p className="mt-2 text-[11px] italic [color:var(--pf-color-muted)]">CLB chưa dùng tự động hóa AI trong kỳ này — điểm AI chưa phản ánh (không tính là "kém").</p>
          )}
        </div>

        {/* ── Timeline + Cảnh báo + Gợi ý ─────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border p-4 [border-color:var(--pf-border)]" style={{ background: 'var(--pf-surface)' }}>
            <SectionTitle icon={<ListChecks size={15} />} title="Dòng thời gian" compact />
            {data.timeline.length === 0 ? <p className="text-xs [color:var(--pf-color-muted)]">Chưa có sự kiện nổi bật.</p> : (
              <ol className="relative space-y-2.5 border-l pl-4 [border-color:var(--pf-border)]">
                {data.timeline.map((t: any, i: number) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full" style={{ background: t.type === 'income' ? 'var(--pf-green)' : t.type === 'expense' ? 'var(--pf-accent-rose,#E11D48)' : 'var(--pf-primary,#6D5DFB)' }} />
                    <p className="text-xs font-medium [color:var(--pf-text)]">{fmtDate(t.date)} · {t.label}</p>
                    {t.amount != null && <p className="text-[11px] [color:var(--pf-color-muted)]">{formatVND(t.amount)}</p>}
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="rounded-2xl border p-4 [border-color:var(--pf-border)]" style={{ background: 'var(--pf-surface)' }}>
            <SectionTitle icon={<AlertTriangle size={15} />} title="Cảnh báo" compact />
            {data.alerts.length === 0 ? <p className="text-xs [color:var(--pf-green)]">✓ Không có cảnh báo — CLB ổn định.</p> : (
              <ul className="space-y-2">
                {data.alerts.map((a: any, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs [color:var(--pf-text)]">
                    {a.level === 'warning' ? <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" /> : <Info size={14} className="mt-0.5 shrink-0 [color:var(--pf-color-muted)]" />}
                    <span>{a.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl border p-4 [border-color:var(--pf-border)]" style={{ background: 'var(--pf-surface)' }}>
            <SectionTitle icon={<Sparkles size={15} />} title="Gợi ý hành động" compact />
            {data.recommendations.length === 0 ? <p className="text-xs [color:var(--pf-color-muted)]">Không có đề xuất — mọi chỉ số đang tốt.</p> : (
              <ul className="space-y-2">
                {data.recommendations.map((r: any, i: number) => (
                  <li key={i} className="text-xs [color:var(--pf-text)]">
                    <span className="mr-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: 'color-mix(in srgb, var(--pf-primary,#6D5DFB) 14%, transparent)', color: 'var(--pf-primary,#6D5DFB)' }}>{r.agent}</span>
                    {r.text}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[10px] italic [color:var(--pf-color-muted)]">Gợi ý suy ra từ dữ liệu thật của kỳ · xem "Tóm tắt điều hành (AI)" ở đầu trang.</p>
          </div>
        </div>

        <p className="pt-1 text-center text-[11px] [color:var(--pf-color-muted)]">
          AIDO Executive Report v1.0 · mốc dữ liệu {new Date(data.generatedAt).toLocaleString('vi-VN')} · mọi con số từ CSDL thật
        </p>
      </div>
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────────────── */
function SectionTitle({ icon, title, note, compact }: { icon?: React.ReactNode; title: string; note?: string; compact?: boolean }) {
  return (
    <div className={compact ? 'mb-2 flex items-center gap-1.5' : 'mb-2.5 flex items-center gap-2'}>
      <span className="[color:var(--pf-primary,#6D5DFB)]">{icon}</span>
      <h3 className="text-sm font-bold [color:var(--pf-text)]">{title}</h3>
      {note && <span className="text-[11px] [color:var(--pf-color-muted)]">· {note}</span>}
    </div>
  )
}
function FinRow({ label, value, delta, strong, negative }: { label: string; value: string; delta?: number | null; strong?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs [color:var(--pf-color-muted)]">{label}</span>
      <div className="text-right">
        <span className={`tabular-nums ${strong ? 'text-sm font-bold' : 'text-xs font-semibold'}`} style={{ color: negative ? 'var(--pf-accent-rose,#E11D48)' : 'var(--pf-text)' }}>{value}</span>
        {delta !== undefined && <div><DeltaBadge v={delta ?? null} /></div>}
      </div>
    </div>
  )
}
function DistRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 [color:var(--pf-color-muted)]"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</span>
      <span className="font-semibold tabular-nums [color:var(--pf-text)]">{value}</span>
    </div>
  )
}
function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border px-3 py-2 [border-color:var(--pf-border)]">
      <p className="text-[11px] [color:var(--pf-color-muted)]">{label}</p>
      <p className="text-lg font-bold tabular-nums [color:var(--pf-text)]">{value}</p>
    </div>
  )
}
function AiCard({ color, name, main, unit, detail }: { color: string; name: string; main: string; unit: string; detail: string }) {
  return (
    <div className="rounded-2xl border p-3.5" style={{ background: `color-mix(in srgb, ${color} 7%, var(--pf-surface))`, borderColor: `color-mix(in srgb, ${color} 22%, var(--pf-border))`, borderTop: `3px solid ${color}` }}>
      <span className="text-[13px] font-semibold" style={{ color }}>{name}</span>
      <p className="mt-1 text-2xl font-bold leading-none" style={{ color }}>{main}<span className="ml-1 text-xs font-medium [color:var(--pf-color-muted)]">{unit}</span></p>
      <p className="mt-1.5 border-t pt-1.5 text-[11px] leading-snug [color:var(--pf-color-muted)]" style={{ borderColor: `color-mix(in srgb, ${color} 15%, var(--pf-border))` }}>{detail}</p>
    </div>
  )
}
function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-32 animate-pulse rounded-2xl" style={{ background: 'var(--pf-border)' }} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl" style={{ background: 'var(--pf-border)' }} />)}
      </div>
    </div>
  )
}
