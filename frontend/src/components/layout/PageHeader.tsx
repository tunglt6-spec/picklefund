import type { ReactNode } from 'react'
import { useEmbedded } from '../shared/ModuleTabs'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const embedded = useEmbedded()

  // Trong module (embedded): bỏ h1 trùng, GIỮ phụ đề (thông tin) + actions trong thanh bar.
  if (embedded) {
    if (!subtitle && !actions) return null
    return (
      <div className="bg-white border-b border-slate-100 px-6 py-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        {subtitle ? <p className="text-xs text-slate-500 min-w-0 truncate">{subtitle}</p> : <span />}
        {actions && <div className="flex items-center gap-2 flex-wrap lg:justify-end">{actions}</div>}
      </div>
    )
  }

  return (
    <div className="bg-white border-b border-slate-100 px-6 py-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-base font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap lg:justify-end">{actions}</div>}
    </div>
  )
}
