/**
 * FinanceDashboard (07) — Dashboard tài chính. Số liệu ĐỌC canonical từ Finance Engine
 * (GET /fund-periods/:id/summary — Source of Truth), KHÔNG tự tính ở frontend (thống nhất
 * với Reports/PDF). Kỳ quỹ đang mở lấy từ clubDataStore. V2.2 Clean Modern SaaS.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { Wallet, PiggyBank, Coins, AlertTriangle, Landmark } from 'lucide-react'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatVND } from '../../lib/utils'
import api from '../../lib/api'
import {
  PageShell, PageHeader, MetricCard, ChartCard, EmptyState, LoadingState, ErrorState,
  StatusBadge, type StatusTone,
} from '../../components/shared'

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
  negativeBalanceCount: number
}

const n = (v: unknown): number => (v == null ? 0 : Number(v) || 0)
const CHART_INCOME = '#059669' // --pf-green (tiền)
const CHART_EXPENSE = '#E11D48' // --pf-accent-rose (chi)

export function FinanceDashboard() {
  const clubId = useAuthStore((s) => s.user?.clubId) ?? ''
  const { fundPeriods } = useClubDataStore((s) => s.getClubData(clubId))
  const activePeriod = useMemo(
    () => fundPeriods.find((p) => p.status === 'active') ?? null,
    [fundPeriods],
  )

  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async (periodId: string) => {
    setLoading(true)
    setError(false)
    try {
      const res = await api.get(`/fund-periods/${periodId}/summary`)
      const d = (res.data?.data ?? res.data) as Record<string, unknown>
      setSummary({
        totalIncome: n(d.totalIncome),
        totalExpenses: n(d.totalExpenses),
        balance: n(d.balance),
        miniIncome: n(d.miniIncome),
        miniExpense: n(d.miniExpense),
        miniBalance: n(d.miniBalance),
        clubAssets: n(d.clubAssets),
        carryForward: n(d.carryForward),
        unpaidCount: n(d.unpaidCount),
        negativeBalanceCount: n(d.negativeBalanceCount),
      })
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activePeriod) void load(activePeriod.id)
  }, [activePeriod, load])

  const alerts = useMemo(() => {
    if (!summary) return [] as { tone: StatusTone; msg: string }[]
    const a: { tone: StatusTone; msg: string }[] = []
    if (summary.balance < 0) a.push({ tone: 'danger', msg: 'Quỹ Chính đang âm — cần rà soát thu/chi.' })
    if (summary.miniBalance < 0) a.push({ tone: 'danger', msg: 'Quỹ Phụ (Mini) đang âm.' })
    if (summary.unpaidCount > 0) a.push({ tone: 'warning', msg: `${summary.unpaidCount} thành viên chưa hoàn tất đóng quỹ.` })
    if (a.length === 0) a.push({ tone: 'success', msg: 'Tài chính ổn định: quỹ không âm, không công nợ tồn đọng.' })
    return a
  }, [summary])

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

  return (
    <PageShell>
      <PageHeader
        title="Dashboard tài chính"
        subtitle={activePeriod ? `Kỳ quỹ: ${activePeriod.name} · nguồn: Finance Engine` : 'Tổng quan tài chính CLB'}
      />

      {!activePeriod ? (
        <EmptyState
          icon={<Wallet size={24} />}
          title="Chưa có kỳ quỹ đang mở"
          description="Mở một kỳ quỹ ở mục Kỳ Quỹ để xem tổng quan tài chính."
        />
      ) : loading ? (
        <LoadingState variant="cards" rows={4} />
      ) : error ? (
        <ErrorState onRetry={() => void load(activePeriod.id)} />
      ) : summary ? (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <MetricCard accent="blue" icon={<Landmark size={18} />} label="Tổng tài sản CLB" value={formatVND(summary.clubAssets)} />
            <MetricCard accent="green" icon={<Coins size={18} />} label="Quỹ Chính (tồn)" value={formatVND(summary.balance)} negative={summary.balance < 0} />
            <MetricCard accent="violet" icon={<PiggyBank size={18} />} label="Quỹ Phụ (tồn)" value={formatVND(summary.miniBalance)} negative={summary.miniBalance < 0} />
            <MetricCard accent="amber" icon={<AlertTriangle size={18} />} label="Công nợ" value={`${summary.unpaidCount} TV`} sub="chưa đóng đủ" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Thu / Chi theo quỹ" subtitle="Số liệu từ Finance Engine" className="lg:col-span-2">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--pf-border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--pf-color-muted)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--pf-color-muted)' }} tickLine={false} axisLine={false} width={64} tickFormatter={(v) => { const num = Number(v); return num >= 1e6 ? `${(num / 1e6).toFixed(0)}M` : `${num / 1e3}k` }} />
                    <Tooltip formatter={(v) => formatVND(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid var(--pf-border)', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Thu" fill={CHART_INCOME} radius={[6, 6, 0, 0]} maxBarSize={48} />
                    <Bar dataKey="Chi" fill={CHART_EXPENSE} radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Cảnh báo tài chính" subtitle="Ngưỡng từ Finance Engine">
              <div className="flex flex-col gap-2">
                {alerts.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <StatusBadge tone={a.tone} dot>{a.tone === 'success' ? 'Ổn định' : a.tone === 'warning' ? 'Chú ý' : 'Cảnh báo'}</StatusBadge>
                    <span className="text-xs [color:var(--pf-color-muted)]">{a.msg}</span>
                  </div>
                ))}
                <div className="mt-2 border-t pt-2 [border-color:var(--pf-border)] text-[11px] [color:var(--pf-color-muted)]">
                  Số dư chuyển kỳ: <span className="font-semibold [color:var(--pf-text)]">{formatVND(summary.carryForward)}</span>
                </div>
              </div>
            </ChartCard>
          </div>
        </div>
      ) : null}
    </PageShell>
  )
}
