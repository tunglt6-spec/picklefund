/**
 * FinanceModule — module "Tài chính" (gom Kỳ Quỹ/Thu/Chi/Công nợ/Báo cáo thành
 * tab con). Chỉ tái dùng page ĐÃ CÓ, không đổi nghiệp vụ.
 */
import { nav } from '../../../components/mobile/navCatalog'
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
        { key: 'periods', ...nav('fin.periods'), label: 'Kỳ Quỹ', element: <FundPeriods /> },
        { key: 'income', ...nav('fin.income'), label: 'Thu', element: <Contributions /> },
        { key: 'expense', ...nav('fin.expense'), label: 'Chi', element: <Expenses /> },
        { key: 'debts', ...nav('fin.debts'), label: 'Công nợ', element: <Debts /> },
        { key: 'reports', ...nav('fin.reports'), label: 'Báo cáo', element: <Reports /> },
        { key: 'payments', ...nav('fin.payments'), label: 'Xác nhận nộp quỹ', element: <PaymentApprovals /> },
      ]}
    />
  )
}
