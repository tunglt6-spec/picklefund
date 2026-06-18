import { Lock, LogIn, CheckCircle, AlertTriangle } from 'lucide-react'

interface MobileSystemHealthCardProps {
  suspendedClubs: number
  loginsLast24h: number
  activeClubs: number
}

export function MobileSystemHealthCard({ suspendedClubs, loginsLast24h, activeClubs }: MobileSystemHealthCardProps) {
  const rows = [
    {
      icon: <Lock size={15} />,
      label: 'CLB bị khóa',
      value: suspendedClubs,
      status: suspendedClubs === 0 ? 'ok' : 'warn',
    },
    {
      icon: <LogIn size={15} />,
      label: 'Đăng nhập 24h',
      value: loginsLast24h,
      status: 'info',
    },
    {
      icon: <CheckCircle size={15} />,
      label: 'CLB hoạt động',
      value: activeClubs,
      status: 'ok',
    },
  ]

  return (
    <div className="bg-white rounded-[18px] border border-slate-100 p-4 shadow-sm">
      <h3 className="text-[14px] font-[700] text-slate-800 mb-3">Tình trạng hệ thống</h3>
      <div className="space-y-2.5">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <span className={
                row.status === 'warn' ? 'text-amber-500' :
                row.status === 'ok' ? 'text-emerald-500' : 'text-indigo-500'
              }>
                {row.status === 'warn' ? <AlertTriangle size={15} /> : row.icon}
              </span>
              <span className="text-[13px] font-medium">{row.label}</span>
            </div>
            <span className={`text-[13px] font-[700] tabular-nums px-2.5 py-0.5 rounded-full ${
              row.status === 'warn' && row.value > 0
                ? 'bg-amber-50 text-amber-600'
                : row.status === 'ok'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-indigo-50 text-indigo-700'
            }`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
