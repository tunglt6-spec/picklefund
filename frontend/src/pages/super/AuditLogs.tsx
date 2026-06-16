import { useState } from 'react'
import { Search, ScrollText } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Badge } from '../../components/ui/Badge'

const LOGS = [
  { id: 1, time: '2026-06-16 09:14', user: 'admin@pbhn.vn', action: 'UPDATE', resource: 'contribution', detail: 'Xác nhận đóng quỹ của Hoàng Ngọc B', club: 'CLB HN' },
  { id: 2, time: '2026-06-16 08:55', user: 'admin@pbhn.vn', action: 'CREATE', resource: 'contribution', detail: 'Ghi nhận Hoàng Ngọc B đóng 1.000.000đ', club: 'CLB HN' },
  { id: 3, time: '2026-06-15 16:30', user: 'treasurer@pbhn.vn', action: 'CREATE', resource: 'expense', detail: 'Nhập khoản chi Tiền sân buổi 9 – 450.000đ', club: 'CLB HN' },
  { id: 4, time: '2026-06-15 14:32', user: 'admin@pbhn.vn', action: 'CREATE', resource: 'fund_period', detail: 'Tạo kỳ quỹ Quý 2/2026', club: 'CLB HN' },
  { id: 5, time: '2026-06-15 13:15', user: 'treasurer@pbhcm.vn', action: 'UPDATE', resource: 'expense', detail: 'Cập nhật khoản chi Tiền sân 450k → 480k', club: 'CLB HCM' },
  { id: 6, time: '2026-06-15 11:40', user: 'superadmin', action: 'UPDATE', resource: 'club', detail: 'Khóa CLB Đà Nẵng – lý do: vi phạm điều khoản', club: 'System' },
  { id: 7, time: '2026-06-15 10:05', user: 'member@pbhn.vn', action: 'EXPORT', resource: 'receipt', detail: 'Tải Phiếu Thu Quỹ cá nhân Q2/2026', club: 'CLB HN' },
  { id: 8, time: '2026-06-14 16:30', user: 'admin@pbhn.vn', action: 'CREATE', resource: 'member', detail: 'Thêm thành viên mới: Hoàng Ngọc B', club: 'CLB HN' },
  { id: 9, time: '2026-06-14 12:00', user: 'admin@pbhcm.vn', action: 'DELETE', resource: 'session', detail: 'Xóa buổi tập ngày 10/06 – lý do: hủy sân', club: 'CLB HCM' },
  { id: 10, time: '2026-06-14 09:00', user: 'treasurer@pbhn.vn', action: 'CREATE', resource: 'contribution', detail: 'Ghi nhận Nguyễn Văn A đóng quỹ 1.000.000đ', club: 'CLB HN' },
  { id: 11, time: '2026-06-13 17:20', user: 'superadmin', action: 'CREATE', resource: 'club', detail: 'Tạo CLB mới: CLB Pickleball Đà Lạt', club: 'System' },
  { id: 12, time: '2026-06-13 14:00', user: 'admin@pbdn.vn', action: 'UPDATE', resource: 'fund_period', detail: 'Chốt kỳ quỹ Quý 1/2026', club: 'CLB ĐN' },
  { id: 13, time: '2026-06-12 10:30', user: 'member@pbhcm.vn', action: 'EXPORT', resource: 'receipt', detail: 'Tải Phiếu Thu Q1/2026', club: 'CLB HCM' },
  { id: 14, time: '2026-06-11 08:45', user: 'treasurer@pbhn.vn', action: 'DELETE', resource: 'expense', detail: 'Xóa khoản chi nhập nhầm – 200.000đ', club: 'CLB HN' },
  { id: 15, time: '2026-06-10 15:00', user: 'admin@pbhn.vn', action: 'CREATE', resource: 'session', detail: 'Tạo buổi tập ngày 12/06 – Sân Mỹ Đình', club: 'CLB HN' },
]

const ACTION_COLORS: Record<string, 'green' | 'blue' | 'red' | 'purple' | 'orange'> = {
  CREATE: 'green', UPDATE: 'blue', DELETE: 'red', EXPORT: 'purple', LOCK: 'orange',
}
const ACTION_OPTIONS = ['Tất cả', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'LOCK']

export function AuditLogs() {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('Tất cả')

  const filtered = LOGS.filter(l => {
    if (action !== 'Tất cả' && l.action !== action) return false
    if (search && !l.user.toLowerCase().includes(search.toLowerCase())
      && !l.detail.toLowerCase().includes(search.toLowerCase())
      && !l.club.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Audit Logs"
        subtitle={`${LOGS.length} thao tác · Lịch sử hoạt động toàn hệ thống`}
      />

      <div className="p-6 max-w-[1100px] mx-auto space-y-5">
        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo người dùng, mô tả, CLB..."
              className="input-base pl-9"
            />
          </div>
          <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-1 flex-wrap">
            {ACTION_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setAction(opt)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  action === opt ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
          <table className="table-base">
            <thead>
              <tr>
                <th className="w-36">Thời gian</th>
                <th>Người dùng</th>
                <th className="text-center w-20">Action</th>
                <th>Chi tiết</th>
                <th className="w-28">CLB</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <tr key={log.id}>
                  <td className="text-slate-400 text-xs font-mono">{log.time}</td>
                  <td className="text-slate-700 text-xs">{log.user}</td>
                  <td className="text-center">
                    <Badge variant={ACTION_COLORS[log.action] ?? 'gray'}>{log.action}</Badge>
                  </td>
                  <td className="text-slate-800 text-xs">{log.detail}</td>
                  <td className="text-slate-500 text-xs">{log.club}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <ScrollText size={28} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-sm text-slate-400">Không có log phù hợp</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
            Hiển thị {filtered.length} / {LOGS.length} bản ghi
          </div>
        </div>
      </div>
    </div>
  )
}
