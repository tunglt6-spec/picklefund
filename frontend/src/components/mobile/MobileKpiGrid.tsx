import { Building2, Activity, Users, Calendar } from 'lucide-react'
import { MobileKpiCard } from './MobileKpiCard'

interface MobileKpiGridProps {
  totalClubs: number
  activeClubs: number
  totalMembers: number
  totalFundPeriods: number
}

export function MobileKpiGrid({ totalClubs, activeClubs, totalMembers, totalFundPeriods }: MobileKpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <MobileKpiCard label="Tổng CLB"       value={totalClubs}       icon={<Building2 size={18} />} accent="#4F46E5" />
      <MobileKpiCard label="CLB hoạt động"  value={activeClubs}      icon={<Activity  size={18} />} accent="#06B6D4" />
      <MobileKpiCard label="Thành viên"     value={totalMembers}     icon={<Users     size={18} />} accent="#8B5CF6" />
      <MobileKpiCard label="Kỳ quỹ"         value={totalFundPeriods} icon={<Calendar  size={18} />} accent="#22C55E" />
    </div>
  )
}
