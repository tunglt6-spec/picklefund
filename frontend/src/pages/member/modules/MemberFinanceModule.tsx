/**
 * MemberFinanceModule — module "Tài chính" cho MEMBER_VIEW (CHỈ XEM toàn CLB). Tái dùng màn
 * tài chính đã có; nút thao tác tự ẩn theo isMember, backend chặn ghi. Tự embedded.
 */
import { nav } from '../../../components/mobile/navCatalog'
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
        { key: 'periods', ...nav('fin.periods'), label: 'Kỳ Quỹ', element: <FundPeriods /> },
        { key: 'income', ...nav('fin.income'), label: 'Thu', element: <Contributions /> },
        { key: 'expense', ...nav('fin.expense'), label: 'Chi', element: <Expenses /> },
        { key: 'reports', ...nav('fin.reports'), label: 'Báo cáo', element: <Reports /> },
      ]}
    />
  )
}
