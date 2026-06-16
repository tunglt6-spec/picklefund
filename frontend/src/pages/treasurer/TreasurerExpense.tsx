import { useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import type { AllocationRule } from '../../types'
import { formatVND } from '../../lib/utils'
import toast from 'react-hot-toast'

const ruleNames: Record<AllocationRule, string> = {
  ATTENDANCE: 'Theo lượt tham gia',
  EQUAL: 'Chia đều',
  PRESENT_ONLY: 'Người có mặt',
  FUND_ONLY: 'Quỹ chung',
}

const ruleDescriptions: Record<AllocationRule, string> = {
  ATTENDANCE: 'Phân bổ theo số buổi tham gia thực tế',
  EQUAL: 'Chia đều cho tất cả thành viên',
  PRESENT_ONLY: 'Chỉ tính người có mặt buổi đó',
  FUND_ONLY: 'Chi quỹ chung, không phân bổ cá nhân',
}

export function TreasurerExpense() {
  const [form, setForm] = useState({ description: '', amount: '', allocationRule: 'ATTENDANCE' as AllocationRule, expenseDate: new Date().toISOString().slice(0, 10), hasReceipt: false })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success(`Đã nhập khoản chi ${form.description} — ${formatVND(Number(form.amount))}`)
    setForm({ description: '', amount: '', allocationRule: 'ATTENDANCE', expenseDate: new Date().toISOString().slice(0, 10), hasReceipt: false })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Nhập Khoản Chi" subtitle="Ghi nhận chi phí và đính kèm hóa đơn" />
      <div className="p-6 max-w-lg">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mô tả khoản chi *</label>
              <input required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="VD: Tiền sân buổi 5, Nước uống, Giải thưởng..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Số tiền (VNĐ) *</label>
                <input required type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  placeholder="VD: 450000"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày chi</label>
                <input type="date" value={form.expenseDate} onChange={e => setForm({ ...form, expenseDate: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quy tắc phân bổ *</label>
              <div className="space-y-2">
                {(Object.entries(ruleDescriptions) as [AllocationRule, string][]).map(([rule, desc]) => (
                  <label key={rule} className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${form.allocationRule === rule ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="rule" value={rule} checked={form.allocationRule === rule} onChange={() => setForm({ ...form, allocationRule: rule })} className="mt-0.5 accent-indigo-600" />
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{ruleNames[rule]}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Hóa đơn đính kèm</label>
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 px-4 py-3 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                onClick={() => { setForm({ ...form, hasReceipt: true }); toast.success('Đã đính kèm hóa đơn!') }}>
                <span className="text-2xl">📷</span>
                <div>
                  <p className="text-sm font-medium text-gray-700">{form.hasReceipt ? '✓ Đã đính kèm' : 'Chụp hoặc tải lên hóa đơn'}</p>
                  <p className="text-xs text-gray-400">JPG, PNG, PDF · Tối đa 10MB</p>
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full justify-center">Nhập khoản chi</Button>
          </form>
        </div>
      </div>
    </div>
  )
}
