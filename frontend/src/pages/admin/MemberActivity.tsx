/**
 * MemberActivity (v2.1) — Lịch sử hoạt động Thành viên (Hướng A): hồ sơ hoạt động từng TV,
 * GỘP từ dữ liệu ĐÃ CÓ trong client store (điểm danh · đóng quỹ · chuyên cần). KHÔNG gọi API
 * mới, không đổi nghiệp vụ — chỉ tổng hợp & hiển thị.
 */
import { useMemo, useState } from 'react'
import { Search, DollarSign, CalendarCheck, TrendingUp, Activity } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useClubDataStore } from '../../store/clubDataStore'
import { useClubContributions } from '../../hooks/useFinanceData'
import { formatVND, cn } from '../../lib/utils'
import { PageShell, PageHeader, MetricCard, EmptyState } from '../../components/shared'

const fmtDate = (s?: string) => (s ? s.slice(0, 10).split('-').reverse().join('/') : '')

export function MemberActivity() {
  const clubId = useAuthStore((s) => s.user?.clubId) ?? ''
  const data = useClubDataStore((s) => s.getClubData(clubId))
  const members = data.members ?? []
  // Option 3: self-fetch cục bộ (không đọc global store).
  const { data: contributions } = useClubContributions(clubId)
  const attSummary = data.memberAttendanceSummary ?? []

  const [q, setQ] = useState('')
  const [selId, setSelId] = useState<string | null>(members[0]?.id ?? null)

  const rows = useMemo(() =>
    members.map((m) => {
      const att = attSummary.find((a) => a.memberId === m.id)
      const contribs = contributions.filter((c) => c.memberId === m.id && c.paymentDate)
      const totalPaid = contribs.reduce((s, c) => s + (c.amount || 0), 0)
      const rate = att && att.totalSessions > 0 ? Math.round((att.attendedSessions / att.totalSessions) * 100) : null
      return { m, att, contribs, totalPaid, rate }
    }), [members, attSummary, contributions])

  const filtered = rows.filter((r) => !q || r.m.fullName.toLowerCase().includes(q.toLowerCase()))
  const sel = rows.find((r) => r.m.id === selId) ?? filtered[0]

  if (members.length === 0) {
    return (
      <PageShell>
        <PageHeader title="Lịch sử hoạt động" subtitle="Hồ sơ hoạt động thành viên" />
        <EmptyState icon={<Activity size={24} />} title="Chưa có dữ liệu"
          description="Thêm thành viên và ghi nhận điểm danh/đóng quỹ để xem hồ sơ hoạt động." />
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader title="Lịch sử hoạt động" subtitle="Hồ sơ từng thành viên · điểm danh · đóng quỹ · chuyên cần" />

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* Danh sách thành viên */}
        <div className="overflow-hidden rounded-[20px] border [border-color:var(--pf-border)] [background:var(--pf-surface)] [box-shadow:var(--pf-shadow)]">
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm thành viên..." className="input-base pl-9" />
            </div>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {filtered.map((r) => (
              <button
                key={r.m.id}
                onClick={() => setSelId(r.m.id)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5 text-left transition-colors',
                  sel?.m.id === r.m.id ? '[background:var(--pf-primary-soft)]' : 'hover:bg-slate-50',
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium [color:var(--pf-text)]">{r.m.fullName}</span>
                  <span className="text-[11px] [color:var(--pf-color-muted)]">{r.contribs.length} lần đóng · {r.rate != null ? `${r.rate}% chuyên cần` : 'chưa có buổi'}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold [color:var(--pf-green)]">{formatVND(r.totalPaid)}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="p-6 text-center text-sm text-slate-400">Không tìm thấy</p>}
          </div>
        </div>

        {/* Chi tiết thành viên */}
        {sel && (
          <div className="space-y-4">
            <div className="rounded-[20px] border p-4 [background:var(--pf-surface)] [border-color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
              <h3 className="text-lg font-bold [color:var(--pf-text)]">{sel.m.fullName}</h3>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <MetricCard icon={<CalendarCheck size={18} />} accent="blue" label="Buổi tham gia" value={sel.att ? `${sel.att.attendedSessions}/${sel.att.totalSessions}` : '—'} />
                <MetricCard icon={<TrendingUp size={18} />} accent="teal" label="Chuyên cần" value={sel.rate != null ? `${sel.rate}%` : '—'} />
                <MetricCard icon={<DollarSign size={18} />} accent="violet" label="Tổng đóng quỹ" value={formatVND(sel.totalPaid)} />
              </div>
            </div>

            <div className="rounded-[20px] border p-4 [background:var(--pf-surface)] [border-color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
              <p className="mb-2 text-sm font-bold [color:var(--pf-text)]">Lịch sử đóng quỹ</p>
              {sel.contribs.length === 0 ? (
                <p className="py-6 text-sm [color:var(--pf-color-muted)]">Chưa có khoản đóng quỹ.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {[...sel.contribs].sort((a, b) => (a.paymentDate < b.paymentDate ? 1 : -1)).slice(0, 20).map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="[color:var(--pf-color-muted)]">{fmtDate(c.paymentDate)}{c.paymentMethod ? ` · ${c.paymentMethod}` : ''}</span>
                      <span className="font-semibold [color:var(--pf-green)]">+{formatVND(c.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
