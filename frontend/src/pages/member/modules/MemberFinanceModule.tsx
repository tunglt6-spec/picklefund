/**
 * MemberFinanceModule — module "Tài chính" cho MEMBER_VIEW (CHỈ XEM toàn CLB). Tái dùng màn
 * tài chính đã có; nút thao tác tự ẩn theo isMember, backend chặn ghi. Tự embedded.
 */
import { ModuleTabs } from '../../../components/shared'
import { FinanceDashboard } from '../../admin/FinanceDashboard'
import { FundPeriods } from '../../admin/FundPeriods'
import { Contributions } from '../../admin/Contributions'
import { Expenses } from '../../admin/Expenses'
import { Reports } from '../../admin/Reports'

export function MemberFinanceModule() {
  return (
    <ModuleTabs
      title="Tài chính"
      tabs={[
        { key: 'overview', label: 'Tổng quan', element: <FinanceDashboard /> },
        { key: 'periods', label: 'Kỳ Quỹ', element: <FundPeriods /> },
        { key: 'income', label: 'Thu', element: <Contributions /> },
        { key: 'expense', label: 'Chi', element: <Expenses /> },
        { key: 'reports', label: 'Báo cáo', element: <Reports /> },
      ]}
    />
  )
}
