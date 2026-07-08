/**
 * Debts (19) — Công nợ cá nhân: màn gộp riêng tổng hợp thành viên còn nợ quỹ
 * kỳ đang mở. Trạng thái (chưa đóng/chờ xác nhận/đã đóng) suy từ contributions
 * trong clubDataStore như TreasurerReminders; SỐ TIỀN còn nợ lấy từ
 * GET /fund-periods/:id/summary (financial-calculator canonical — chia đều
 * chi phí sân + chia theo tỉ lệ tham dự sinh hoạt) để khớp với Reports/FundPeriods,
 * KHÔNG dùng flat contributionAmount (sai khi CLB có chi sinh hoạt phân bổ theo buổi).
 * Dùng shared kit V2.2 (PageShell/PageHeader/MetricCard/DataTable/MobileCardList/
 * StatusBadge/EmptyState) — token màu, không hardcode brand.
 */
import { useEffect, useMemo, useState } from 'react'
import { Users, AlertCircle, Clock, Wallet } from 'lucide-react'
import api from '../../lib/api'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatVND, getActiveChungPeriod } from '../../lib/utils'
import {
  PageShell, PageHeader, MetricCard, DataTable, MobileCardList,
  StatusBadge, EmptyState, ResponsiveTabs, type Column, type TabItem, type StatusTone,
} from '../../components/shared'

function isLocalToken(token?: string | null) {
  return !!token && (token.startsWith('local-token-') || token.startsWith('token-'))
}

type DebtStatus = 'unpaid' | 'pending' | 'paid'
interface DebtRow {
  id: string
  name: string
  phone?: string
  status: DebtStatus
  amount: number
}

const STATUS_META: Record<DebtStatus, { label: string; tone: StatusTone }> = {
  unpaid: { label: 'Chưa đóng', tone: 'danger' },
  pending: { label: 'Chờ xác nhận', tone: 'warning' },
  paid: { label: 'Đã đóng', tone: 'success' },
}

export function Debts() {
  const clubId = useAuthStore((s) => s.user?.clubId) ?? ''
  const accessToken = useAuthStore((s) => s.accessToken)
  const data = useClubDataStore((s) => s.getClubData(clubId))
  const { members, contributions, fundPeriods } = data

  const activePeriod = useMemo(
    () => getActiveChungPeriod(fundPeriods) ?? null,
    [fundPeriods],
  )
  const amount = activePeriod?.contributionAmount ?? 0

  // Số nợ thật/thành viên (courtFee chia đều + livingFee theo tỉ lệ tham dự - đã đóng),
  // canonical từ financial-calculator qua fund-periods summary — khớp Reports/FundPeriods.
  const [memberBalances, setMemberBalances] = useState<Record<string, number>>({})
  useEffect(() => {
    if (!activePeriod?.id || isLocalToken(accessToken)) { setMemberBalances({}); return }
    let cancelled = false
    api.get(`/fund-periods/${activePeriod.id}/summary`).then((res) => {
      if (cancelled) return
      const list = (res.data?.data?.members ?? []) as { memberId: string; balance: number }[]
      setMemberBalances(Object.fromEntries(list.map((m) => [m.memberId, m.balance])))
    }).catch(() => { if (!cancelled) setMemberBalances({}) })
    return () => { cancelled = true }
  }, [activePeriod?.id, accessToken])

  const rows = useMemo<DebtRow[]>(() => {
    const commonContribs = contributions.filter((c) => (c.fundSource ?? 'COMMON') === 'COMMON')
    return members
      .filter((m) => m.status === 'active')
      .map((m) => {
        const contrib = commonContribs.find(
          (c) => c.memberId === m.id && (!activePeriod || c.fundPeriodId === activePeriod.id),
        )
        const status: DebtStatus = !contrib ? 'unpaid' : contrib.isConfirmed ? 'paid' : 'pending'
        // Ưu tiên số dư thật (balance < 0 = còn nợ) từ backend; fallback mức đóng chuẩn
        // khi chưa có dữ liệu backend (demo/local token hoặc đang tải).
        const realBalance = memberBalances[m.id]
        const owed = realBalance !== undefined ? Math.max(0, -realBalance) : amount
        return {
          id: m.id,
          name: m.fullName,
          phone: m.phone,
          status,
          amount: status === 'paid' ? 0 : owed,
        }
      })
      .sort((a, b) => {
        const order: Record<DebtStatus, number> = { unpaid: 0, pending: 1, paid: 2 }
        return order[a.status] - order[b.status] || a.name.localeCompare(b.name, 'vi')
      })
  }, [members, contributions, activePeriod, amount, memberBalances])

  const stats = useMemo(() => {
    const unpaid = rows.filter((r) => r.status === 'unpaid')
    const pending = rows.filter((r) => r.status === 'pending')
    const paid = rows.filter((r) => r.status === 'paid')
    const totalDebt = [...unpaid, ...pending].reduce((s, r) => s + r.amount, 0)
    const collectRate = rows.length > 0 ? Math.round((paid.length / rows.length) * 100) : 0
    return { unpaid: unpaid.length, pending: pending.length, paid: paid.length, totalDebt, collectRate }
  }, [rows])

  const [tab, setTab] = useState<'all' | DebtStatus>('all')
  const tabs: TabItem[] = [
    { key: 'all', label: 'Tất cả', badge: rows.length },
    { key: 'unpaid', label: 'Chưa đóng', badge: stats.unpaid },
    { key: 'pending', label: 'Chờ xác nhận', badge: stats.pending },
    { key: 'paid', label: 'Đã đóng', badge: stats.paid },
  ]
  const filtered = tab === 'all' ? rows : rows.filter((r) => r.status === tab)

  const columns: Column<DebtRow>[] = [
    { key: 'name', header: 'Thành viên', render: (r) => <span className="font-medium [color:var(--pf-text)]">{r.name}</span> },
    { key: 'phone', header: 'Điện thoại', render: (r) => <span className="[color:var(--pf-color-muted)]">{r.phone || '—'}</span> },
    { key: 'status', header: 'Trạng thái', align: 'center', render: (r) => <StatusBadge tone={STATUS_META[r.status].tone}>{STATUS_META[r.status].label}</StatusBadge> },
    {
      key: 'amount', header: 'Còn nợ', align: 'right',
      render: (r) => r.amount > 0
        ? <span className="font-semibold [color:var(--pf-color-danger)] tabular-nums">{formatVND(r.amount)}</span>
        : <span className="[color:var(--pf-color-muted)]">—</span>,
    },
  ]

  const hasData = members.some((m) => m.status === 'active')

  return (
    <PageShell>
      <PageHeader
        title="Công nợ cá nhân"
        subtitle={activePeriod ? `Kỳ ${activePeriod.name} · ${amount ? formatVND(amount) : 'chưa đặt mức'}/người` : 'Chưa có kỳ quỹ đang mở'}
      />

      {!hasData ? (
        <EmptyState icon={<Users size={24} />} title="Chưa có thành viên hoạt động" description="Thêm thành viên và mở kỳ quỹ để theo dõi công nợ." />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <MetricCard accent="rose" icon={<AlertCircle size={18} />} label="Còn nợ" value={stats.unpaid} sub="thành viên chưa đóng" />
            <MetricCard accent="amber" icon={<Clock size={18} />} label="Chờ xác nhận" value={stats.pending} sub="đã đóng, chờ duyệt" />
            <MetricCard accent="violet" icon={<Wallet size={18} />} label="Tổng công nợ" value={formatVND(stats.totalDebt)} />
            <MetricCard accent="teal" icon={<Users size={18} />} label="Tỷ lệ đã thu" value={`${stats.collectRate}%`} sub={`${stats.paid}/${rows.length} đã đóng`} />
          </div>

          <div className="rounded-[20px] border p-4 sm:p-5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
            <div className="mb-3">
              <ResponsiveTabs tabs={tabs} active={tab} onChange={(k) => setTab(k as 'all' | DebtStatus)} />
            </div>

            {filtered.length === 0 ? (
              <EmptyState icon={<Users size={22} />} title="Không có thành viên trong mục này" />
            ) : (
              <>
                <div className="hidden md:block">
                  <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} />
                </div>
                <div className="md:hidden">
                  <MobileCardList
                    items={filtered}
                    itemKey={(r) => r.id}
                    renderCard={(r) => (
                      <div className="flex items-center justify-between gap-3 rounded-[16px] border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)]">
                        <div className="min-w-0">
                          <p className="font-semibold [color:var(--pf-text)] truncate">{r.name}</p>
                          <p className="text-xs [color:var(--pf-color-muted)]">{r.phone || '—'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <StatusBadge tone={STATUS_META[r.status].tone}>{STATUS_META[r.status].label}</StatusBadge>
                          {r.amount > 0 && <span className="text-sm font-semibold [color:var(--pf-color-danger)] tabular-nums">{formatVND(r.amount)}</span>}
                        </div>
                      </div>
                    )}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </PageShell>
  )
}
