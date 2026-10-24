/**
 * SystemModule — module "Hệ thống" (gom Thông báo/Gói dịch vụ/Cài đặt thành tab con). Chỉ
 * tái dùng page ĐÃ CÓ, không đổi nghiệp vụ.
 */
import { nav } from '../../../components/mobile/navCatalog'
import { ModuleTabs } from '../../../components/shared'
import { Notifications } from '../Notifications'
import { Billing } from '../Billing'
import { Settings } from '../Settings'

export function SystemModule() {
  return (
    <ModuleTabs
      title="Hệ thống"
      tabs={[
        { key: 'notifications', ...nav('sys.notifications'), label: 'Thông báo', element: <Notifications /> },
        { key: 'billing', ...nav('sys.billing'), label: 'Gói dịch vụ', element: <Billing /> },
        { key: 'settings', ...nav('sys.settings'), nested: true, label: 'Cài đặt', element: <Settings /> },
      ]}
    />
  )
}
