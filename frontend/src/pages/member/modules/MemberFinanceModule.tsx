/**
 * MemberFinanceModule — module "Tài chính" cho MEMBER_VIEW (CHỈ XEM toàn CLB). Tái dùng màn
 * tài chính đã có; nút thao tác tự ẩn theo isMember, backend chặn ghi. Tự embedded.
 */
import { ArrowDownCircle, ArrowUpCircle, BarChart3, CalendarRange } from 'lucide-react'
import { ModuleTabs } from '../../../components/shared'
import { FundPeriods } from '../../admin/FundPeriods'
import { Contributions } from '../../admin/Contributions'
import { Expenses } from '../../admin/Expenses'
import { Reports } from '../../admin/Reports'

export function MemberFinanceModule() {
  return (
    <ModuleTabs
      title="Tài chính"
      tabs={[
        { key: 'periods', icon: CalendarRange, menuLabel: 'Kỳ quỹ', label: 'Kỳ Quỹ', element: <FundPeriods /> },
        { key: 'income', icon: ArrowDownCircle, menuLabel: 'Thu quỹ', label: 'Thu', element: <Contributions /> },
        { key: 'expense', icon: ArrowUpCircle, menuLabel: 'Chi phí', label: 'Chi', element: <Expenses /> },
        { key: 'reports', icon: BarChart3, label: 'Báo cáo', element: <Reports /> },
      ]}
    />
  )
}
