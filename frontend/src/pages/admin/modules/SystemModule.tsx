/**
 * SystemModule — module "Hệ thống" (gom Thông báo/Gói dịch vụ/Cài đặt thành tab con). Chỉ
 * tái dùng page ĐÃ CÓ, không đổi nghiệp vụ.
 */
import { Bell, CreditCard, Settings as SettingsIcon } from 'lucide-react'
import { ModuleTabs } from '../../../components/shared'
import { Notifications } from '../Notifications'
import { Billing } from '../Billing'
import { Settings } from '../Settings'

export function SystemModule() {
  return (
    <ModuleTabs
      title="Hệ thống"
      tabs={[
        { key: 'notifications', icon: Bell, label: 'Thông báo', element: <Notifications /> },
        { key: 'billing', icon: CreditCard, label: 'Gói dịch vụ', element: <Billing /> },
        { key: 'settings', icon: SettingsIcon, nested: true, label: 'Cài đặt', element: <Settings /> },
      ]}
    />
  )
}
