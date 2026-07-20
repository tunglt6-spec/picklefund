/**
 * SystemModule — module "Hệ thống" (gom Thông báo/Gói dịch vụ/Cài đặt thành tab con). Chỉ
 * tái dùng page ĐÃ CÓ, không đổi nghiệp vụ.
 */
import { ModuleTabs } from '../../../components/shared'
import { Notifications } from '../Notifications'
import { Billing } from '../Billing'
import { Settings } from '../Settings'

export function SystemModule() {
  return (
    <ModuleTabs
      title="Hệ thống"
      tabs={[
        { key: 'notifications', label: 'Thông báo', element: <Notifications /> },
        { key: 'billing', label: 'Gói dịch vụ', element: <Billing /> },
        { key: 'settings', label: 'Cài đặt', element: <Settings /> },
      ]}
    />
  )
}
