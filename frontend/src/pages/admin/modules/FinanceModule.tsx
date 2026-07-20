/**
 * FinanceModule — module "Tài chính" (gom Kỳ Quỹ/Thu/Chi/Công nợ/Dashboard/Báo cáo thành
 * tab con). Chỉ tái dùng page ĐÃ CÓ, không đổi nghiệp vụ. Dashboard tài chính = tab Tổng quan.
 */
import { ModuleTabs } from '../../../components/shared'
import { FinanceDashboard } from '../FinanceDashboard'
import { FundPeriods } from '../FundPeriods'
import { Contributions } from '../Contributions'
import { Expenses } from '../Expenses'
import { Debts } from '../Debts'
import { Reports } from '../Reports'

export function FinanceModule() {
  return (
    <ModuleTabs
      title="Tài chính"
      tabs={[
        { key: 'overview', label: 'Tổng quan', element: <FinanceDashboard /> },
        { key: 'periods', label: 'Kỳ Quỹ', element: <FundPeriods /> },
        { key: 'income', label: 'Thu', element: <Contributions /> },
        { key: 'expense', label: 'Chi', element: <Expenses /> },
        { key: 'debts', label: 'Công nợ', element: <Debts /> },
        { key: 'reports', label: 'Báo cáo', element: <Reports /> },
      ]}
    />
  )
}
