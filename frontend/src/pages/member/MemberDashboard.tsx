import { useState } from 'react'
import { DollarSign, Calendar, TrendingUp, AlertCircle, Download, CheckCircle2, XCircle, ChevronRight, Activity, Share2, Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageShell, PageHeader, MetricCard, ChartCard, EmptyState, ActionButton, StatusBadge } from '../../components/shared'
import { useAuthStore } from '../../store/authStore'
import { useMemberPortal } from '../../hooks/useMemberPortal'
import { formatVND, formatDate } from '../../lib/utils'
import { useIsMobile } from '../../hooks/useIsMobile'
import { exportReceiptPDF } from '../../lib/export'
import { ReportPaymentModal } from '../../components/member/ReportPaymentModal'
import toast from 'react-hot-toast'

export function MemberDashboard() {
  const { user } = useAuthStore()
  const { finance, attendance, reload } = useMemberPortal()
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [reportOpen, setReportOpen] = useState(false)

  const activePeriod = finance?.period ?? null
  const fin = finance?.member ?? null
  const myContribution = finance?.contribution ?? null

  // Buổi đã hoàn thành + cờ có mặt (self-scope từ /member/me/attendance).
  const completedSessions = (attendance?.sessions ?? []).filter(s => s.status === 'completed')
  const attended = new Set(completedSessions.filter(s => s.present).map(s => s.id))

  const totalSessions = fin?.totalSessions ?? attendance?.totalCompleted ?? 0
  const myAttendance = fin?.attendedSessions ?? attendance?.attended ?? 0
  const attendanceRate = totalSessions > 0 ? Math.round((myAttendance / totalSessions) * 100) : 0

  const amountPaid = fin?.paidAmount ?? 0
  const courtExpTotal = finance?.totals?.court ?? 0
  const livingExpTotal = finance?.totals?.living ?? 0
  const memberCount = finance?.totals?.memberCount || 1
  const roughCourtCost = fin?.courtFee ?? 0
  const roughLivingCost = fin?.livingFee ?? 0
  const myCost = fin?.totalCost ?? (roughCourtCost + roughLivingCost)
  const balance = fin?.balance ?? (amountPaid - myCost)

  const memberName = fin?.memberName ?? attendance?.memberName ?? user?.username ?? 'Thành viên'
  const initials = memberName.split(' ').slice(-2).map((w: string) => w[0]).join('').toUpperCase()
  const hasData = !!activePeriod
  const isPaid = !!myContribution?.isConfirmed
  const clubName = 'CLB Pickleball'

  function handleExportPDF() {
    exportReceiptPDF({
      receiptNo: 1,
      memberName,
      loginName: user?.username ?? '',
      periodName: activePeriod?.name ?? '',
      periodStartDate: activePeriod?.startDate ?? '',
      periodEndDate: activePeriod?.endDate ?? '',
      contributionAmount: activePeriod?.contributionAmount ?? 0,
      clubName,
      clubLocation: '',
      amountPaid,
      paymentDate: myContribution?.paymentDate ?? '',
      attendedSessions: myAttendance,
      totalSessions,
      totalCourtFee: courtExpTotal,
      memberCountForSplit: memberCount,
      courtCost: roughCourtCost,
      totalOtherFee: livingExpTotal,
      livingCost: roughLivingCost,
      totalCost: myCost,
      balance,
      isConfirmed: myContribution?.isConfirmed ?? false,
    })
    toast.success('Đã xuất Phiếu Thu PDF!')
  }

  /* ── Mobile layout ── */
  if (isMobile) {
    return (
      <div className="min-h-full [background:var(--pf-bg)]">
        {/* Hero header */}
        <div
          className="px-5 pt-5 pb-6"
          style={{ background: 'var(--pf-primary)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-white text-[15px] font-[800]">
              {initials}
            </div>
            <div>
              <p className="text-white/70 text-[12px]">Xin chào 👋</p>
              <p className="text-white text-[17px] font-[700]">{memberName}</p>
            </div>
          </div>

          {hasData ? (
            <div className="bg-white/15 rounded-2xl px-4 py-3">
              <p className="text-white/70 text-[11px] font-[600] uppercase tracking-wide mb-2">
                {activePeriod?.name ?? 'Kỳ gần nhất'}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-[11px]">Số dư</p>
                  <p className={`text-[24px] font-[800] ${balance >= 0 ? 'text-white' : 'text-red-300'}`}>
                    {balance >= 0 ? '+' : ''}{formatVND(balance)}
                  </p>
                </div>
                <div className="text-right">
                  {isPaid ? (
                    <div className="flex items-center gap-1 bg-emerald-400/30 px-2.5 py-1 rounded-full">
                      <CheckCircle2 size={13} className="text-emerald-300" />
                      <span className="text-emerald-200 text-[12px] font-[600]">Đã đóng quỹ</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 bg-red-400/30 px-2.5 py-1 rounded-full">
                      <XCircle size={13} className="text-red-300" />
                      <span className="text-red-200 text-[12px] font-[600]">Chưa đóng quỹ</span>
                    </div>
                  )}
                  <p className="text-white/60 text-[11px] mt-1 text-right">{myAttendance}/{totalSessions} buổi</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/15 rounded-2xl px-4 py-3">
              <p className="text-white/70 text-[13px]">CLB chưa tạo kỳ quỹ nào</p>
            </div>
          )}
        </div>

        {/* KPI strip */}
        {hasData && (
          <div className="px-4 pt-4 grid grid-cols-3 gap-2">
            {[
              { label: 'Đã đóng', value: formatVND(amountPaid), color: '[color:var(--pf-primary)]' },
              { label: 'Chi phí TT', value: formatVND(myCost), color: 'text-rose-500' },
              { label: 'Tỷ lệ TG', value: `${attendanceRate}%`, color: attendanceRate >= 60 ? 'text-emerald-600' : 'text-amber-500' },
            ].map(k => (
              <div key={k.label} className="[background:var(--pf-surface)] rounded-[14px] border border-[color:var(--pf-border)] shadow-sm px-3 py-3 text-center">
                <p className={`text-[16px] font-[800] ${k.color} tabular-nums`}>{k.value}</p>
                <p className="text-[10px] [color:var(--pf-color-muted)] mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="px-4 pt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => setReportOpen(true)}
            className="[background:var(--pf-surface)] rounded-[14px] border border-[color:var(--pf-border)] shadow-sm px-4 py-3 flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-full [background:var(--pf-primary-soft)] flex items-center justify-center">
              <Send size={15} className="[color:var(--pf-primary)]" />
            </div>
            <div className="text-left">
              <p className="text-[13px] font-[700] [color:var(--pf-text)]">Báo nộp quỹ</p>
              <p className="text-[11px] [color:var(--pf-color-muted)]">Đã CK → chờ duyệt</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/member/attendance')}
            className="[background:var(--pf-surface)] rounded-[14px] border border-[color:var(--pf-border)] shadow-sm px-4 py-3 flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-full [background:var(--pf-color-info-soft)] flex items-center justify-center">
              <Calendar size={15} className="[color:var(--pf-color-info)]" />
            </div>
            <div className="text-left">
              <p className="text-[13px] font-[700] [color:var(--pf-text)]">Lịch chơi</p>
              <p className="text-[11px] [color:var(--pf-color-muted)]">{myAttendance}/{totalSessions} buổi</p>
            </div>
          </button>
        </div>

        {/* Phiếu thu card */}
        {hasData && (
          <div className="px-4 pt-3 pb-28">
            <div className="[background:var(--pf-surface)] rounded-[18px] border border-[color:var(--pf-border)] shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[color:var(--pf-border)] flex items-center justify-between">
                <p className="text-[15px] font-[700] [color:var(--pf-text)]">Phiếu Thu Cá Nhân</p>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 [color:var(--pf-primary)] text-[12px] font-[600]"
                >
                  <Download size={14} />
                  PDF
                </button>
              </div>

              <div className="px-4 py-3 space-y-2.5 text-[13px]">
                <div className="flex justify-between">
                  <span className="[color:var(--pf-color-muted)]">Kỳ quỹ</span>
                  <span className="font-[600] [color:var(--pf-text)]">{activePeriod?.name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="[color:var(--pf-color-muted)]">Buổi tham gia</span>
                  <span className="font-[600] [color:var(--pf-text)]">{myAttendance}/{totalSessions} buổi ({attendanceRate}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="[color:var(--pf-color-muted)]">Đã đóng quỹ</span>
                  <span className="font-[600] text-emerald-600">{formatVND(amountPaid)}</span>
                </div>
                {myContribution?.paymentDate && (
                  <div className="flex justify-between">
                    <span className="[color:var(--pf-color-muted)]">Ngày đóng</span>
                    <span className="font-[600] [color:var(--pf-text)]">{formatDate(myContribution.paymentDate)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="[color:var(--pf-color-muted)]">Chi phí ước tính</span>
                  <span className="font-[600] text-rose-500">{formatVND(myCost)}</span>
                </div>
                <div className="border-t border-[color:var(--pf-border)] pt-2.5 flex justify-between items-center">
                  <span className="font-[700] [color:var(--pf-text)]">Số dư</span>
                  <span className={`text-[18px] font-[800] ${balance >= 0 ? '[color:var(--pf-primary)]' : 'text-red-500'}`}>
                    {balance >= 0 ? '+' : ''}{formatVND(balance)}
                  </span>
                </div>
              </div>

              {!isPaid && (
                <div className="mx-4 mb-4 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-500 shrink-0" />
                  <p className="text-[12px] text-amber-700">Bạn chưa đóng quỹ kỳ này. Vui lòng đóng sớm!</p>
                </div>
              )}
            </div>

            {/* Recent sessions */}
            {completedSessions.length > 0 && (
              <div className="mt-3 [background:var(--pf-surface)] rounded-[18px] border border-[color:var(--pf-border)] shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-[color:var(--pf-border)] flex items-center justify-between">
                  <p className="text-[15px] font-[700] [color:var(--pf-text)]">Buổi gần đây</p>
                  <button
                    onClick={() => navigate('/member/attendance')}
                    className="flex items-center gap-0.5 [color:var(--pf-primary)] text-[12px] font-[600]"
                  >
                    Xem tất cả <ChevronRight size={13} />
                  </button>
                </div>
                <div className="divide-y divide-[color:var(--pf-border-soft)]">
                  {completedSessions.slice(-5).reverse().map(s => (
                    <div key={s.id} className="px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-[600] [color:var(--pf-text)]">{s.courtName || 'Sân chơi'}</p>
                        <p className="text-[11px] [color:var(--pf-color-muted)]">{formatDate(s.sessionDate)}</p>
                      </div>
                      {attended.has(s.id) ? (
                        <span className="text-[11px] font-[600] text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">Tham gia</span>
                      ) : (
                        <span className="text-[11px] font-[600] [color:var(--pf-color-muted)] [background:var(--pf-surface-muted)] px-2 py-0.5 rounded-full">Vắng</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <ReportPaymentModal open={reportOpen} onClose={() => setReportOpen(false)} onReported={reload} />
      </div>
    )
  }

  /* ── Desktop layout — cùng design system Admin (read-only, self-scope) ── */
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator
  return (
    <PageShell>
      <PageHeader
        title="Tổng Quan"
        subtitle={
          hasData
            ? `Xin chào, ${memberName} · ${activePeriod?.name ?? ''}`
            : `Xin chào, ${memberName}`
        }
        actions={<ActionButton variant="primary" onClick={() => setReportOpen(true)}><Send size={15} /> Báo đã nộp quỹ</ActionButton>}
      />

      {!hasData ? (
        <ChartCard title="Tổng quan cá nhân">
          <EmptyState
            icon={<Activity size={26} />}
            title="Chưa có kỳ quỹ"
            description="CLB chưa tạo kỳ quỹ nào. Hãy chờ admin khởi tạo kỳ quỹ đầu tiên."
          />
        </ChartCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* CỘT TRÁI (2/3): KPI + tiến độ trực quan */}
          <div className="space-y-4 lg:col-span-2">
            <div className="grid grid-cols-2 gap-4">
              <MetricCard label="Đã Đóng Quỹ" value={formatVND(amountPaid)} sub="Kỳ hiện tại" accent="green" icon={<DollarSign size={18} />} />
              <MetricCard label="Buổi Tham Gia" value={`${myAttendance}/${totalSessions}`} sub="Số buổi có mặt" accent="blue" icon={<Calendar size={18} />} />
              <MetricCard label="Tỷ Lệ Tham Gia" value={`${attendanceRate}%`} sub="So với toàn kỳ" accent={attendanceRate >= 50 ? 'green' : 'amber'} icon={<TrendingUp size={18} />} />
              <MetricCard label="Số Dư" value={formatVND(balance)} sub="Số dư còn lại" accent="blue" negative={balance < 0} icon={<AlertCircle size={18} />} />
            </div>

            {/* Tiến độ trực quan: vòng % tham gia + thanh tiến độ đóng quỹ */}
            <ChartCard title="Tiến độ của bạn" subtitle={activePeriod?.name ?? undefined}>
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
                {/* Vòng tỷ lệ tham gia */}
                <div className="flex shrink-0 flex-col items-center gap-2">
                  <div className="relative h-28 w-28">
                    <div
                      className="h-28 w-28 rounded-full"
                      style={{ background: `conic-gradient(var(--pf-primary) ${Math.min(100, attendanceRate) * 3.6}deg, var(--pf-color-muted-soft) 0deg)` }}
                    />
                    <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full [background:var(--pf-surface)]">
                      <span className="text-[22px] font-extrabold [color:var(--pf-text)]">{attendanceRate}%</span>
                      <span className="text-[10px] [color:var(--pf-color-muted)]">tham gia</span>
                    </div>
                  </div>
                  <span className="text-[12px] [color:var(--pf-color-muted)]">{myAttendance}/{totalSessions} buổi</span>
                </div>

                {/* Đóng quỹ kỳ này — khoản thu mở: hiện SỐ TIỀN THẬT, không mục tiêu/tiến độ % */}
                <div className="w-full min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[13px] font-semibold [color:var(--pf-text)]">Đóng quỹ kỳ này</span>
                    <span className="text-[15px] font-bold [color:var(--pf-primary)]">{formatVND(amountPaid)}</span>
                  </div>
                  <div className="mt-1">
                    <StatusBadge tone={isPaid ? 'success' : 'warning'} dot>
                      {isPaid ? 'Đã xác nhận đóng quỹ kỳ này' : 'Chưa có đóng quỹ xác nhận'}
                    </StatusBadge>
                  </div>
                </div>
              </div>
            </ChartCard>
          </div>

          {/* CỘT PHẢI (1/3): Phiếu thu gọn — KHÔNG lặp KPI, chỉ chi tiết chi phí + số dư */}
          <ChartCard
            title="Phiếu Thu Cá Nhân"
            subtitle={activePeriod?.name ?? undefined}
            actions={
              <div className="flex gap-2">
                <ActionButton variant="secondary" icon={<Download size={15} />} onClick={handleExportPDF}>PDF</ActionButton>
                {canShare && (
                  <ActionButton
                    variant="secondary"
                    icon={<Share2 size={15} />}
                    onClick={() => {
                      navigator
                        .share({ title: 'Phiếu thu quỹ CLB', text: `${memberName} - Đã đóng: ${formatVND(amountPaid)}` })
                        .catch(() => {})
                    }}
                  >
                    Chia sẻ
                  </ActionButton>
                )}
              </div>
            }
          >
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs [color:var(--pf-color-muted)]">Thành viên</p>
                  <p className="truncate font-semibold [color:var(--pf-text)]">{memberName}</p>
                </div>
                <StatusBadge tone={isPaid ? 'success' : 'warning'} dot>
                  {isPaid ? 'Đã đóng quỹ' : 'Chưa đóng quỹ'}
                </StatusBadge>
              </div>

              {/* Chỉ chi tiết chưa có ở KPI: bóc tách chi phí */}
              <div className="space-y-2 border-t pt-3 [border-color:var(--pf-border)]">
                <div className="flex justify-between">
                  <span className="[color:var(--pf-color-muted)]">Chi phí sân</span>
                  <span className="font-medium [color:var(--pf-text)]">{formatVND(roughCourtCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="[color:var(--pf-color-muted)]">Chi phí sinh hoạt</span>
                  <span className="font-medium [color:var(--pf-text)]">{formatVND(roughLivingCost)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 [border-color:var(--pf-border)]">
                  <span className="[color:var(--pf-color-muted)]">Tổng chi phí ước tính</span>
                  <span className="font-semibold [color:var(--pf-color-danger)]">{formatVND(myCost)}</span>
                </div>
              </div>

              <div className="rounded-xl px-4 py-3 [background:var(--pf-color-success-soft)]">
                <div className="flex items-center justify-between">
                  <span className="font-bold [color:var(--pf-text)]">Số Dư Còn Lại</span>
                  <span className="text-xl font-bold" style={{ color: balance >= 0 ? 'var(--pf-color-success)' : 'var(--pf-color-danger)' }}>
                    {balance >= 0 ? '+' : ''}{formatVND(balance)}
                  </span>
                </div>
                <p className="mt-1 text-xs" style={{ color: balance >= 0 ? 'var(--pf-color-success)' : 'var(--pf-color-danger)' }}>
                  {balance >= 0 ? '✓ Bạn đã đóng đủ quỹ kỳ này' : 'Bạn chưa đóng đủ quỹ kỳ này.'}
                </p>
              </div>
            </div>
          </ChartCard>
        </div>
      )}
      <ReportPaymentModal open={reportOpen} onClose={() => setReportOpen(false)} onReported={reload} />
    </PageShell>
  )
}
