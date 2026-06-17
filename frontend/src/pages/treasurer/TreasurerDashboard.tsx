import { DollarSign, CreditCard, Building2, FileText, AlertTriangle, Clock } from 'lucide-react'
import { KpiCard } from '../../components/ui/KpiCard'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatVND } from '../../lib/utils'
import toast from 'react-hot-toast'

export function TreasurerDashboard() {
  const { user } = useAuthStore()
  const { getClubData } = useClubDataStore()
  const clubData = getClubData(user?.clubId ?? '')

  const totalIncome = clubData.contributions.filter(c => c.isConfirmed).reduce((a, c) => a + c.amount, 0)
  const totalExpenses = clubData.expenses.reduce((a, e) => a + e.amount, 0)
  const balance = totalIncome - totalExpenses
  const s = { totalIncome, totalExpenses, balance }
  const unpaid = clubData.contributions.filter(c => !c.isConfirmed)
  const noReceipt = clubData.expenses.filter(e => !e.receiptUrl)

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Thủ Quỹ Dashboard" subtitle="Kỳ Q2/2026 · CLB Pickleball Hà Nội" />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard title="Tổng Đã Thu" value={s.totalIncome} isCurrency icon={<DollarSign size={18} />} color="green" />
          <KpiCard title="Tổng Đã Chi" value={s.totalExpenses} isCurrency icon={<CreditCard size={18} />} color="orange" />
          <KpiCard title="Số Dư Quỹ" value={s.balance} isCurrency icon={<Building2 size={18} />} color="blue" />
          <KpiCard title="Khoản Chi Kỳ" value={`${clubData.expenses.length} khoản`} icon={<FileText size={18} />} color="purple" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <KpiCard title="Chưa Đóng Quỹ" value={`${unpaid.length} người`} icon={<AlertTriangle size={18} />} color="orange" alert={unpaid.length > 0} badge={unpaid.length > 0 ? `${unpaid.length}` : undefined} />
          <KpiCard title="Chi Thiếu Hóa Đơn" value={`${noReceipt.length} khoản`} icon={<FileText size={18} />} color="yellow" alert={noReceipt.length > 0} />
          <KpiCard title="Chờ Xác Nhận" value="1 khoản" icon={<Clock size={18} />} color="gray" />
        </div>

        {/* Action items */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Các Khoản Cần Xử Lý</h3>
          <div className="space-y-2">
            {unpaid.map(c => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-100 px-4 py-3">
                <span className="text-red-500">🔴</span>
                <span className="text-sm text-red-800 flex-1"><strong>{c.member?.fullName}</strong> chưa đóng quỹ kỳ Q2/2026</span>
                <Button size="sm" variant="outline" onClick={() => toast.success(`Đã gửi nhắc ${c.member?.fullName}`)}>
                  Gửi nhắc
                </Button>
              </div>
            ))}
            {noReceipt.map(e => (
              <div key={e.id} className="flex items-center gap-3 rounded-lg bg-yellow-50 border border-yellow-100 px-4 py-3">
                <span className="text-yellow-500">🟡</span>
                <span className="text-sm text-yellow-800 flex-1">Khoản chi <strong>{e.description}</strong> ({formatVND(e.amount)}) chưa có hóa đơn</span>
                <Button size="sm" variant="outline" onClick={() => toast.success('Đã đính kèm hóa đơn!')}>Đính kèm</Button>
              </div>
            ))}
          </div>
        </div>

        {/* Sổ quỹ gần đây */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Sổ Quỹ Gần Đây</h3>
            <Button variant="outline" size="sm" onClick={() => toast.success('Xuất sổ quỹ Excel!')}>Xuất Sổ</Button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Ngày</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Loại</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Mô tả</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Số tiền</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Số dư</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clubData.contributions.length === 0 && clubData.expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Chưa có giao dịch nào</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
