/**
 * MemberPersonalModule — module "Cá nhân" cho MEMBER_VIEW (view-only): phiếu thu, lịch sử
 * đóng, lịch tham gia, công nợ của chính thành viên. Tái dùng màn đã có (tự embedded).
 */
import { nav } from '../../../components/mobile/navCatalog'
import { ModuleTabs } from '../../../components/shared'
import { MemberReceipt } from '../MemberReceipt'
import { MemberContributions } from '../MemberContributions'
import { MemberAttendance } from '../MemberAttendance'
import { MemberDebts } from '../MemberDebts'

export function MemberPersonalModule() {
  return (
    <ModuleTabs
      title="Cá nhân"
      tabs={[
        { key: 'receipt', ...nav('me.receipt'), label: 'Phiếu thu', element: <MemberReceipt /> },
        { key: 'contrib', ...nav('me.contrib'), label: 'Lịch sử đóng', element: <MemberContributions /> },
        { key: 'attend', ...nav('me.attend'), label: 'Lịch tham gia', element: <MemberAttendance /> },
        { key: 'debts', ...nav('fin.debts'), label: 'Công nợ', element: <MemberDebts /> },
      ]}
    />
  )
}
