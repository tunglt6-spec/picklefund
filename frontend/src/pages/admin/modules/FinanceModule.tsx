/**
 * FinanceModule — module "Tài chính" (gom Kỳ Quỹ/Thu/Chi/Công nợ/Báo cáo thành
 * tab con). Chỉ tái dùng page ĐÃ CÓ, không đổi nghiệp vụ.
 */
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
        { key: 'periods', label: 'Kỳ Quỹ', group: 'Thu – chi', element: <FundPeriods /> },
        { key: 'income', label: 'Thu', group: 'Thu – chi', element: <Contributions /> },
        { key: 'expense', label: 'Chi', group: 'Thu – chi', element: <Expenses /> },
        { key: 'debts', label: 'Công nợ', group: 'Theo dõi', element: <Debts /> },
        { key: 'reports', label: 'Báo cáo', group: 'Theo dõi', element: <Reports /> },
        { key: 'payments', label: 'Xác nhận nộp quỹ', group: 'Theo dõi', element: <PaymentApprovals /> },
      ]}
    />
  )
}
