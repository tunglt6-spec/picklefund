/**
 * MembersModule — module "Thành viên" (gom các màn quản lý thành viên thành tab con).
 * Chỉ tái dùng page ĐÃ CÓ, không đổi nghiệp vụ. Tab đề xuất (Vai trò & phân quyền, Lịch sử
 * hoạt động) để backlog.
 */
import { Award, History, ShieldCheck, UserCog, Users } from 'lucide-react'
import { ModuleTabs } from '../../../components/shared'
import { Members } from '../Members'
import { MemberAccounts } from '../MemberAccounts'
import { RolesPermissions } from '../RolesPermissions'
import { MemberActivity } from '../MemberActivity'
import { MemberScoring } from '../MemberScoring'

export function MembersModule() {
  return (
    <ModuleTabs
      title="Thành viên"
      tabs={[
        { key: 'list', icon: Users, label: 'Danh sách thành viên', element: <Members /> },
        { key: 'scoring', icon: Award, nested: true, label: 'Chấm điểm', element: <MemberScoring /> },
        { key: 'accounts', group: 'Quản trị', icon: UserCog, menuLabel: 'Tài khoản thành viên', label: 'Tài khoản', element: <MemberAccounts /> },
        { key: 'roles', group: 'Quản trị', icon: ShieldCheck, menuLabel: 'Vai trò & phân quyền', label: 'Vai trò & phân quyền', element: <RolesPermissions /> },
        { key: 'activity', icon: History, label: 'Lịch sử hoạt động', element: <MemberActivity /> },
      ]}
    />
  )
}
