/**
 * SuperDashboard — "Trung tâm điều hành PickleFund" (Command Center). MỘT màn cuộn dọc.
 * Elite 2026: hệ thẻ THỐNG NHẤT (một accent thương hiệu + độ sâu bằng tint/shadow, đều kích thước),
 * màu semantic chỉ dùng khi cảnh báo. Dữ liệu THẬT; chỉ số chưa có nguồn → "chưa có dữ liệu".
 * PDF xuất server-side (bìa + 9 mục + đánh giá Maika). Đánh giá chi tiết Maika theo từng mục.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, Activity, Lock, Users, LogIn, UserCheck, Wallet, TrendingUp, CreditCard,
  Cpu, Bot, Server, RefreshCw, AlertTriangle, Trophy, Bell, Database, Gauge, Sparkles,
  ShieldCheck, ClipboardList, Clock, HeartPulse, CircleAlert, MessageSquare, Workflow, Zap, FileDown,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { formatVND, formatNumber } from '../../lib/utils'
import { PageShell, ChartCard, EmptyState, ErrorState, StatusBadge } from '../../components/shared'

const RANGES = [
  { key: 'today', label: 'Hôm nay' }, { key: '7d', label: '7 ngày' }, { key: '30d', label: '30 ngày' },
  { key: 'quarter', label: 'Quý' }, { key: 'year', label: 'Năm' }, { key: 'custom', label: 'Tùy chỉnh' },
]

const vnd = (v: number | null | undefined) => (v == null ? '—' : formatVND(v))
const num = (v: number | null | undefined) => (v == null ? '—' : formatNumber(v))
const pctStr = (v: number | null | undefined) => (v == null ? '—' : `${v}%`)
function fmtUptime(sec?: number | null) {
  if (sec == null) return '—'
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60)
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
}

type Alert = 'danger' | 'warning' | undefined
const BRAND = 'var(--pf-primary)'
const ALERT_COLOR: Record<'danger' | 'warning', string> = { danger: 'var(--pf-color-danger)', warning: 'var(--pf-color-warning)' }

/** Thẻ KPI THỐNG NHẤT: nền tint thương hiệu nhẹ + shadow (độ sâu), đều chiều cao. Màu chỉ đổi khi alert. */
function Kpi({ label, value, icon, sub, alert }: { label: string; value: React.ReactNode; icon?: React.ReactNode; sub?: string; alert?: Alert }) {
  const accent = alert ? ALERT_COLOR[alert] : BRAND
  return (
    <div
      className="flex h-full flex-col rounded-2xl border p-3.5"
      style={{
        borderColor: `color-mix(in srgb, ${accent} 22%, var(--pf-border))`,
        background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 6%, var(--pf-surface)), var(--pf-surface))`,
        boxShadow: 'var(--pf-shadow)',
      }}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-bold uppercase tracking-wide [color:var(--pf-color-muted)]">{label}</p>
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${accent} 16%, var(--pf-surface))`, color: accent }}>{icon}</span>
        )}
      </div>
      <p className="mt-auto text-[19px] font-extrabold leading-tight" style={{ color: alert ? accent : 'var(--pf-text)' }}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] [color:var(--pf-color-muted)]">{sub}</p>}
    </div>
  )
}

function NoData({ hint }: { hint?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium [color:var(--pf-color-muted)]" title={hint ?? 'Chưa có nguồn dữ liệu thật cho chỉ số này'}>
      <CircleAlert size={13} /> Chưa có dữ liệu
    </span>
  )
}

function Section({ title, desc, icon, children }: { title: string; desc?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        {icon && <span className="[color:var(--pf-primary)]">{icon}</span>}
        <h2 className="text-[15px] font-extrabold tracking-tight [color:var(--pf-text)]">{title}</h2>
        {desc && <span className="text-xs [color:var(--pf-color-muted)]">· {desc}</span>}
      </div>
      {children}
    </section>
  )
}

const GRID = 'grid gap-3 auto-rows-fr'
const CHART_TOOLTIP = {
  contentStyle: { background: 'var(--pf-surface)', border: '1px solid var(--pf-border)', borderRadius: 12, fontSize: 12, color: 'var(--pf-text)' },
  labelStyle: { color: 'var(--pf-color-muted)' },
}

export function SuperDashboard() {
  const [range, setRange] = useState('30d')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [clubId, setClubId] = useState('')
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([])
  const [data, setData] = useState<any>(null)
  const [audit, setAudit] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [review, setReview] = useState<{ sections: any; byAi: boolean } | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)

  useEffect(() => {
    api.get('/clubs', { params: { limit: 200 } })
      .then((r) => setClubs((r.data?.data ?? []).map((c: any) => ({ id: c.id, name: c.name }))))
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true); setError(false); setReview(null)
    try {
      const params: Record<string, string> = { range }
      if (clubId) params.clubId = clubId
      if (range === 'custom') { if (from) params.from = from; if (to) params.to = to }
      const [ov, al] = await Promise.allSettled([
        api.get('/command-center/overview', { params }),
        api.get('/audit-logs', { params: { limit: 40 } }),
      ])
      if (ov.status === 'fulfilled') setData(ov.value.data?.data ?? null)
      else throw new Error('overview failed')
      if (al.status === 'fulfilled') setAudit(al.value.data?.data ?? [])
      setRefreshedAt(new Date())
    } catch { setError(true) } finally { setLoading(false) }
  }, [range, clubId, from, to])

  useEffect(() => { load() }, [load])

  const params = () => {
    const p: Record<string, string> = { range }
    if (clubId) p.clubId = clubId
    if (range === 'custom') { if (from) p.from = from; if (to) p.to = to }
    return p
  }

  const doPdf = async () => {
    setPdfLoading(true)
    const t = toast.loading('Đang tạo PDF (bìa + đánh giá Maika)…')
    try {
      const res = await api.get('/command-center/pdf', { params: params(), responseType: 'blob', timeout: 60000 })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'trung-tam-dieu-hanh.pdf'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Đã tạo PDF', { id: t })
    } catch {
      toast.error('Không tạo được PDF', { id: t })
    } finally { setPdfLoading(false) }
  }

  const runReview = async () => {
    setReviewLoading(true)
    try {
      const res = await api.get('/command-center/ai-review', { params: params(), timeout: 60000 })
      setReview({ sections: res.data?.data?.sections ?? {}, byAi: !!res.data?.data?.byAi })
    } catch {
      toast.error('Không tạo được đánh giá Maika')
    } finally { setReviewLoading(false) }
  }

  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? ''

  return (
    <PageShell maxWidth={1760}>
      <header className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight [color:var(--pf-text)] sm:text-2xl">Trung tâm điều hành PickleFund</h1>
          <p className="mt-0.5 text-sm [color:var(--pf-color-muted)]">Tổng quan kinh doanh, vận hành, AI và sức khỏe hệ thống</p>
          {refreshedAt && <p className="mt-1 inline-flex items-center gap-1 text-[11px] [color:var(--pf-color-muted)]"><Clock size={11} /> Cập nhật: {refreshedAt.toLocaleString('vi-VN')}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Khoảng thời gian"
            className="h-10 rounded-full border px-3 text-sm [background:var(--pf-surface)] [color:var(--pf-text)] border-[color:var(--pf-border)]">
            {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          {range === 'custom' && (
            <>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-full border px-3 text-sm [background:var(--pf-surface)] [color:var(--pf-text)] border-[color:var(--pf-border)]" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-full border px-3 text-sm [background:var(--pf-surface)] [color:var(--pf-text)] border-[color:var(--pf-border)]" />
            </>
          )}
          <select value={clubId} onChange={(e) => setClubId(e.target.value)} aria-label="Câu lạc bộ"
            className="h-10 max-w-[180px] rounded-full border px-3 text-sm [background:var(--pf-surface)] [color:var(--pf-text)] border-[color:var(--pf-border)]">
            <option value="">Tất cả CLB</option>
            {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={load} disabled={loading} className="inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold [background:var(--pf-surface)] [color:var(--pf-text)] border-[color:var(--pf-border)] hover:[background:var(--pf-surface-muted)] disabled:opacity-60">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>
          <button onClick={doPdf} disabled={!data || pdfLoading} className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--pf-primary)' }}>
            <FileDown size={15} /> {pdfLoading ? 'Đang tạo…' : 'Xuất PDF'}
          </button>
        </div>
      </header>

      {error && !data ? (
        <ErrorState description="Không tải được dữ liệu Trung tâm điều hành." onRetry={load} />
      ) : loading && !data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-24 rounded-2xl border [background:var(--pf-surface)] border-[color:var(--pf-border)] pf-skeleton" />)}
        </div>
      ) : data ? (
        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <Body data={data} audit={audit} rangeLabel={rangeLabel} review={review} reviewLoading={reviewLoading} onRunReview={runReview} onRunBackup={async () => {
            const t = toast.loading('Đang sao lưu…')
            try { const r = await api.post('/backup/run'); const st = r.data?.data; toast.success(st?.success ? 'Sao lưu thành công' : `Sao lưu lỗi: ${st?.error ?? '—'}`, { id: t }); load() }
            catch { toast.error('Không chạy được sao lưu', { id: t }) }
          }} />
        </div>
      ) : null}
    </PageShell>
  )
}

function reviewText(review: { sections: any } | null, key: string): string | null {
  return review?.sections?.[key] ?? null
}
/** Ô đánh giá Maika hiển thị dưới mỗi khối (khi đã tạo). */
function MaikaNote({ review, k }: { review: { sections: any } | null; k: string }) {
  const t = reviewText(review, k)
  if (!t) return null
  return (
    <div className="mt-3 rounded-xl border p-3" style={{ borderColor: 'color-mix(in srgb, var(--pf-primary) 24%, var(--pf-border))', background: 'color-mix(in srgb, var(--pf-primary) 5%, var(--pf-surface))' }}>
      <p className="mb-1 inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider [color:var(--pf-primary)]"><Sparkles size={12} /> Maika nhận định</p>
      <p className="whitespace-pre-line text-[13px] leading-relaxed [color:var(--pf-text)]">{t}</p>
    </div>
  )
}

function Body({ data, audit, rangeLabel, review, reviewLoading, onRunReview, onRunBackup }: { data: any; audit: any[]; rangeLabel: string; review: { sections: any; byAi: boolean } | null; reviewLoading: boolean; onRunReview: () => void; onRunBackup: () => void }) {
  const k = data.kpi, biz = data.business, ops = data.operations, fin = data.finance, ai = data.ai, infra = data.infra, lb = data.leaderboards

  return (
    <>
      {/* 12 KPI + Executive Summary */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
        <div className={`${GRID} grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`}>
          <Kpi label="Tổng CLB" value={num(k.totalClubs)} icon={<Building2 size={16} />} />
          <Kpi label="CLB hoạt động" value={num(k.activeClubs)} icon={<Activity size={16} />} />
          <Kpi label="CLB bị khóa" value={num(k.suspendedClubs)} icon={<Lock size={16} />} alert={k.suspendedClubs > 0 ? 'warning' : undefined} />
          <Kpi label="Tổng thành viên" value={num(k.totalMembers)} icon={<Users size={16} />} />
          <Kpi label="Người dùng hoạt động" value={num(k.activeUsers)} icon={<UserCheck size={16} />} />
          <Kpi label="Đăng nhập 24h" value={num(k.logins24h)} icon={<LogIn size={16} />} />
          <Kpi label="MRR" value={vnd(k.mrr)} icon={<TrendingUp size={16} />} />
          <Kpi label={`Doanh thu (${rangeLabel})`} value={vnd(k.revenueInRange)} icon={<Wallet size={16} />} />
          <Kpi label="Thuê bao trả phí" value={num(k.paidSubscribers)} icon={<CreditCard size={16} />} />
          <Kpi label="AI Request" value={num(k.aiRequests)} icon={<Bot size={16} />} />
          <Kpi label="Chi phí AI (ước tính)" value={k.aiCost != null ? `$${Number(k.aiCost).toFixed(4)}` : <NoData hint="Chưa có lượt gọi AI trong kỳ" />} icon={<Cpu size={16} />} />
          <Kpi label="Uptime" value={fmtUptime(k.uptimeSeconds)} icon={<Server size={16} />} />
        </div>

        <ChartCard title="AIDO Executive Summary" subtitle={review?.byAi ? 'Maika tổng hợp (AI)' : 'Tổng hợp từ dữ liệu thật'}
          actions={<button onClick={onRunReview} disabled={reviewLoading} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold [color:var(--pf-primary)] border-[color:var(--pf-border)] hover:[background:var(--pf-surface-muted)] disabled:opacity-60"><Sparkles size={12} className={reviewLoading ? 'animate-pulse' : ''} /> {reviewLoading ? 'Đang viết…' : 'Maika đánh giá'}</button>}>
          <SummaryBlock summary={data.summary} />
          {reviewText(review, 'overview') && <MaikaNote review={review} k="overview" />}
        </ChartCard>
      </div>

      {/* Kinh doanh */}
      <Section title="Kinh doanh & thuê bao" icon={<TrendingUp size={16} />}>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Doanh thu & tăng trưởng" subtitle="Doanh thu thật + thu/chi ghi nhận">
            <div className={`${GRID} mb-3 grid-cols-2 sm:grid-cols-3`}>
              <Kpi label="Hôm nay" value={vnd(biz.revenue.today)} /><Kpi label="Tháng" value={vnd(biz.revenue.month)} /><Kpi label="Quý" value={vnd(biz.revenue.quarter)} />
              <Kpi label="Năm" value={vnd(biz.revenue.year)} /><Kpi label="MRR" value={vnd(biz.revenue.mrr)} /><Kpi label="ARR" value={vnd(biz.revenue.arr)} />
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={fin.trend} margin={{ left: -10, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--pf-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--pf-color-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--pf-color-muted)' }} tickFormatter={(v: number) => (v >= 1e6 ? `${Math.round(v / 1e6)}tr` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : `${v}`)} />
                <Tooltip {...CHART_TOOLTIP} formatter={(v: any, key: any) => [formatVND(Number(v) || 0), key === 'revenue' ? 'Doanh thu' : key === 'income' ? 'Thu quỹ' : 'Chi']} />
                <Area type="monotone" dataKey="income" stroke="var(--pf-primary)" fill="var(--pf-primary)" fillOpacity={0.16} />
                <Area type="monotone" dataKey="expense" stroke="color-mix(in srgb, var(--pf-primary) 55%, var(--pf-color-muted))" fill="var(--pf-primary)" fillOpacity={0.05} />
                <Area type="monotone" dataKey="revenue" stroke="var(--pf-primary)" strokeWidth={2} fill="var(--pf-primary)" fillOpacity={0.24} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Cơ cấu thuê bao" subtitle={`${num(biz.subscription.paidSubscribers)} CLB trả phí`}>
            <div className="space-y-2">
              {biz.subscription.plans.map((p: any) => {
                const total = biz.subscription.plans.reduce((a: number, x: any) => a + x.count, 0) || 1
                const w = Math.round((p.count / total) * 100)
                return (
                  <div key={p.tier}>
                    <div className="mb-1 flex justify-between text-xs"><span className="font-semibold [color:var(--pf-text)]">{p.name}</span><span className="[color:var(--pf-color-muted)]">{p.count} · {w}%</span></div>
                    <div className="h-2 rounded-full [background:var(--pf-surface-muted)]"><div className="h-2 rounded-full [background:var(--pf-primary)]" style={{ width: `${w}%` }} /></div>
                  </div>
                )
              })}
            </div>
            <div className={`${GRID} mt-4 grid-cols-2`}>
              <Kpi label="Sắp hết hạn" value={num(biz.subscription.expiringSoon)} alert={biz.subscription.expiringSoon > 0 ? 'warning' : undefined} />
              <Kpi label="Đã hết hạn" value={num(biz.subscription.expired)} alert={biz.subscription.expired > 0 ? 'danger' : undefined} />
              <Kpi label="Nâng cấp trong kỳ" value={num(biz.subscription.upgradesInRange)} />
              <Kpi label="Hủy trong kỳ" value={num(biz.subscription.cancellationsInRange)} />
            </div>
          </ChartCard>
        </div>
        <MaikaNote review={review} k="business" />
      </Section>

      {/* Hoạt động */}
      <Section title="Hoạt động toàn hệ thống" desc={rangeLabel} icon={<Activity size={16} />}>
        <div className={`${GRID} grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`}>
          <Kpi label="CLB mới" value={num(ops.clubs.new)} icon={<Building2 size={16} />} />
          <Kpi label="Thành viên mới" value={num(ops.members.new)} icon={<Users size={16} />} />
          <Kpi label="Lượt đăng ký" value={num(ops.members.registrations)} icon={<ClipboardList size={16} />} />
          <Kpi label="Lượt điểm danh" value={num(ops.members.attendance)} icon={<UserCheck size={16} />} />
          <Kpi label="Kỳ quỹ" value={num(ops.business.fundPeriods)} icon={<Wallet size={16} />} />
          <Kpi label="Buổi chơi" value={num(ops.business.sessions)} icon={<Activity size={16} />} />
          <Kpi label="Giải đấu/Minigame" value={num(ops.business.minigames)} icon={<Trophy size={16} />} />
          <Kpi label="Trận đấu" value={num(ops.business.matches)} icon={<Trophy size={16} />} />
          <Kpi label="Báo cáo đã xuất" value={num(ops.business.reportsExported)} icon={<FileDown size={16} />} />
        </div>
        <MaikaNote review={review} k="operations" />
      </Section>

      {/* Tài chính */}
      <Section title="Tổng hợp tài chính toàn nền tảng" desc="chỉ Super Admin · đã ghi audit" icon={<Wallet size={16} />}>
        <div className={`${GRID} grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`}>
          <Kpi label="Tổng thu ghi nhận" value={vnd(fin.totalIncome)} icon={<TrendingUp size={16} />} />
          <Kpi label="Tổng chi ghi nhận" value={vnd(fin.totalExpense)} icon={<Wallet size={16} />} />
          <Kpi label="Tổng số dư quỹ" value={vnd(fin.totalBalance)} icon={<Wallet size={16} />} alert={fin.totalBalance < 0 ? 'danger' : undefined} />
          <Kpi label="Chi chờ duyệt" value={num(fin.pendingExpenses)} icon={<ClipboardList size={16} />} alert={fin.pendingExpenses > 0 ? 'warning' : undefined} />
          <Kpi label="Tổng công nợ" value={vnd(fin.debt)} sub={fin.overdueCount > 0 ? `${num(fin.overdueCount)} quá hạn · ${vnd(fin.overdueAmount)}` : 'Không có quá hạn'} icon={<CircleAlert size={16} />} alert={fin.debt > 0 ? 'warning' : undefined} />
          <Kpi label="Thu đúng hạn" value={fin.onTimeRatio != null ? `${fin.onTimeRatio}%` : <NoData hint="Chưa kỳ nào đặt hạn đóng" />} icon={<Gauge size={16} />} />
        </div>
        <MaikaNote review={review} k="finance" />
      </Section>

      {/* AI Operations */}
      <Section title="AIDO AI Operations" desc={rangeLabel} icon={<Bot size={16} />}>
        <div className={`${GRID} sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5`}>
          <AgentCard name="Maika" role="Phân tích & Khuyến nghị" icon={<Sparkles size={16} />} rows={[['Insight', ai.agents.maika.insights], ['Action', ai.agents.maika.actions]]} />
          <AgentCard name="Lisa" role="Hội thoại & Hỏi đáp" icon={<MessageSquare size={16} />} rows={[['Tin nhắn', ai.agents.lisa.messages]]} />
          <AgentCard name="Hermes" role="Workflow & Điều phối" icon={<Workflow size={16} />} rows={[['Chạy', ai.agents.hermes.runs], ['Hoàn tất', ai.agents.hermes.completed], ['Chờ duyệt', ai.agents.hermes.waiting], ['Lỗi', ai.agents.hermes.failed]]} />
          <AgentCard name="Mít Đặc" role="Thực thi tác vụ" icon={<Zap size={16} />} rows={[['Đã chạy', ai.agents.mitDac.executed], ['Thất bại', ai.agents.mitDac.failed], ['TB (ms)', ai.agents.mitDac.avgMs ?? '—']]} />
          <AgentCard name="Notification AI" role="Thông báo" icon={<Bell size={16} />} rows={[['In-app', ai.agents.notification.byChannel.IN_APP], ['Email', ai.agents.notification.byChannel.EMAIL], ['Telegram', ai.agents.notification.byChannel.TELEGRAM], ['Lỗi', ai.agents.notification.failed]]} />
        </div>
        <div className={`${GRID} mt-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`}>
          <Kpi label="Tổng request" value={num(ai.totals.requests)} icon={<Bot size={16} />} />
          <Kpi label="Tỷ lệ thành công" value={pctStr(ai.totals.successRate)} icon={<Gauge size={16} />} />
          <Kpi label="TG thực thi TB" value={ai.totals.avgActionMs != null ? `${num(ai.totals.avgActionMs)} ms` : '—'} icon={<Clock size={16} />} />
          <Kpi label="Lỗi AI" value={num(ai.totals.errors)} icon={<AlertTriangle size={16} />} alert={ai.totals.errors > 0 ? 'danger' : undefined} />
          <Kpi label="Token AI" value={ai.totals.tokens != null ? num(ai.totals.tokens) : <NoData hint="Chưa có lượt gọi AI trong kỳ" />} sub={ai.totals.cost != null ? `~$${Number(ai.totals.cost).toFixed(4)}` : undefined} icon={<Cpu size={16} />} />
          <Kpi label="Provider / Fallback" value={ai.totals.provider ?? <NoData hint="Chưa có lượt gọi AI trong kỳ" />} sub={ai.totals.provider ? `${num(ai.totals.fallbacks)} fallback${ai.totals.avgLatencyMs != null ? ` · ${num(ai.totals.avgLatencyMs)}ms` : ''}` : undefined} icon={<Server size={16} />} />
        </div>
        <MaikaNote review={review} k="ai" />
      </Section>

      {/* Hạ tầng */}
      <Section title="Sức khỏe hạ tầng" icon={<HeartPulse size={16} />}>
        <div className={`${GRID} grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`}>
          <Kpi label="CPU" value={pctStr(infra.cpu?.pct)} sub={`load ${infra.cpu?.load1} · ${infra.cpu?.cores} core`} icon={<Cpu size={16} />} alert={infra.cpu?.pct >= 85 ? 'danger' : infra.cpu?.pct >= 60 ? 'warning' : undefined} />
          <Kpi label="RAM" value={pctStr(infra.memory?.pct)} sub={`${num(infra.memory?.usedMb)}/${num(infra.memory?.totalMb)} MB`} icon={<Gauge size={16} />} alert={infra.memory?.pct >= 90 ? 'danger' : infra.memory?.pct >= 70 ? 'warning' : undefined} />
          <Kpi label="Uptime" value={fmtUptime(infra.uptimeSeconds)} icon={<Server size={16} />} />
          <Kpi label="Database" value={infra.db?.status === 'up' ? 'Bình thường' : 'Lỗi'} sub={infra.db?.latencyMs != null ? `${infra.db.latencyMs} ms` : undefined} icon={<Database size={16} />} alert={infra.db?.status !== 'up' ? 'danger' : undefined} />
          <Kpi label="Backup" value={infra.backup ? (infra.backup.success ? 'Bình thường' : 'Lỗi') : (infra.backupEnabled ? 'Chờ chạy' : 'Chưa bật')} sub={infra.backup ? `${new Date(infra.backup.at).toLocaleString('vi-VN')}${infra.backup.sizeMb != null ? ` · ${infra.backup.sizeMb}MB` : ''}` : undefined} icon={<ShieldCheck size={16} />} alert={infra.backup && !infra.backup.success ? 'danger' : undefined} />
          <Kpi label="Disk" value={infra.disk ? pctStr(infra.disk.pct) : <NoData />} sub={infra.disk ? `${infra.disk.usedGb}/${infra.disk.totalGb} GB` : undefined} icon={<Database size={16} />} alert={infra.disk?.pct >= 90 ? 'danger' : infra.disk?.pct >= 75 ? 'warning' : undefined} />
          <Kpi label="Storage" value={infra.storage ? (infra.storage.usedMb >= 1024 ? `${Math.round(infra.storage.usedMb / 102.4) / 10} GB` : `${infra.storage.usedMb} MB`) : <NoData hint="Không có uploads local (có thể dùng S3)" />} icon={<Database size={16} />} />
          <Kpi label="Hàng đợi việc" value={num(infra.queue?.pending)} sub={infra.queue ? `noti ${infra.queue.notifications} · wf ${infra.queue.workflows} · ai ${infra.queue.aiActions}` : undefined} icon={<Server size={16} />} alert={infra.queue?.pending > 20 ? 'warning' : undefined} />
          <Kpi label="Kết nối DB" value={infra.dbConnections != null ? num(infra.dbConnections) : <NoData />} icon={<Database size={16} />} />
          <Kpi label="Phiên đăng nhập" value={num(infra.activeSessions)} sub="còn hiệu lực" icon={<UserCheck size={16} />} />
          <Kpi label="Req / phút" value={num(infra.requestsPerMin)} sub="TB 5 phút" icon={<Activity size={16} />} />
          <Kpi label="Lỗi (5xx)" value={infra.errorRate != null ? `${infra.errorRate}%` : <NoData hint="Chưa có request trong 5 phút gần đây" />} icon={<AlertTriangle size={16} />} alert={infra.errorRate >= 5 ? 'danger' : infra.errorRate > 0 ? 'warning' : undefined} />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] [color:var(--pf-color-muted)]">Số liệu thật từ máy chủ (Node os/statfs, process, ping DB, pg_stat_activity, uploads, hàng đợi DB, telemetry request cửa sổ 5').</p>
          <button onClick={onRunBackup} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold [background:var(--pf-surface)] [color:var(--pf-text)] border-[color:var(--pf-border)] hover:[background:var(--pf-surface-muted)]"><ShieldCheck size={13} /> Chạy sao lưu ngay</button>
        </div>
        <MaikaNote review={review} k="infra" />
      </Section>

      {/* Cảnh báo + Xếp hạng */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Cảnh báo điều hành" subtitle="Sắp theo mức độ nghiêm trọng">
          {data.alerts?.length ? (
            <ul className="space-y-2">
              {data.alerts.map((a: any, i: number) => (
                <li key={i} className="flex items-start gap-2 rounded-xl border p-2.5 [border-color:var(--pf-border)]">
                  <StatusBadge tone={a.severity === 'critical' ? 'danger' : a.severity === 'high' ? 'warning' : 'info'}>{a.severity === 'critical' ? 'Critical' : a.severity === 'high' ? 'High' : 'Medium'}</StatusBadge>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium [color:var(--pf-text)]">{a.title}</p>
                    <p className="text-[11px] [color:var(--pf-color-muted)]">{a.source}{a.clubName ? ` · ${a.clubName}` : ''} · {new Date(a.time).toLocaleString('vi-VN')}</p>
                  </div>
                  {a.clubId && <Link to={`/super/clubs/${a.clubId}`} className="shrink-0 text-[12px] font-semibold [color:var(--pf-primary)]">Chi tiết</Link>}
                </li>
              ))}
            </ul>
          ) : <EmptyState icon={<ShieldCheck size={22} />} title="Không có cảnh báo" description="Hệ thống đang ổn định." />}
          <MaikaNote review={review} k="alerts" />
        </ChartCard>

        <ChartCard title="Bảng xếp hạng điều hành" subtitle="Top CLB & hiệu quả AI">
          {lb ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <RankList title="Thành viên nhiều nhất" rows={lb.topByMembers} fmt={num} />
              <RankList title="Hoạt động tích cực nhất" rows={lb.topByActivity} fmt={num} />
              <RankList title="Doanh thu cao nhất" rows={lb.topByRevenue} fmt={vnd} />
              <RankList title="Tổ chức nhiều giải nhất" rows={lb.topByTournaments} fmt={num} />
              <RankList title="Dùng AI nhiều nhất" rows={lb.topByAiUsage} fmt={num} />
            </div>
          ) : <EmptyState icon={<Trophy size={22} />} title="Đang lọc theo 1 CLB" description="Chọn 'Tất cả CLB' để xem bảng xếp hạng." />}
          <MaikaNote review={review} k="leaderboards" />
        </ChartCard>
      </div>

      {/* Nhật ký */}
      <Section title="Nhật ký hệ thống" desc="audit log gần nhất" icon={<ClipboardList size={16} />}>
        <ChartCard title="Timeline" subtitle={`${audit.length} sự kiện gần nhất`}>
          {audit.length ? (
            <ul>
              {audit.map((e: any) => (
                <li key={e.id} className="flex items-center gap-3 border-b py-2 text-[13px] [border-color:var(--pf-border)] last:border-0">
                  <StatusBadge tone="neutral">{e.action}</StatusBadge>
                  <span className="min-w-0 flex-1 truncate [color:var(--pf-text)]">{e.resource}{e.detail ? ` — ${e.detail}` : ''}</span>
                  <span className="hidden shrink-0 sm:inline [color:var(--pf-color-muted)]">{e.user?.username ?? '—'}{e.club?.name ? ` · ${e.club.name}` : ''}</span>
                  <span className="shrink-0 [color:var(--pf-color-muted)]">{new Date(e.createdAt).toLocaleString('vi-VN')}</span>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon={<ClipboardList size={22} />} title="Chưa có nhật ký" />}
          <MaikaNote review={review} k="syslog" />
          <div className="mt-3"><Link to="/super/audit-logs" className="text-[12px] font-semibold [color:var(--pf-primary)]">Xem toàn bộ nhật ký →</Link></div>
        </ChartCard>
      </Section>
    </>
  )
}

function SummaryBlock({ summary }: { summary: { status: string[]; risks: string[]; priorities: string[] } }) {
  const Group = ({ title, items, tone }: { title: string; items: string[]; tone: 'info' | 'danger' | 'success' }) => (
    <div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider [color:var(--pf-color-muted)]">{title}</p>
      <ul className="space-y-1">
        {items?.length ? items.map((t, i) => (
          <li key={i} className="flex gap-1.5 text-[12.5px] leading-relaxed [color:var(--pf-text)]">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tone === 'danger' ? 'var(--pf-color-danger)' : tone === 'success' ? 'var(--pf-color-success)' : 'var(--pf-primary)' }} />
            {t}
          </li>
        )) : <li className="text-[12px] [color:var(--pf-color-muted)]">—</li>}
      </ul>
    </div>
  )
  return (
    <div className="space-y-3">
      <Group title="Tình trạng hệ thống" items={summary?.status ?? []} tone="info" />
      <Group title="Rủi ro cần xử lý" items={summary?.risks ?? []} tone="danger" />
      <Group title="Ưu tiên của Super Admin" items={summary?.priorities ?? []} tone="success" />
    </div>
  )
}

/** Thẻ agent THỐNG NHẤT một accent thương hiệu (không rainbow) — phân biệt bằng icon + tên. */
function AgentCard({ name, role, icon, rows }: { name: string; role: string; icon: React.ReactNode; rows: [string, React.ReactNode][] }) {
  return (
    <div
      className="flex h-full flex-col rounded-2xl border p-4"
      style={{
        borderColor: 'color-mix(in srgb, var(--pf-primary) 22%, var(--pf-border))',
        background: 'linear-gradient(180deg, color-mix(in srgb, var(--pf-primary) 6%, var(--pf-surface)), var(--pf-surface))',
        boxShadow: 'var(--pf-shadow)',
      }}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl [color:var(--pf-primary)]" style={{ background: 'color-mix(in srgb, var(--pf-primary) 16%, var(--pf-surface))' }}>{icon}</span>
        <div className="min-w-0"><p className="text-sm font-extrabold [color:var(--pf-text)]">{name}</p><p className="truncate text-[10px] [color:var(--pf-color-muted)]">{role}</p></div>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-1.5">
        {rows.map(([lbl, val]) => (
          <div key={lbl} className="rounded-lg border px-2 py-1.5 [border-color:var(--pf-border)] [background:var(--pf-surface-muted)]">
            <p className="text-[10px] [color:var(--pf-color-muted)]">{lbl}</p>
            <p className="text-[15px] font-extrabold [color:var(--pf-text)]">{typeof val === 'number' ? formatNumber(val) : val}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function RankList({ title, rows, fmt }: { title: string; rows: any[]; fmt: (v: number) => string }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider [color:var(--pf-color-muted)]">{title}</p>
      {rows?.length ? (
        <ol className="space-y-1">
          {rows.map((r, i) => (
            <li key={r.clubId ?? i} className="flex items-center gap-2 text-[13px]">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate [color:var(--pf-text)]">{r.name}</span>
              <span className="shrink-0 font-semibold [color:var(--pf-text)]">{fmt(r.value)}</span>
            </li>
          ))}
        </ol>
      ) : <p className="text-[12px] [color:var(--pf-color-muted)]">—</p>}
    </div>
  )
}
