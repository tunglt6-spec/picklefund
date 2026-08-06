/**
 * SuperDashboard — "Trung tâm điều hành PickleFund" (PickleFund Command Center).
 * MỘT màn hình cuộn dọc cho Super Admin: Kinh doanh · Vận hành · AI · Hạ tầng.
 * Nguồn dữ liệu: GET /command-center/overview (tổng hợp THẬT toàn hệ thống). Chỉ số chưa có
 * nguồn thật → backend trả null → hiển thị "chưa có dữ liệu" (KHÔNG bịa). Responsive desktop/tablet,
 * mobile xếp card dọc. Không sửa dữ liệu trực tiếp — mọi thao tác nghiệp vụ ở màn riêng.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, Activity, Lock, Users, LogIn, UserCheck, Wallet, TrendingUp, CreditCard,
  Cpu, Bot, Server, RefreshCw, AlertTriangle, Trophy, Bell, Database, Gauge, Sparkles,
  ShieldCheck, ClipboardList, Clock, HeartPulse, CircleAlert, MessageSquare, Workflow, Zap,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { formatVND, formatNumber } from '../../lib/utils'
import { exportGenericExcel, captureElementAsReportPDF } from '../../lib/export'
import {
  PageShell, MetricCard, ChartCard, EmptyState, ErrorState, StatusBadge,
} from '../../components/shared'
import type { MetricTone } from '../../components/shared/MetricCard'

const RANGES = [
  { key: 'today', label: 'Hôm nay' },
  { key: '7d', label: '7 ngày' },
  { key: '30d', label: '30 ngày' },
  { key: 'quarter', label: 'Quý' },
  { key: 'year', label: 'Năm' },
  { key: 'custom', label: 'Tùy chỉnh' },
]

const vnd = (v: number | null | undefined) => (v == null ? '—' : formatVND(v))
const num = (v: number | null | undefined) => (v == null ? '—' : formatNumber(v))
const pctStr = (v: number | null | undefined) => (v == null ? '—' : `${v}%`)

function fmtUptime(sec?: number | null) {
  if (sec == null) return '—'
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
}

/** Ô "chưa có dữ liệu" — dùng khi chỉ số không có nguồn thật. */
function NoData({ hint }: { hint?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-sm font-medium [color:var(--pf-color-muted)]"
      title={hint ?? 'Chưa có nguồn dữ liệu thật cho chỉ số này'}
    >
      <CircleAlert size={13} /> Chưa có dữ liệu
    </span>
  )
}

function Section({ title, desc, icon, children, id }: { title: string; desc?: string; icon?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        {icon && <span className="[color:var(--pf-primary)]">{icon}</span>}
        <h2 className="text-[15px] font-extrabold tracking-tight [color:var(--pf-text)]">{title}</h2>
        {desc && <span className="text-xs [color:var(--pf-color-muted)]">· {desc}</span>}
      </div>
      {children}
    </section>
  )
}

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

  // Danh sách CLB cho bộ lọc (tải 1 lần).
  useEffect(() => {
    api.get('/clubs', { params: { limit: 200 } })
      .then((r) => setClubs((r.data?.data ?? []).map((c: any) => ({ id: c.id, name: c.name }))))
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true); setError(false)
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
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [range, clubId, from, to])

  useEffect(() => { load() }, [load])

  const doExcel = () => {
    if (!data) return
    const k = data.kpi
    exportGenericExcel('trung-tam-dieu-hanh', 'Tổng quan', ['Chỉ số', 'Giá trị'], [
      ['Tổng CLB', k.totalClubs], ['CLB hoạt động', k.activeClubs], ['CLB bị khóa', k.suspendedClubs],
      ['Tổng thành viên', k.totalMembers], ['Người dùng hoạt động', k.activeUsers], ['Đăng nhập 24h', k.logins24h],
      ['MRR (đ)', k.mrr], ['Doanh thu kỳ (đ)', k.revenueInRange], ['Thuê bao trả phí', k.paidSubscribers],
      ['AI Request', k.aiRequests],
      ['Tổng thu (đ)', data.finance.totalIncome], ['Tổng chi (đ)', data.finance.totalExpense], ['Số dư (đ)', data.finance.totalBalance],
    ])
    toast.success('Đã xuất Excel')
  }
  const doPdf = async () => {
    try {
      await captureElementAsReportPDF('command-center-capture', 'trung-tam-dieu-hanh', {
        title: 'Trung tâm điều hành PickleFund',
        subtitle: 'Tổng quan kinh doanh, vận hành, AI và hạ tầng',
        meta: refreshedAt ? `Xuất: ${refreshedAt.toLocaleString('vi-VN')}` : undefined,
      })
      toast.success('Đã xuất PDF')
    } catch { toast.error('Không tạo được PDF') }
  }

  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? ''

  return (
    <PageShell maxWidth={1760}>
      {/* ── Thanh điều khiển đầu trang ── */}
      <header className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight [color:var(--pf-text)] sm:text-2xl">Trung tâm điều hành PickleFund</h1>
          <p className="mt-0.5 text-sm [color:var(--pf-color-muted)]">Tổng quan kinh doanh, vận hành, AI và sức khỏe hệ thống</p>
          {refreshedAt && <p className="mt-1 inline-flex items-center gap-1 text-[11px] [color:var(--pf-color-muted)]"><Clock size={11} /> Cập nhật: {refreshedAt.toLocaleString('vi-VN')}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2" data-html2canvas-ignore="true">
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
          <button onClick={load} disabled={loading} aria-label="Làm mới"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold [background:var(--pf-surface)] [color:var(--pf-text)] border-[color:var(--pf-border)] hover:[background:var(--pf-surface-muted)] disabled:opacity-60">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>
          <button onClick={doExcel} disabled={!data} className="inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold [background:var(--pf-surface)] [color:var(--pf-text)] border-[color:var(--pf-border)] hover:[background:var(--pf-surface-muted)] disabled:opacity-50">Excel</button>
          <button onClick={doPdf} disabled={!data} className="inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold [background:var(--pf-surface)] [color:var(--pf-text)] border-[color:var(--pf-border)] hover:[background:var(--pf-surface-muted)] disabled:opacity-50">PDF</button>
          <button onClick={() => window.print()} disabled={!data} className="inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold [background:var(--pf-surface)] [color:var(--pf-text)] border-[color:var(--pf-border)] hover:[background:var(--pf-surface-muted)] disabled:opacity-50">In</button>
        </div>
      </header>

      {error && !data ? (
        <ErrorState description="Không tải được dữ liệu Trung tâm điều hành." onRetry={load} />
      ) : loading && !data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-24 rounded-[20px] border [background:var(--pf-surface)] border-[color:var(--pf-border)] pf-skeleton" />)}
        </div>
      ) : data ? (
        <div id="command-center-capture" className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <CommandCenterBody data={data} audit={audit} rangeLabel={rangeLabel} />
        </div>
      ) : null}
    </PageShell>
  )
}

/* ────────────────────────────── Nội dung các khối ────────────────────────────── */

function CommandCenterBody({ data, audit, rangeLabel }: { data: any; audit: any[]; rangeLabel: string }) {
  const k = data.kpi
  const biz = data.business
  const ops = data.operations
  const fin = data.finance
  const ai = data.ai
  const infra = data.infra
  const lb = data.leaderboards

  const kpis: { label: string; value: React.ReactNode; icon: React.ReactNode; tone: MetricTone }[] = [
    { label: 'Tổng CLB', value: num(k.totalClubs), icon: <Building2 size={18} />, tone: 'brand' },
    { label: 'CLB hoạt động', value: num(k.activeClubs), icon: <Activity size={18} />, tone: 'success' },
    { label: 'CLB bị khóa', value: num(k.suspendedClubs), icon: <Lock size={18} />, tone: k.suspendedClubs > 0 ? 'warning' : 'success' },
    { label: 'Tổng thành viên', value: num(k.totalMembers), icon: <Users size={18} />, tone: 'info' },
    { label: 'Người dùng hoạt động', value: num(k.activeUsers), icon: <UserCheck size={18} />, tone: 'info' },
    { label: 'Đăng nhập 24h', value: num(k.logins24h), icon: <LogIn size={18} />, tone: 'brand' },
    { label: 'MRR', value: vnd(k.mrr), icon: <TrendingUp size={18} />, tone: 'success' },
    { label: `Doanh thu (${rangeLabel})`, value: vnd(k.revenueInRange), icon: <Wallet size={18} />, tone: 'success' },
    { label: 'Thuê bao trả phí', value: num(k.paidSubscribers), icon: <CreditCard size={18} />, tone: 'brand' },
    { label: 'AI Request', value: num(k.aiRequests), icon: <Bot size={18} />, tone: 'brand' },
    { label: 'Chi phí AI', value: <NoData hint="Token/chi phí AI chưa được ghi nhận" />, icon: <Cpu size={18} />, tone: 'neutral' },
    { label: 'Uptime', value: fmtUptime(k.uptimeSeconds), icon: <Server size={18} />, tone: 'success' },
  ]

  return (
    <>
      {/* 12 KPI + AIDO Executive Summary */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {kpis.map((c) => <MetricCard key={c.label} label={c.label} value={c.value} icon={c.icon} tone={c.tone} />)}
        </div>
        <ChartCard title="AIDO Executive Summary" subtitle="AI tổng hợp từ dữ liệu thật">
          <SummaryBlock summary={data.summary} />
        </ChartCard>
      </div>

      {/* Kinh doanh & thuê bao */}
      <Section title="Kinh doanh & thuê bao" icon={<TrendingUp size={16} />}>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Doanh thu & tăng trưởng" subtitle="Doanh thu thật (đơn đã thanh toán) + thu/chi ghi nhận">
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Mini label="Hôm nay" value={vnd(biz.revenue.today)} />
              <Mini label="Tháng" value={vnd(biz.revenue.month)} />
              <Mini label="Quý" value={vnd(biz.revenue.quarter)} />
              <Mini label="Năm" value={vnd(biz.revenue.year)} />
              <Mini label="MRR" value={vnd(biz.revenue.mrr)} />
              <Mini label="ARR" value={vnd(biz.revenue.arr)} />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={fin.trend} margin={{ left: -10, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--pf-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--pf-color-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--pf-color-muted)' }} tickFormatter={(v: number) => (v >= 1e6 ? `${Math.round(v / 1e6)}tr` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : `${v}`)} />
                <Tooltip {...CHART_TOOLTIP} formatter={(v: any, key: any) => [formatVND(Number(v) || 0), key === 'revenue' ? 'Doanh thu' : key === 'income' ? 'Thu quỹ' : 'Chi']} />
                <Area type="monotone" dataKey="income" stroke="var(--pf-green)" fill="var(--pf-green)" fillOpacity={0.12} />
                <Area type="monotone" dataKey="expense" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} />
                <Area type="monotone" dataKey="revenue" stroke="var(--pf-primary)" fill="var(--pf-primary)" fillOpacity={0.18} />
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
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Mini label="Sắp hết hạn" value={num(biz.subscription.expiringSoon)} tone={biz.subscription.expiringSoon > 0 ? 'warning' : undefined} />
              <Mini label="Đã hết hạn" value={num(biz.subscription.expired)} tone={biz.subscription.expired > 0 ? 'danger' : undefined} />
              <Mini label="Nâng cấp trong kỳ" value={num(biz.subscription.upgradesInRange)} />
              <Mini label="Hủy trong kỳ" value={num(biz.subscription.cancellationsInRange)} />
            </div>
            <p className="mt-3 text-[11px] [color:var(--pf-color-muted)]">Tỷ lệ Trial→Pro / gia hạn / hủy: <NoData hint="Chưa đủ lịch sử giao dịch để tính tỷ lệ" /></p>
          </ChartCard>
        </div>
      </Section>

      {/* Hoạt động toàn hệ thống */}
      <Section title="Hoạt động toàn hệ thống" desc={rangeLabel} icon={<Activity size={16} />}>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <MetricCard label="CLB mới" value={num(ops.clubs.new)} icon={<Building2 size={16} />} tone="brand" />
          <MetricCard label="CLB hoạt động" value={num(ops.clubs.active)} icon={<Activity size={16} />} tone="success" />
          <MetricCard label="Thành viên mới" value={num(ops.members.new)} icon={<Users size={16} />} tone="info" />
          <MetricCard label="Lượt đăng ký buổi" value={num(ops.members.registrations)} icon={<ClipboardList size={16} />} tone="info" />
          <MetricCard label="Lượt điểm danh" value={num(ops.members.attendance)} icon={<UserCheck size={16} />} tone="success" />
          <MetricCard label="Kỳ quỹ" value={num(ops.business.fundPeriods)} icon={<Wallet size={16} />} tone="brand" />
          <MetricCard label="Buổi chơi" value={num(ops.business.sessions)} icon={<Activity size={16} />} tone="info" />
          <MetricCard label="Giải đấu / Minigame" value={num(ops.business.minigames)} icon={<Trophy size={16} />} tone="warning" />
          <MetricCard label="Trận đấu" value={num(ops.business.matches)} icon={<Trophy size={16} />} tone="warning" />
          <MetricCard label="Báo cáo đã xuất" value={<NoData hint="Chưa có bảng ghi nhận số báo cáo xuất" />} icon={<ClipboardList size={16} />} tone="neutral" />
        </div>
      </Section>

      {/* Tổng hợp tài chính toàn nền tảng */}
      <Section title="Tổng hợp tài chính toàn nền tảng" desc="chỉ Super Admin · đã ghi audit" icon={<Wallet size={16} />}>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Tổng thu ghi nhận" value={vnd(fin.totalIncome)} icon={<TrendingUp size={16} />} tone="success" />
          <MetricCard label="Tổng chi ghi nhận" value={vnd(fin.totalExpense)} icon={<Wallet size={16} />} tone="danger" />
          <MetricCard label="Tổng số dư quỹ" value={vnd(fin.totalBalance)} icon={<Wallet size={16} />} tone={fin.totalBalance >= 0 ? 'success' : 'danger'} />
          <MetricCard label="Chi chờ duyệt" value={num(fin.pendingExpenses)} icon={<ClipboardList size={16} />} tone={fin.pendingExpenses > 0 ? 'warning' : 'success'} />
          <MetricCard label="Tổng công nợ" value={<NoData hint="Không lưu dueDate/công nợ tập trung" />} icon={<CircleAlert size={16} />} tone="neutral" />
          <MetricCard label="Thu đúng hạn" value={<NoData hint="Không lưu hạn thu → chưa tính được tỷ lệ" />} icon={<Gauge size={16} />} tone="neutral" />
        </div>
      </Section>

      {/* AIDO AI Operations */}
      <Section title="AIDO AI Operations" desc={rangeLabel} icon={<Bot size={16} />}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <AgentCard name="Maika" role="Phân tích & Khuyến nghị" icon={<Sparkles size={16} />} rows={[['Insight', ai.agents.maika.insights], ['Action', ai.agents.maika.actions]]} />
          <AgentCard name="Lisa" role="Hội thoại & Hỏi đáp" icon={<MessageSquare size={16} />} rows={[['Tin nhắn', ai.agents.lisa.messages]]} />
          <AgentCard name="Hermes" role="Workflow & Điều phối" icon={<Workflow size={16} />} rows={[['Chạy', ai.agents.hermes.runs], ['Hoàn tất', ai.agents.hermes.completed], ['Chờ duyệt', ai.agents.hermes.waiting], ['Lỗi', ai.agents.hermes.failed]]} />
          <AgentCard name="Mít Đặc" role="Thực thi tác vụ" icon={<Zap size={16} />} rows={[['Đã chạy', ai.agents.mitDac.executed], ['Thất bại', ai.agents.mitDac.failed], ['TB (ms)', ai.agents.mitDac.avgMs ?? '—']]} />
          <AgentCard name="Notification AI" role="Thông báo" icon={<Bell size={16} />} rows={[['In-app', ai.agents.notification.byChannel.IN_APP], ['Email', ai.agents.notification.byChannel.EMAIL], ['Telegram', ai.agents.notification.byChannel.TELEGRAM], ['Lỗi', ai.agents.notification.failed]]} />
        </div>
        <div className="mt-3 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Tổng request" value={num(ai.totals.requests)} icon={<Bot size={16} />} tone="brand" />
          <MetricCard label="Tỷ lệ thành công" value={pctStr(ai.totals.successRate)} icon={<Gauge size={16} />} tone="success" />
          <MetricCard label="TG thực thi TB" value={ai.totals.avgActionMs != null ? `${num(ai.totals.avgActionMs)} ms` : '—'} icon={<Clock size={16} />} tone="info" />
          <MetricCard label="Lỗi AI" value={num(ai.totals.errors)} icon={<AlertTriangle size={16} />} tone={ai.totals.errors > 0 ? 'danger' : 'success'} />
          <MetricCard label="Token / Chi phí" value={<NoData hint="Chưa ghi nhận token/chi phí LLM" />} icon={<Cpu size={16} />} tone="neutral" />
          <MetricCard label="Provider / Fallback" value={<NoData hint="Chưa ghi nhận provider/model/fallback" />} icon={<Server size={16} />} tone="neutral" />
        </div>
      </Section>

      {/* Sức khỏe hạ tầng */}
      <Section title="Sức khỏe hạ tầng" icon={<HeartPulse size={16} />}>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          <MetricCard label="CPU" value={pctStr(infra.cpu?.pct)} sub={`load ${infra.cpu?.load1} · ${infra.cpu?.cores} core`} icon={<Cpu size={16} />} tone={infra.cpu?.pct >= 85 ? 'danger' : infra.cpu?.pct >= 60 ? 'warning' : 'success'} />
          <MetricCard label="RAM" value={pctStr(infra.memory?.pct)} sub={`${num(infra.memory?.usedMb)}/${num(infra.memory?.totalMb)} MB`} icon={<Gauge size={16} />} tone={infra.memory?.pct >= 90 ? 'danger' : infra.memory?.pct >= 70 ? 'warning' : 'success'} />
          <MetricCard label="Uptime" value={fmtUptime(infra.uptimeSeconds)} icon={<Server size={16} />} tone="success" />
          <MetricCard label="Database" value={infra.db?.status === 'up' ? 'Bình thường' : 'Lỗi'} sub={infra.db?.latencyMs != null ? `${infra.db.latencyMs} ms` : undefined} icon={<Database size={16} />} tone={infra.db?.status === 'up' ? 'success' : 'danger'} />
          <MetricCard label="Disk" value={<NoData />} icon={<Database size={16} />} tone="neutral" />
          <MetricCard label="Queue" value={<NoData />} icon={<Server size={16} />} tone="neutral" />
          <MetricCard label="Storage" value={<NoData />} icon={<Database size={16} />} tone="neutral" />
          <MetricCard label="Backup" value={<NoData />} icon={<ShieldCheck size={16} />} tone="neutral" />
        </div>
        <p className="mt-2 text-[11px] [color:var(--pf-color-muted)]">CPU/RAM/Uptime/DB lấy trực tiếp từ tiến trình máy chủ (Node os/process + ping DB). Các mục xám chưa có nguồn giám sát → chưa hiển thị.</p>
      </Section>

      {/* Cảnh báo + Bảng xếp hạng */}
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
        </ChartCard>

        <ChartCard title="Bảng xếp hạng điều hành" subtitle="Top CLB & hiệu quả AI (không công khai cho CLB)">
          {lb ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <RankList title="Thành viên nhiều nhất" rows={lb.topByMembers} fmt={num} />
              <RankList title="Hoạt động tích cực nhất" rows={lb.topByActivity} fmt={num} />
              <RankList title="Doanh thu cao nhất" rows={lb.topByRevenue} fmt={vnd} />
              <RankList title="Tổ chức nhiều giải nhất" rows={lb.topByTournaments} fmt={num} />
              <RankList title="Dùng AI nhiều nhất" rows={lb.topByAiUsage} fmt={num} />
            </div>
          ) : <EmptyState icon={<Trophy size={22} />} title="Đang lọc theo 1 CLB" description="Chọn 'Tất cả CLB' để xem bảng xếp hạng." />}
        </ChartCard>
      </div>

      {/* Nhật ký hệ thống (audit log) */}
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

function Mini({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'warning' | 'danger' }) {
  return (
    <div className="rounded-xl border p-2.5 [border-color:var(--pf-border)] [background:var(--pf-surface-muted)]">
      <p className="text-[10px] font-semibold uppercase tracking-wide [color:var(--pf-color-muted)]">{label}</p>
      <p className="mt-0.5 text-sm font-bold" style={{ color: tone === 'danger' ? 'var(--pf-color-danger)' : tone === 'warning' ? 'var(--pf-color-warning)' : 'var(--pf-text)' }}>{value}</p>
    </div>
  )
}

function AgentCard({ name, role, icon, rows }: { name: string; role: string; icon: React.ReactNode; rows: [string, React.ReactNode][] }) {
  return (
    <div className="rounded-[18px] border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)]">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">{icon}</span>
        <div className="min-w-0"><p className="text-sm font-extrabold [color:var(--pf-text)]">{name}</p><p className="truncate text-[10px] [color:var(--pf-color-muted)]">{role}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {rows.map(([lbl, val]) => (
          <div key={lbl} className="rounded-lg [background:var(--pf-surface-muted)] px-2 py-1.5">
            <p className="text-[10px] [color:var(--pf-color-muted)]">{lbl}</p>
            <p className="text-[13px] font-bold [color:var(--pf-text)]">{typeof val === 'number' ? formatNumber(val) : val}</p>
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
