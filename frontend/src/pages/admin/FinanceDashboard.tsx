/**
 * FinanceDashboard (07) — Dashboard tài chính theo UI Spec V2.2 đã duyệt.
 * 3 KPI (Tổng thu · Tổng chi · Tồn quỹ) + biểu đồ Thu/Chi theo quỹ + donut Cơ cấu quỹ.
 * Số liệu ĐỌC canonical từ Finance Engine (GET /fund-periods/:id/summary — Source of Truth),
 * KHÔNG tự tính (thống nhất Reports/PDF). Kỳ đang mở từ clubDataStore. Clean Modern SaaS.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import { ArrowUpRight, ArrowDownLeft, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatVND, getActiveChungPeriod } from '../../lib/utils'
import { exportReportsPDF, exportFinanceOverviewImage } from '../../lib/export'
import api from '../../lib/api'
import {
  PageShell, PageHeader, MetricCard, ChartCard, EmptyState, LoadingState, ErrorState,
  StatusBadge, ExportActions, type StatusTone,
} from '../../components/shared'

const FD_EXPORT_ID = 'finance-dashboard-export'

interface Summary {
  totalIncome: number
  totalExpenses: number
  balance: number
  miniIncome: number
  miniExpense: number
  miniBalance: number
  clubAssets: number
  carryForward: number
  unpaidCount: number
  // Dùng cho báo cáo PDF (khớp mẫu chung với tab Báo cáo)
  memberCount: number
  sessionCount: number
  confirmedCount: number
}

const num = (v: unknown): number => (v == null ? 0 : Number(v) || 0)
function isLocalToken(token?: string | null) {
  return !!token && (token.startsWith('local-token-') || token.startsWith('token-'))
}
const CHART_INCOME = '#059669' // --pf-green (tiền)
const CHART_EXPENSE = '#E11D48' // --pf-accent-rose (chi)
const DONUT_COMMON = '#059669' // Quỹ Chính
const DONUT_MINI = '#7C3AED' // Quỹ Phụ

export function FinanceDashboard() {
  const clubId = useAuthStore((s) => s.user?.clubId) ?? ''
  const accessToken = useAuthStore((s) => s.accessToken)
  const { fundPeriods, settings } = useClubDataStore((s) => s.getClubData(clubId))
  const clubName = (settings?.name as string | undefined)?.trim() || 'CLB Pickleball'
  const activePeriod = useMemo(
    () => getActiveChungPeriod(fundPeriods) ?? null,
    [fundPeriods],
  )

  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async (periodId: string) => {
    // Đồng bộ pattern với Reports.tsx/ThuChiHub.tsx/Debts.tsx: token demo/local thì
    // không gọi API thật (không có backend tương ứng) — tránh treo ErrorState vô ích.
    if (isLocalToken(accessToken)) {
      setSummary(null)
      setError(false)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(false)
    try {
      const res = await api.get(`/fund-periods/${periodId}/summary`)
      const d = (res.data?.data ?? res.data) as Record<string, unknown>
      const memberCount = num(d.memberCount)
      const unpaidCount = num(d.unpaidCount)
      // confirmedCount ưu tiên đếm từ danh sách members (contributionPaid) của Finance Engine;
      // không có thì suy ra = sĩ số tính phí − số chưa đóng (khớp mẫu báo cáo tab Báo cáo).
      const members = Array.isArray(d.members) ? (d.members as Array<{ contributionPaid?: boolean }>) : []
      const confirmedCount = members.length
        ? members.filter((m) => !!m.contributionPaid).length
        : Math.max(0, memberCount - unpaidCount)
      setSummary({
        totalIncome: num(d.totalIncome),
        totalExpenses: num(d.totalExpenses),
        balance: num(d.balance),
        miniIncome: num(d.miniIncome),
        miniExpense: num(d.miniExpense),
        miniBalance: num(d.miniBalance),
        // clubAssets & carryForward là OBJECT { balance, ... } từ Finance Engine → đọc .balance.
        clubAssets: num((d.clubAssets as { balance?: unknown } | undefined)?.balance),
        carryForward: num((d.carryForward as { balance?: unknown } | undefined)?.balance),
        unpaidCount,
        memberCount,
        sessionCount: num(d.totalSessions),
        confirmedCount,
      })
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    if (activePeriod) void load(activePeriod.id)
  }, [activePeriod, load])

  const chartData = useMemo(
    () =>
      summary
        ? [
            { name: 'Quỹ Chính', Thu: summary.totalIncome, Chi: summary.totalExpenses },
            { name: 'Quỹ Phụ', Thu: summary.miniIncome, Chi: summary.miniExpense },
          ]
        : [],
    [summary],
  )

  // Cơ cấu quỹ (tồn) — chỉ lấy phần dương để vẽ donut; nếu cả hai ≤0 thì rỗng.
  const donutData = useMemo(() => {
    if (!summary) return []
    const c = Math.max(0, summary.balance)
    const m = Math.max(0, summary.miniBalance)
    return c + m > 0
      ? [
          { name: 'Quỹ Chính', value: c, color: DONUT_COMMON },
          { name: 'Quỹ Phụ', value: m, color: DONUT_MINI },
        ]
      : []
  }, [summary])

  const alerts = useMemo(() => {
    if (!summary) return [] as { tone: StatusTone; msg: string }[]
    const a: { tone: StatusTone; msg: string }[] = []
    if (summary.balance < 0) a.push({ tone: 'danger', msg: 'Quỹ Chính đang âm.' })
    if (summary.miniBalance < 0) a.push({ tone: 'danger', msg: 'Quỹ Phụ đang âm.' })
    if (summary.unpaidCount > 0) a.push({ tone: 'warning', msg: `${summary.unpaidCount} thành viên chưa đóng đủ quỹ.` })
    if (a.length === 0) a.push({ tone: 'success', msg: 'Tài chính ổn định.' })
    return a
  }, [summary])

  const doExportPng = async () => {
    if (!summary || !activePeriod) { toast.error('Chưa có dữ liệu để xuất'); return }
    // ẢNH theo ĐÚNG FORM PDF (brand header + bảng đóng khung + summary + footer), luôn sáng —
    // thay cách chụp DOM dashboard sống (thưa, dính theme dark, không chuẩn báo cáo).
    try {
      await exportFinanceOverviewImage({
        clubName,
        periodName: activePeriod.name,
        totalIncome: summary.totalIncome,
        totalExpense: summary.totalExpenses,
        balance: summary.balance,
        miniBalance: summary.miniBalance,
        clubAssets: summary.clubAssets,
        carryForward: summary.carryForward,
        memberCount: summary.memberCount,
        sessionCount: summary.sessionCount,
        confirmedCount: summary.confirmedCount,
      })
      toast.success('Đã tải ảnh tổng quan tài chính')
    } catch { toast.error('Xuất ảnh thất bại') }
  }
  const doExportPdf = async () => {
    if (!summary || !activePeriod) { toast.error('Chưa có dữ liệu để xuất'); return }
    // PDF VECTOR chuẩn SaaS — DÙNG CHUNG mẫu với tab "Báo cáo" (buildQuyReportPDF): chữ nét,
    // nhẹ (KB thay vì raster ~7MB), header/branding thống nhất. Thay cách chụp DOM cũ (ảnh mờ,
    // méo tỉ lệ, dính theme dark). Tổng quan không kèm bảng kê thành viên (rows []).
    try {
      await exportReportsPDF({
        periodName: activePeriod.name,
        clubName,
        totalIncome: summary.totalIncome,
        totalExpense: summary.totalExpenses,
        balance: summary.balance,
        memberCount: summary.memberCount,
        sessionCount: summary.sessionCount,
        confirmedCount: summary.confirmedCount,
      }, [])
      toast.success('Đã tải PDF tổng quan tài chính')
    } catch { toast.error('Xuất PDF thất bại') }
  }

  return (
    <PageShell>
      <PageHeader
        title="Dashboard tài chính"
        subtitle={activePeriod ? `Kỳ quỹ: ${activePeriod.name} · nguồn: Finance Engine` : 'Tổng quan tài chính CLB'}
        actions={summary ? <ExportActions onImage={doExportPng} onPdf={doExportPdf} /> : undefined}
      />

      {!activePeriod ? (
        <EmptyState icon={<Wallet size={24} />} title="Chưa có kỳ quỹ đang mở" description="Mở một kỳ quỹ ở mục Kỳ Quỹ để xem tổng quan tài chính." />
      ) : loading ? (
        <LoadingState variant="cards" rows={3} />
      ) : error ? (
        <ErrorState onRetry={() => void load(activePeriod.id)} />
      ) : summary ? (
        <div id={FD_EXPORT_ID} className="flex flex-col gap-5">
          {/* 3 KPI: Tổng thu · Tổng chi · Tồn quỹ */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <MetricCard accent="green" icon={<ArrowUpRight size={18} />} label="Tổng thu (Quỹ Chính)" value={formatVND(summary.totalIncome)} />
            <MetricCard accent="rose" icon={<ArrowDownLeft size={18} />} label="Tổng chi" value={formatVND(summary.totalExpenses)} />
            <MetricCard accent="blue" icon={<Wallet size={18} />} label="Tồn quỹ" value={formatVND(summary.balance)} negative={summary.balance < 0} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Bar Thu/Chi theo quỹ */}
            <ChartCard title="Thu / Chi theo quỹ" subtitle="Số liệu từ Finance Engine" className="lg:col-span-2">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--pf-border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--pf-color-muted)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--pf-color-muted)' }} tickLine={false} axisLine={false} width={64} tickFormatter={(v) => { const x = Number(v); return x >= 1e6 ? `${(x / 1e6).toFixed(0)}M` : `${x / 1e3}k` }} />
                    <Tooltip formatter={(v) => formatVND(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid var(--pf-border)', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Thu" fill={CHART_INCOME} radius={[6, 6, 0, 0]} maxBarSize={48} />
                    <Bar dataKey="Chi" fill={CHART_EXPENSE} radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Donut Cơ cấu quỹ */}
            <ChartCard title="Cơ cấu quỹ" subtitle="Tồn Quỹ Chính / Quỹ Phụ">
              {donutData.length === 0 ? (
                <p className="py-8 text-center text-sm [color:var(--pf-color-muted)]">Chưa có số dư dương để hiển thị cơ cấu.</p>
              ) : (
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={64} paddingAngle={2}>
                        {donutData.map((d) => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatVND(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid var(--pf-border)', fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="mt-3 space-y-1.5 border-t pt-3 [border-color:var(--pf-border)]">
                <div className="flex items-center justify-between text-xs">
                  <span className="[color:var(--pf-color-muted)]">Tổng tài sản CLB</span>
                  <span className="font-semibold tabular-nums [color:var(--pf-text)]">{formatVND(summary.clubAssets)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="[color:var(--pf-color-muted)]">Số dư chuyển kỳ</span>
                  <span className="font-semibold tabular-nums [color:var(--pf-text)]">{formatVND(summary.carryForward)}</span>
                </div>
                {alerts.map((a, i) => (
                  <div key={i} className="flex items-center gap-1.5 pt-1">
                    <StatusBadge tone={a.tone} dot>{a.tone === 'success' ? 'Ổn định' : a.tone === 'warning' ? 'Chú ý' : 'Cảnh báo'}</StatusBadge>
                    <span className="text-[11px] [color:var(--pf-color-muted)]">{a.msg}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </div>
      ) : (
        <EmptyState icon={<Wallet size={24} />} title="Chưa có dữ liệu" description="Không tải được số liệu tài chính cho kỳ quỹ này." />
      )}
    </PageShell>
  )
}
