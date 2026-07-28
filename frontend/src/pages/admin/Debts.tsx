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
import { Users, AlertCircle, Wallet, FileSpreadsheet, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useClubDataStore } from '../../store/clubDataStore'
import { useClubContributions } from '../../hooks/useFinanceData'
import { useAuthStore } from '../../store/authStore'
import { formatVND, getActiveChungPeriod } from '../../lib/utils'
import { exportGenericExcel, exportGenericTablePDF } from '../../lib/export'
import {
  PageShell, PageHeader, MetricCard, DataTable, MobileCardList,
  StatusBadge, EmptyState, ResponsiveTabs, ActionButton, type Column, type TabItem, type StatusTone,
} from '../../components/shared'

function isLocalToken(token?: string | null) {
  return !!token && (token.startsWith('local-token-') || token.startsWith('token-'))
}

// CANONICAL (money-based): 2 trạng thái — Đã đóng (đủ tiền, xác nhận) / Chưa đóng (còn thiếu
// hoặc chưa nộp). Trạng thái "chờ xác nhận" gộp vào "chưa đóng" theo yêu cầu canonical.
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

export function Debts() {
  const clubId = useAuthStore((s) => s.user?.clubId) ?? ''
  const accessToken = useAuthStore((s) => s.accessToken)
  const data = useClubDataStore((s) => s.getClubData(clubId))
  const { members, fundPeriods } = data
  // Option 3: self-fetch cục bộ (không đọc global store) — suy trạng thái đóng theo từng TV.
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
        // CANONICAL: "đã đóng" = đã nộp đủ (contributionPaid). Fallback khi chưa có summary:
        // suy từ contribution đã xác nhận (money chưa có → dùng mức đóng chuẩn).
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

  return (
    <PageShell>
      <PageHeader
        title="Công nợ cá nhân"
        subtitle={activePeriod ? `Kỳ ${activePeriod.name} · ${amount ? formatVND(amount) : 'chưa đặt mức'}/người` : 'Chưa có kỳ quỹ đang mở'}
        actions={hasData ? (
          <>
            <ActionButton variant="secondary" iconOnly ariaLabel="Xuất Excel công nợ" icon={<FileSpreadsheet size={16} />} onClick={doExportExcel} />
            <ActionButton variant="secondary" iconOnly ariaLabel="Xuất PDF công nợ" icon={<FileText size={16} />} onClick={doExportPdf} />
          </>
        ) : undefined}
      />

      {!hasData ? (
        <EmptyState icon={<Users size={24} />} title="Chưa có thành viên hoạt động" description="Thêm thành viên và mở kỳ quỹ để theo dõi công nợ." />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <MetricCard accent="rose" icon={<AlertCircle size={18} />} label="Còn nợ" value={stats.unpaid} sub="thành viên chưa đóng" />
            <MetricCard accent="teal" icon={<Users size={18} />} label="Đã đóng" value={stats.paid} sub="thành viên đã đóng đủ" />
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
