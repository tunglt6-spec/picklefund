import { DollarSign, Calendar, TrendingUp, AlertCircle, Download, CheckCircle2, XCircle, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { KpiCard } from '../../components/ui/KpiCard'
import { Button } from '../../components/ui/Button'
import { useAuthStore } from '../../store/authStore'
import { useClubDataStore } from '../../store/clubDataStore'
import { formatVND, formatDate } from '../../lib/utils'
import { useIsMobile } from '../../hooks/useIsMobile'
import { exportReceiptPDF } from '../../lib/export'
import toast from 'react-hot-toast'

export function MemberDashboard() {
  const { user } = useAuthStore()
  const { getClubData } = useClubDataStore()
  const clubData = getClubData(user?.clubId ?? '')
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  const activePeriod = clubData.fundPeriods.find(p => p.status === 'active')
  const myContribs = clubData.contributions.filter(
    c => c.memberId === user?.memberId && (!activePeriod || c.fundPeriodId === activePeriod.id)
  )
  const myContribution = myContribs[0]
  const attended = new Set(clubData.myAttendedSessionIds ?? [])
  const completedSessions = clubData.sessions.filter(
    s => s.status === 'completed' && (!activePeriod || s.fundPeriodId === activePeriod.id)
  )
  const totalSessions = completedSessions.length
  const myAttendance = completedSessions.filter(s => attended.has(s.id)).length
  const attendanceRate = totalSessions > 0 ? Math.round((myAttendance / totalSessions) * 100) : 0

  const amountPaid = myContribution?.isConfirmed ? (myContribution.amount ?? 0) : 0
  const totalExpenses = clubData.expenses
    .filter(e => !activePeriod || e.fundPeriodId === activePeriod.id)
    .reduce((a, e) => a + e.amount, 0)
  const memberCount = clubData.members.length || 1
  const myCost =
    totalSessions > 0 && memberCount > 0
      ? Math.round((myAttendance / totalSessions) * (totalExpenses / memberCount))
      : 0
  const balance = amountPaid - myCost

  const memberName = clubData.members.find(m => m.id === user?.memberId)?.fullName ?? user?.username ?? 'Thành viên'
  const initials = memberName.split(' ').slice(-2).map((w: string) => w[0]).join('').toUpperCase()
  const hasData = clubData.fundPeriods.length > 0
  const isPaid = !!myContribution?.isConfirmed

  function handleExportPDF() {
    exportReceiptPDF({
      receiptNo: 1,
      memberName,
      loginName: user?.username ?? '',
      periodName: activePeriod?.name ?? clubData.fundPeriods[0]?.name ?? '',
      periodStartDate: activePeriod?.startDate ?? clubData.fundPeriods[0]?.startDate ?? '',
      periodEndDate: activePeriod?.endDate ?? clubData.fundPeriods[0]?.endDate ?? '',
      contributionAmount: activePeriod?.contributionAmount ?? 0,
      clubName: '',
      clubLocation: '',
      amountPaid,
      paymentDate: myContribution?.paymentDate ?? '',
      attendedSessions: myAttendance,
      totalSessions,
      totalCourtFee: 0,
      memberCountForSplit: memberCount,
      courtCost: 0,
      totalOtherFee: totalExpenses,
      livingCost: myCost,
      totalCost: myCost,
      balance,
      isConfirmed: myContribution?.isConfirmed ?? false,
    })
    toast.success('Đã xuất Phiếu Thu PDF!')
  }

  /* ── Mobile layout ── */
  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Hero header */}
        <div
          className="px-5 pt-5 pb-6"
          style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-white text-[15px] font-[800]">
              {initials}
            </div>
            <div>
              <p className="text-indigo-200 text-[12px]">Xin chào 👋</p>
              <p className="text-white text-[17px] font-[700]">{memberName}</p>
            </div>
          </div>

          {hasData ? (
            <div className="bg-white/15 rounded-2xl px-4 py-3">
              <p className="text-indigo-200 text-[11px] font-[600] uppercase tracking-wide mb-2">
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
              <p className="text-indigo-200 text-[13px]">CLB chưa tạo kỳ quỹ nào</p>
            </div>
          )}
        </div>

        {/* KPI strip */}
        {hasData && (
          <div className="px-4 pt-4 grid grid-cols-3 gap-2">
            {[
              { label: 'Đã đóng', value: formatVND(amountPaid), color: 'text-indigo-600' },
              { label: 'Chi phí TT', value: formatVND(myCost), color: 'text-rose-500' },
              { label: 'Tỷ lệ TG', value: `${attendanceRate}%`, color: attendanceRate >= 60 ? 'text-emerald-600' : 'text-amber-500' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-[14px] border border-slate-100 shadow-sm px-3 py-3 text-center">
                <p className={`text-[16px] font-[800] ${k.color} tabular-nums`}>{k.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="px-4 pt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate('/member/contributions')}
            className="bg-white rounded-[14px] border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <DollarSign size={15} className="text-indigo-600" />
            </div>
            <div className="text-left">
              <p className="text-[13px] font-[700] text-slate-800">Đóng quỹ</p>
              <p className="text-[11px] text-slate-400">Xem & đóng</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/member/attendance')}
            className="bg-white rounded-[14px] border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center">
              <Calendar size={15} className="text-cyan-600" />
            </div>
            <div className="text-left">
              <p className="text-[13px] font-[700] text-slate-800">Lịch chơi</p>
              <p className="text-[11px] text-slate-400">{myAttendance}/{totalSessions} buổi</p>
            </div>
          </button>
        </div>

        {/* Phiếu thu card */}
        {hasData && (
          <div className="px-4 pt-3 pb-28">
            <div className="bg-white rounded-[18px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                <p className="text-[15px] font-[700] text-slate-900">Phiếu Thu Cá Nhân</p>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 text-indigo-600 text-[12px] font-[600]"
                >
                  <Download size={14} />
                  PDF
                </button>
              </div>

              <div className="px-4 py-3 space-y-2.5 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Kỳ quỹ</span>
                  <span className="font-[600] text-slate-800">{activePeriod?.name ?? clubData.fundPeriods[0]?.name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Buổi tham gia</span>
                  <span className="font-[600] text-slate-800">{myAttendance}/{totalSessions} buổi ({attendanceRate}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Đã đóng quỹ</span>
                  <span className="font-[600] text-emerald-600">{formatVND(amountPaid)}</span>
                </div>
                {myContribution?.paymentDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ngày đóng</span>
                    <span className="font-[600] text-slate-800">{formatDate(myContribution.paymentDate)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Chi phí ước tính</span>
                  <span className="font-[600] text-rose-500">{formatVND(myCost)}</span>
                </div>
                <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center">
                  <span className="font-[700] text-slate-900">Số dư</span>
                  <span className={`text-[18px] font-[800] ${balance >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
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
              <div className="mt-3 bg-white rounded-[18px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                  <p className="text-[15px] font-[700] text-slate-900">Buổi gần đây</p>
                  <button
                    onClick={() => navigate('/member/attendance')}
                    className="flex items-center gap-0.5 text-indigo-500 text-[12px] font-[600]"
                  >
                    Xem tất cả <ChevronRight size={13} />
                  </button>
                </div>
                <div className="divide-y divide-slate-50">
                  {completedSessions.slice(-5).reverse().map(s => (
                    <div key={s.id} className="px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-[600] text-slate-800">{s.courtName || 'Sân chơi'}</p>
                        <p className="text-[11px] text-slate-400">{formatDate(s.sessionDate)}</p>
                      </div>
                      {attended.has(s.id) ? (
                        <span className="text-[11px] font-[600] text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">Tham gia</span>
                      ) : (
                        <span className="text-[11px] font-[600] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">Vắng</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  /* ── Desktop layout ── */
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-6 md:px-6 md:py-8 text-white">
        <p className="text-indigo-200 text-sm">Chào mừng trở lại 👋</p>
        <h2 className="text-xl md:text-2xl font-bold mt-1">{memberName}</h2>
        {hasData ? (
          <>
            <p className="text-indigo-200 text-xs md:text-sm mt-1">{activePeriod?.name ?? 'Kỳ gần nhất'}</p>
            <div className="mt-4 flex gap-6">
              <div>
                <p className="text-indigo-200 text-xs">Số dư hiện tại</p>
                <p className="text-xl md:text-2xl font-bold">{balance >= 0 ? '+' : ''}{formatVND(balance)}</p>
              </div>
              <div>
                <p className="text-indigo-200 text-xs">Tham gia</p>
                <p className="text-xl md:text-2xl font-bold">{myAttendance}/{totalSessions} buổi</p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-indigo-200 text-xs md:text-sm mt-1">Chưa có kỳ quỹ nào</p>
        )}
      </div>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {!hasData ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <p className="text-gray-400 text-sm">CLB chưa tạo kỳ quỹ nào.<br />Hãy chờ admin khởi tạo kỳ quỹ đầu tiên.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard title="Đã Đóng Quỹ" value={amountPaid} isCurrency icon={<DollarSign size={18} />} color="green" />
              <KpiCard title="Buổi Tham Gia" value={`${myAttendance}/${totalSessions}`} icon={<Calendar size={18} />} color="blue" />
              <KpiCard title="Tỷ Lệ" value={`${attendanceRate}%`} icon={<TrendingUp size={18} />} color={attendanceRate >= 50 ? 'green' : 'yellow'} />
              <KpiCard title="Số Dư" value={balance} isCurrency icon={<AlertCircle size={18} />} color={balance >= 0 ? 'blue' : 'red'} />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-base md:text-lg">Phiếu Thu Cá Nhân</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportPDF}>📥 PDF</Button>
                  <Button variant="outline" size="sm" onClick={() => toast.success('Đã chia sẻ qua Zalo!')}>📤 Zalo</Button>
                </div>
              </div>

              <div className="px-4 py-4 md:px-6 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-500 text-xs">Thành viên</p>
                    <p className="font-semibold text-gray-900">{memberName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Kỳ quỹ</p>
                    <p className="font-semibold text-gray-900">{activePeriod?.name ?? clubData.fundPeriods[0]?.name ?? '—'}</p>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-gray-600">Số buổi toàn kỳ</span>
                    <span className="font-medium">{totalSessions} buổi</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-gray-600">Đã tham gia</span>
                    <span className="font-medium text-green-600">{myAttendance} buổi</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-gray-600">Tỷ lệ tham gia</span>
                    <span className="font-medium">{attendanceRate}%</span>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-gray-600">Số tiền đã đóng</span>
                    <span className="font-medium text-green-600">{formatVND(amountPaid)}</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-gray-600">Chi phí ước tính</span>
                    <span className="font-medium text-orange-600">{formatVND(myCost)}</span>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-sm">Số Dư Còn Lại</span>
                    <span className={`text-xl md:text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {balance >= 0 ? '+' : ''}{formatVND(balance)}
                    </span>
                  </div>
                  {balance > 0 && (
                    <p className="text-xs text-green-600 mt-1">✓ Bạn đã đóng đủ quỹ kỳ này</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
