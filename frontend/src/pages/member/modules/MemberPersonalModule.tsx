/**
 * MemberPersonalModule — module "Cá nhân" cho MEMBER_VIEW (view-only): phiếu thu, lịch sử
 * đóng, lịch tham gia, công nợ của chính thành viên. Tái dùng màn đã có (tự embedded).
 */
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
        { key: 'receipt', label: 'Phiếu thu', element: <MemberReceipt /> },
        { key: 'contrib', label: 'Lịch sử đóng', element: <MemberContributions /> },
        { key: 'attend', label: 'Lịch tham gia', element: <MemberAttendance /> },
        { key: 'debts', label: 'Công nợ', element: <MemberDebts /> },
      ]}
    />
  )
}
