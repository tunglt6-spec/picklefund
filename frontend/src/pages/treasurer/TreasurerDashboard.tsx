import { DollarSign, CreditCard, Building2, FileText, AlertTriangle, Clock } from 'lucide-react'
import { KpiCard } from '../../components/ui/KpiCard'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { mockFundSummary, mockContributions, mockExpenses } from '../../lib/mockData'
import { formatVND } from '../../lib/utils'
import toast from 'react-hot-toast'

const ledger = [
  { date: '01/04', type: 'Thu', desc: 'Nguyễn A đóng quỹ Q2', amount: 1000000, balance: 1000000 },
  { date: '01/04', type: 'Thu', desc: 'Trần B đóng quỹ Q2', amount: 1000000, balance: 2000000 },
  { date: '01/04', type: 'Thu', desc: 'Lê C đóng quỹ Q2', amount: 1000000, balance: 3000000 },
  { date: '01/04', type: 'Thu', desc: 'Phạm D đóng quỹ Q2', amount: 1000000, balance: 4000000 },
  { date: '01/04', type: 'Thu', desc: 'Hoàng E đóng quỹ Q2', amount: 1000000, balance: 5000000 },
  { date: '05/04', type: 'Chi', desc: 'Tiền sân buổi 1', amount: -450000, balance: 4550000 },
  { date: '05/04', type: 'Chi', desc: 'Nước uống buổi 1', amount: -150000, balance: 4400000 },
  { date: '12/04', type: 'Chi', desc: 'Tiền sân buổi 2', amount: -450000, balance: 3950000 },
]

export function TreasurerDashboard() {
  const s = mockFundSummary
  const unpaid = mockContributions.filter(c => !c.isConfirmed)
  const noReceipt = mockExpenses.filter(e => !e.receiptUrl)

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Thủ Quỹ Dashboard" subtitle="Kỳ Q2/2026 · CLB Pickleball Hà Nội" />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard title="Tổng Đã Thu" value={s.totalIncome} isCurrency icon={<DollarSign size={18} />} color="green" />
          <KpiCard title="Tổng Đã Chi" value={s.totalExpenses} isCurrency icon={<CreditCard size={18} />} color="orange" />
          <KpiCard title="Số Dư Quỹ" value={s.balance} isCurrency icon={<Building2 size={18} />} color="blue" />
          <KpiCard title="Khoản Chi Kỳ" value={`${mockExpenses.length} khoản`} icon={<FileText size={18} />} color="purple" />
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
              {ledger.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{row.date}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${row.type === 'Thu' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{row.desc}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${row.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {row.amount > 0 ? '+' : ''}{formatVND(row.amount)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">{formatVND(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
