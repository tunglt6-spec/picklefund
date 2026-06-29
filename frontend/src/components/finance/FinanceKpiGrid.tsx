import type { ReactNode } from 'react'

interface FinanceKpiGridProps {
  children: ReactNode
  cols?: 2 | 3 | 4
}

export function FinanceKpiGrid({ children, cols = 2 }: FinanceKpiGridProps) {
  const colClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  }[cols]
  return (
    <div className={`grid ${colClass} gap-4`}>
      {children}
    </div>
  )
}
