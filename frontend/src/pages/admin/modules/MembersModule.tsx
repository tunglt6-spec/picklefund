/**
 * MembersModule — module "Thành viên" (gom các màn quản lý thành viên thành tab con).
 * Chỉ tái dùng page ĐÃ CÓ, không đổi nghiệp vụ. Tab đề xuất (Vai trò & phân quyền, Lịch sử
 * hoạt động) để backlog.
 */
import { nav } from '../../../components/mobile/navCatalog'
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
        { key: 'list', ...nav('mem.list'), label: 'Danh sách thành viên', element: <Members /> },
        { key: 'scoring', ...nav('mem.scoring'), nested: true, label: 'Chấm điểm', element: <MemberScoring /> },
        { key: 'accounts', group: 'Quản trị', ...nav('mem.accounts'), label: 'Tài khoản', element: <MemberAccounts /> },
        { key: 'roles', group: 'Quản trị', ...nav('mem.roles'), label: 'Vai trò & phân quyền', element: <RolesPermissions /> },
        { key: 'activity', ...nav('mem.history'), label: 'Lịch sử hoạt động', element: <MemberActivity /> },
      ]}
    />
  )
}
