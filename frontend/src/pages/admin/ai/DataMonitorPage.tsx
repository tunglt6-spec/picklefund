/**
 * DataMonitorPage — AI Operations Center › Data Monitor (Pha 4 Hermes v2).
 * Nối endpoint read-only MỚI (additive): GET /ai/maika/data-quality — kiểm tra dữ liệu
 * THẬT (trùng SĐT/tên, thiếu liên hệ, nhất quán kỳ quỹ), scope theo clubId từ JWT.
 * V2.2 Clean Modern SaaS + loading/error state.
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Database, ArrowRight, Users, CalendarDays, CalendarClock, ShieldAlert,
  CheckCircle2, AlertTriangle, AlertCircle,
} from 'lucide-react'
import api from '../../../lib/api'
import {
  PageShell, PageHeader, MetricCard, StatusBadge, LoadingState, ErrorState,
  type StatusTone,
} from '../../../components/shared'

type DqLevel = 'ok' | 'attention' | 'warning'
interface DqCheck { key: string; dimension: string; label: string; level: DqLevel; count: number; items: string[] }
interface DqReport {
  generatedAt: string
  totals: { members: number; activeMembers: number; fundPeriods: number; sessions: number }
  checks: DqCheck[]
}

// Link "sửa nhanh" theo từng kiểm tra → màn xử lý tương ứng.
const FIX_LINK: Record<string, { to: string; label: string }> = {
  DUP_PHONE: { to: '/members', label: 'Sửa ở Thành viên' },
  DUP_NAME: { to: '/members', label: 'Sửa ở Thành viên' },
  DUP_EMAIL: { to: '/members', label: 'Sửa ở Thành viên' },
  MISSING_CONTACT: { to: '/members', label: 'Bổ sung liên hệ' },
  ACTIVE_CHUNG: { to: '/fund-periods', label: 'Mở màn Kỳ Quỹ' },
  STALE_SESSION: { to: '/schedule', label: 'Chốt buổi tập' },
}

const LEVEL_TONE: Record<DqLevel, StatusTone> = { ok: 'success', attention: 'warning', warning: 'danger' }
const LEVEL_LABEL: Record<DqLevel, string> = { ok: 'Đạt', attention: 'Chú ý', warning: 'Cần xử lý' }
const LEVEL_ICON: Record<DqLevel, React.ReactNode> = {
  ok: <CheckCircle2 size={16} className="text-emerald-500" />,
  attention: <AlertCircle size={16} className="text-amber-500" />,
  warning: <AlertTriangle size={16} className="text-red-500" />,
}

export function DataMonitorPage() {
  const navigate = useNavigate()
  const [report, setReport] = useState<DqReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await api.get('/ai/maika/data-quality')
      setReport((res.data?.data ?? res.data ?? null) as DqReport)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const issues = report?.checks.filter(c => c.level !== 'ok') ?? []

  return (
    <PageShell>
      <PageHeader
        title="Data Monitor"
        subtitle="Giám sát chất lượng & toàn vẹn dữ liệu CLB"
      />

      {loading ? (
        <LoadingState rows={5} />
      ) : error || !report ? (
        <ErrorState onRetry={() => void load()} />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Tổng quan */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard label="Thành viên hoạt động" value={report.totals.activeMembers} icon={<Users size={16} />} sub={`${report.totals.members} tổng`} />
            <MetricCard label="Kỳ quỹ" value={report.totals.fundPeriods} icon={<CalendarClock size={16} />} />
            <MetricCard label="Buổi sinh hoạt" value={report.totals.sessions} icon={<CalendarDays size={16} />} />
            <MetricCard label="Kiểm tra cần xử lý" value={issues.length} icon={<ShieldAlert size={16} />} negative={issues.length > 0} sub={`${report.checks.length} kiểm tra`} />
          </div>

          {issues.length === 0 && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 size={16} /> Dữ liệu sạch — tất cả kiểm tra đều đạt.
            </div>
          )}

          {/* Danh sách kiểm tra */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <Database size={16} className="text-slate-400" /> Kiểm Tra Chất Lượng Dữ Liệu
              </h3>
              <span className="text-[11px] text-slate-400">
                {new Date(report.generatedAt).toLocaleString('vi-VN', { hour12: false })}
              </span>
            </div>
            <div className="space-y-3">
              {report.checks.map(c => (
                <div key={c.key} className="rounded-xl border border-slate-100 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {LEVEL_ICON[c.level]}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">{c.label}</p>
                        <p className="text-[11px] text-slate-400">{c.dimension} · {c.count} mục</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.level !== 'ok' && FIX_LINK[c.key] && (
                        <button
                          onClick={() => navigate(FIX_LINK[c.key].to)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold [color:var(--pf-primary)] hover:underline"
                        >
                          {FIX_LINK[c.key].label} <ArrowRight size={12} />
                        </button>
                      )}
                      <StatusBadge tone={LEVEL_TONE[c.level]}>{LEVEL_LABEL[c.level]}</StatusBadge>
                    </div>
                  </div>
                  {c.items.length > 0 && (
                    <ul className="mt-2.5 space-y-1 border-t border-slate-50 pt-2.5">
                      {c.items.map((it, i) => (
                        <li key={i} className="text-[12px] text-slate-500 flex items-start gap-1.5">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                          <span className="min-w-0">{it}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>

          <p className="text-[11px] text-slate-400 px-1">
            Toàn vẹn tham chiếu (khóa ngoại) được cơ sở dữ liệu đảm bảo. Các kiểm tra ở đây là read-only,
            không thay đổi dữ liệu — hãy sửa trực tiếp ở màn Thành viên / Kỳ Quỹ khi cần.
          </p>
        </div>
      )}
    </PageShell>
  )
}
