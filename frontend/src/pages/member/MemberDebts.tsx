/**
 * MemberDebts — bản Công nợ dành cho MEMBER trong module "Cá nhân": CÙNG dữ liệu/logic
 * canonical như admin Debts (suy trạng thái từ contributions + số tiền còn nợ từ
 * /fund-periods/:id/summary), nhưng BỐ CỤC giống màn Tổng Quan: trái 2/3 (KPI 2×2 +
 * bảng thành viên) · phải 1/3 (vòng tỷ lệ đã thu + tổng công nợ). Read-only, self-scope
 * theo clubId từ JWT. KHÔNG sửa admin Debts (dùng chung với trang quản trị).
 */
import { useEffect, useMemo, useState } from 'react'
import { Users, AlertCircle, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useClubDataStore } from '../../store/clubDataStore'
import { useClubContributions } from '../../hooks/useFinanceData'
import { useAuthStore } from '../../store/authStore'
import { formatVND, getActiveChungPeriod } from '../../lib/utils'
import { exportGenericExcel, exportGenericTablePDF } from '../../lib/export'
import {
  PageShell, PageHeader, MetricCard, ChartCard, DataTable, MobileCardList,
  StatusBadge, EmptyState, ResponsiveTabs, ExportActions, type Column, type TabItem, type StatusTone,
} from '../../components/shared'

function isLocalToken(token?: string | null) {
  return !!token && (token.startsWith('local-token-') || token.startsWith('token-'))
}

// CANONICAL (money-based): 2 trạng thái — Đã đóng (đủ tiền, xác nhận) / Chưa đóng.
type DebtStatus = 'unpaid' | 'paid'
interface DebtRow {
  id: string
  name: string
  phone?: string
  status: DebtStatus
  amount: number
}

const STATUS_META: Record<DebtStatus, { label: string; tone: StatusTone }> = {
  unpaid: { label: 'Chưa đóng', tone: 'danger' },
  paid: { label: 'Đã đóng', tone: 'success' },
}

export function MemberDebts() {
  const clubId = useAuthStore((s) => s.user?.clubId) ?? ''
  const accessToken = useAuthStore((s) => s.accessToken)
  const data = useClubDataStore((s) => s.getClubData(clubId))
  const { members, fundPeriods } = data
  const { data: contributions } = useClubContributions(clubId)

  const activePeriod = useMemo(
    () => getActiveChungPeriod(fundPeriods) ?? null,
    [fundPeriods],
  )
  const amount = activePeriod?.contributionAmount ?? 0

  // Canonical/thành viên từ fund-periods summary (financial-calculator): số dư + đã-đóng-đủ.
  const [memberInfo, setMemberInfo] = useState<Record<string, { balance: number; paid: boolean }>>({})
  useEffect(() => {
    if (!activePeriod?.id || isLocalToken(accessToken)) { setMemberInfo({}); return }
    let cancelled = false
    api.get(`/fund-periods/${activePeriod.id}/summary`).then((res) => {
      if (cancelled) return
      const list = (res.data?.data?.members ?? []) as { memberId: string; balance: number; contributionPaid?: boolean }[]
      setMemberInfo(Object.fromEntries(list.map((m) => [m.memberId, { balance: m.balance, paid: !!m.contributionPaid }])))
    }).catch(() => { if (!cancelled) setMemberInfo({}) })
    return () => { cancelled = true }
  }, [activePeriod?.id, accessToken])

  const rows = useMemo<DebtRow[]>(() => {
    const commonContribs = contributions.filter((c) => (c.fundSource ?? 'COMMON') === 'COMMON')
    return members
      .filter((m) => m.status === 'active')
      .map((m) => {
        const info = memberInfo[m.id]
        let status: DebtStatus
        let owed: number
        if (info !== undefined) {
          status = info.paid ? 'paid' : 'unpaid'
          owed = Math.max(0, -info.balance)
        } else {
          const contrib = commonContribs.find(
            (c) => c.memberId === m.id && (!activePeriod || c.fundPeriodId === activePeriod.id),
          )
          status = contrib?.isConfirmed ? 'paid' : 'unpaid'
          owed = amount
        }
        return { id: m.id, name: m.fullName, phone: m.phone, status, amount: status === 'paid' ? 0 : owed }
      })
      .sort((a, b) => {
        const order: Record<DebtStatus, number> = { unpaid: 0, paid: 1 }
        return order[a.status] - order[b.status] || a.name.localeCompare(b.name, 'vi')
      })
  }, [members, contributions, activePeriod, amount, memberInfo])

  const stats = useMemo(() => {
    const unpaid = rows.filter((r) => r.status === 'unpaid')
    const paid = rows.filter((r) => r.status === 'paid')
    const totalDebt = unpaid.reduce((s, r) => s + r.amount, 0)
    const collectRate = rows.length > 0 ? Math.round((paid.length / rows.length) * 100) : 0
    return { unpaid: unpaid.length, paid: paid.length, totalDebt, collectRate }
  }, [rows])

  const [tab, setTab] = useState<'all' | DebtStatus>('all')
  const tabs: TabItem[] = [
    { key: 'all', label: 'Tất cả', badge: rows.length },
    { key: 'unpaid', label: 'Chưa đóng', badge: stats.unpaid },
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

  const periodSlug = (activePeriod?.name ?? 'ky').replace(/\s/g, '_')
  const doExportExcel = () => {
    exportGenericExcel('Cong_No_' + periodSlug, 'Công nợ',
      ['Thành viên', 'Điện thoại', 'Trạng thái', 'Còn nợ (VNĐ)'],
      rows.map((r) => [r.name, r.phone ?? '', STATUS_META[r.status].label, r.amount]),
    )
    toast.success('Đã xuất Excel công nợ')
  }
  const doExportPdf = () => {
    exportGenericTablePDF({
      fileBase: 'Cong_No_' + periodSlug,
      title: 'Công Nợ Cá Nhân',
      subtitle: activePeriod ? `Kỳ ${activePeriod.name}` : undefined,
      metaLeft: `${rows.length} thành viên · Tỷ lệ đã thu ${stats.collectRate}%`,
      columns: [
        { header: '#', align: 'center' }, { header: 'Thành viên' }, { header: 'Điện thoại' },
        { header: 'Trạng thái', align: 'center' }, { header: 'Còn nợ', align: 'right' },
      ],
      rows: rows.map((r, i) => [i + 1, r.name, r.phone ?? '—', STATUS_META[r.status].label, r.amount > 0 ? formatVND(r.amount) : '—']),
      summaryLabel: 'Tổng công nợ',
      summaryValue: formatVND(stats.totalDebt),
    })
    toast.success('Đã xuất PDF công nợ')
  }

  const collectRate = stats.collectRate

  return (
    <PageShell>
      <PageHeader
        title="Công nợ cá nhân"
        subtitle={activePeriod ? `Kỳ ${activePeriod.name} · ${amount ? formatVND(amount) : 'chưa đặt mức'}/người` : 'Chưa có kỳ quỹ đang mở'}
        actions={hasData ? <ExportActions onExcel={doExportExcel} onPdf={doExportPdf} /> : undefined}
      />

      {!hasData ? (
        <EmptyState icon={<Users size={24} />} title="Chưa có thành viên hoạt động" description="Thêm thành viên và mở kỳ quỹ để theo dõi công nợ." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* CỘT TRÁI (2/3) — KPI 2×2 + bảng thành viên */}
          <div className="space-y-4 lg:col-span-2">
            <div className="grid grid-cols-2 gap-4">
              <MetricCard accent="rose" icon={<AlertCircle size={18} />} label="Còn nợ" value={stats.unpaid} sub="thành viên chưa đóng" />
              <MetricCard accent="teal" icon={<Users size={18} />} label="Đã đóng" value={stats.paid} sub="thành viên đã đóng đủ" />
              <MetricCard accent="violet" icon={<Wallet size={18} />} label="Tổng công nợ" value={formatVND(stats.totalDebt)} />
              <MetricCard accent="teal" icon={<Users size={18} />} label="Tỷ lệ đã thu" value={`${stats.collectRate}%`} sub={`${stats.paid}/${rows.length} đã đóng`} />
            </div>

            <ChartCard title="Danh sách thành viên" subtitle={`${rows.length} thành viên`}>
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
            </ChartCard>
          </div>

          {/* CỘT PHẢI (1/3) — Tỷ lệ đã thu (vòng %) + tổng công nợ */}
          <ChartCard title="Tình hình thu quỹ" subtitle={activePeriod?.name ?? undefined}>
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-28 w-28">
                <div
                  className="h-28 w-28 rounded-full"
                  style={{ background: `conic-gradient(var(--pf-primary) ${Math.min(100, collectRate) * 3.6}deg, var(--pf-color-muted-soft) 0deg)` }}
                />
                <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full [background:var(--pf-surface)]">
                  <span className="text-[22px] font-extrabold [color:var(--pf-text)]">{collectRate}%</span>
                  <span className="text-[10px] [color:var(--pf-color-muted)]">đã thu</span>
                </div>
              </div>
              <span className="text-[12px] [color:var(--pf-color-muted)]">{stats.paid}/{rows.length} thành viên đã đóng đủ</span>

              <div
                className="w-full rounded-xl px-4 py-3"
                style={{ background: stats.totalDebt > 0 ? 'var(--pf-color-danger-soft)' : 'var(--pf-color-success-soft)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold [color:var(--pf-text)]">Tổng công nợ</span>
                  <span className="text-xl font-bold" style={{ color: stats.totalDebt > 0 ? 'var(--pf-color-danger)' : 'var(--pf-color-success)' }}>
                    {formatVND(stats.totalDebt)}
                  </span>
                </div>
                <p className="mt-1 text-xs" style={{ color: stats.totalDebt > 0 ? 'var(--pf-color-danger)' : 'var(--pf-color-success)' }}>
                  {stats.totalDebt > 0 ? `Còn ${stats.unpaid} thành viên chưa đóng đủ` : '✓ Đã thu đủ quỹ kỳ này'}
                </p>
              </div>
            </div>
          </ChartCard>
        </div>
      )}
    </PageShell>
  )
}
