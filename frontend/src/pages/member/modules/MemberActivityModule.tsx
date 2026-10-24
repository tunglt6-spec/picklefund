/**
 * MemberActivityModule — module "Hoạt động" cho MEMBER_VIEW: lịch sinh hoạt, đăng ký buổi,
 * check-in, hoạt động tuần. Tái dùng màn đã có (view-only theo isMember). Tự embedded.
 */
import { nav } from '../../../components/mobile/navCatalog'
import { ModuleTabs } from '../../../components/shared'
import { ScheduleCalendar } from '../../admin/ScheduleCalendar'
import { SessionRegistration } from '../../admin/SessionRegistration'
import { CheckIn } from '../../admin/CheckIn'
import { WeeklyActivity } from '../../admin/WeeklyActivity'

export function MemberActivityModule() {
  return (
    <ModuleTabs
      title="Hoạt động"
      tabs={[
        { key: 'schedule', ...nav('act.schedule'), label: 'Lịch sinh hoạt', element: <ScheduleCalendar /> },
        { key: 'registration', ...nav('act.registration'), label: 'Đăng ký buổi', element: <SessionRegistration /> },
        { key: 'checkin', ...nav('act.checkin'), label: 'Check-in', element: <CheckIn /> },
        { key: 'weekly', ...nav('act.weekly'), label: 'Hoạt động tuần', element: <WeeklyActivity /> },
      ]}
    />
  )
}
