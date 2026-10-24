/**
 * ActivityModule — module "Hoạt động CLB" (gom Lịch/Đăng ký/Check-in/Điểm danh/Hoạt động
 * tuần thành tab con). Chỉ tái dùng page ĐÃ CÓ, không đổi nghiệp vụ. Check-in và Điểm danh
 * giữ 2 tab riêng (2 màn khác nhau).
 */
import { ModuleTabs } from '../../../components/shared'
import { ScheduleCalendar } from '../ScheduleCalendar'
import { SessionRegistration } from '../SessionRegistration'
import { CheckIn } from '../CheckIn'
import { Attendance } from '../Attendance'
import { WeeklyActivity } from '../WeeklyActivity'

export function ActivityModule() {
  return (
    <ModuleTabs
      title="Hoạt động CLB"
      tabs={[
        { key: 'schedule', label: 'Lịch', element: <ScheduleCalendar /> },
        { key: 'registration', label: 'Đăng ký', element: <SessionRegistration /> },
        { key: 'checkin', label: 'Check-in', element: <CheckIn /> },
        { key: 'attendance', label: 'Điểm danh', element: <Attendance /> },
        { key: 'weekly', label: 'Hoạt động tuần', element: <WeeklyActivity /> },
      ]}
    />
  )
}
