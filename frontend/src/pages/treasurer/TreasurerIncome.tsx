import { useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatVND } from '../../lib/utils'
import toast from 'react-hot-toast'

export function TreasurerIncome() {
  const { user } = useAuthStore()
  const { getClubData } = useClubDataStore()
  const members = getClubData(user?.clubId ?? '').members

  const [form, setForm] = useState({ memberId: '', amount: 1000000, paymentDate: new Date().toISOString().slice(0, 10), paymentMethod: 'bank_transfer', notes: '' })
  const [submitted, setSubmitted] = useState<typeof form[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const m = members.find(m => m.id === form.memberId)
    setSubmitted(prev => [...prev, form])
    toast.success(`Ghi nhận ${m?.fullName} đóng ${formatVND(form.amount)}`)
    setForm({ ...form, memberId: '', notes: '' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Nhập Khoản Thu" subtitle="Ghi nhận đóng quỹ của thành viên" />
      <div className="p-6 max-w-lg">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Thành viên *</label>
              <select required value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white">
                <option value="">-- Chọn thành viên --</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Số tiền (VNĐ) *</label>
              <input required type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày đóng</label>
                <input type="date" value={form.paymentDate} onChange={e => setForm({ ...form, paymentDate: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Hình thức</label>
                <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white">
                  <option value="bank_transfer">Chuyển khoản</option>
                  <option value="cash">Tiền mặt</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ghi chú</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white" />
            </div>
            <Button type="submit" className="w-full justify-center">Ghi nhận khoản thu</Button>
          </form>
        </div>

        {submitted.length > 0 && (
          <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="font-semibold text-gray-900 mb-3">Vừa ghi nhận:</p>
            <div className="space-y-2">
              {submitted.slice(-3).map((s, i) => {
                const m = members.find(m => m.id === s.memberId)
                return (
                  <div key={i} className="flex justify-between text-sm bg-green-50 rounded-lg px-3 py-2">
                    <span className="text-green-800">{m?.fullName}</span>
                    <span className="font-semibold text-green-700">{formatVND(s.amount)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
