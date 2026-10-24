/**
 * MemberPersonalModule — module "Cá nhân" cho MEMBER_VIEW (view-only): phiếu thu, lịch sử
 * đóng, lịch tham gia, công nợ của chính thành viên. Tái dùng màn đã có (tự embedded).
 */
import { CalendarCheck, HandCoins, Receipt, Wallet } from 'lucide-react'
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
        { key: 'receipt', icon: Receipt, label: 'Phiếu thu', element: <MemberReceipt /> },
        { key: 'contrib', icon: Wallet, label: 'Lịch sử đóng', element: <MemberContributions /> },
        { key: 'attend', icon: CalendarCheck, label: 'Lịch tham gia', element: <MemberAttendance /> },
        { key: 'debts', icon: HandCoins, label: 'Công nợ', element: <MemberDebts /> },
      ]}
    />
  )
}
