/**
 * FinanceModule — module "Tài chính" (gom Kỳ Quỹ/Thu/Chi/Công nợ/Báo cáo thành
 * tab con). Chỉ tái dùng page ĐÃ CÓ, không đổi nghiệp vụ.
 */
import { ArrowDownCircle, ArrowUpCircle, BadgeCheck, BarChart3, CalendarRange, HandCoins } from 'lucide-react'
import { ModuleTabs } from '../../../components/shared'
import { FundPeriods } from '../FundPeriods'
import { Contributions } from '../Contributions'
import { Expenses } from '../Expenses'
import { Debts } from '../Debts'
import { Reports } from '../Reports'
import { PaymentApprovals } from '../PaymentApprovals'

export function FinanceModule() {
  return (
    <ModuleTabs
      title="Tài chính"
      tabs={[
        { key: 'periods', icon: CalendarRange, menuLabel: 'Kỳ quỹ', label: 'Kỳ Quỹ', element: <FundPeriods /> },
        { key: 'income', icon: ArrowDownCircle, menuLabel: 'Thu quỹ', label: 'Thu', element: <Contributions /> },
        { key: 'expense', icon: ArrowUpCircle, menuLabel: 'Chi phí', label: 'Chi', element: <Expenses /> },
        { key: 'debts', icon: HandCoins, label: 'Công nợ', element: <Debts /> },
        { key: 'reports', icon: BarChart3, label: 'Báo cáo', element: <Reports /> },
        { key: 'payments', icon: BadgeCheck, label: 'Xác nhận nộp quỹ', element: <PaymentApprovals /> },
      ]}
    />
  )
}
