import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import { AppLayout } from './components/layout/AppLayout'
import { lazy, Suspense, type ComponentType } from 'react'

// Route-level code-splitting: mỗi trang là 1 chunk lazy (giảm bundle khởi động ~50%).
// Helper nạp NAMED export thành default cho React.lazy. Trang render trong <Suspense> (dưới).
function lz(loader: () => Promise<Record<string, unknown>>, name: string) {
  return lazy(async () => ({ default: (await loader())[name] as ComponentType }))
}

const Login = lz(() => import('./pages/Login'), 'Login')
const NotFound = lz(() => import('./pages/NotFound'), 'NotFound')

// Public (V2.2 commercial)
const Landing = lz(() => import('./pages/public/Landing'), 'Landing')
const Pricing = lz(() => import('./pages/public/Pricing'), 'Pricing')
const DemoSelector = lz(() => import('./pages/public/DemoSelector'), 'DemoSelector')

// Super Admin pages
const SuperDashboard = lz(() => import('./pages/super/SuperDashboard'), 'SuperDashboard')
const SuperClubs = lz(() => import('./pages/super/SuperClubs'), 'SuperClubs')
const Onboarding = lz(() => import('./pages/super/Onboarding'), 'Onboarding')
const SuperClubDetail = lz(() => import('./pages/super/SuperClubDetail'), 'SuperClubDetail')
const SuperUsers = lz(() => import('./pages/super/SuperUsers'), 'SuperUsers')
const AuditLogs = lz(() => import('./pages/super/AuditLogs'), 'AuditLogs')
const SuperSettings = lz(() => import('./pages/super/SuperSettings'), 'SuperSettings')

// Club Admin pages
const ClubDashboard = lz(() => import('./pages/admin/ClubDashboard'), 'ClubDashboard')
const LisaChat = lz(() => import('./pages/admin/LisaChat'), 'LisaChat')
const Billing = lz(() => import('./pages/admin/Billing'), 'Billing')
const Members = lz(() => import('./pages/admin/Members'), 'Members')
const FundPeriods = lz(() => import('./pages/admin/FundPeriods'), 'FundPeriods')
const Contributions = lz(() => import('./pages/admin/Contributions'), 'Contributions')
const Expenses = lz(() => import('./pages/admin/Expenses'), 'Expenses')
const Debts = lz(() => import('./pages/admin/Debts'), 'Debts')
const ThuChiHub = lz(() => import('./pages/admin/ThuChiHub'), 'ThuChiHub')
const Attendance = lz(() => import('./pages/admin/Attendance'), 'Attendance')
const WeeklyActivity = lz(() => import('./pages/admin/WeeklyActivity'), 'WeeklyActivity')
const SessionRegistration = lz(() => import('./pages/admin/SessionRegistration'), 'SessionRegistration')
const CheckIn = lz(() => import('./pages/admin/CheckIn'), 'CheckIn')
const ScheduleCalendar = lz(() => import('./pages/admin/ScheduleCalendar'), 'ScheduleCalendar')
const FinanceDashboard = lz(() => import('./pages/admin/FinanceDashboard'), 'FinanceDashboard')
const Reports = lz(() => import('./pages/admin/Reports'), 'Reports')
const MemberScoring = lz(() => import('./pages/admin/MemberScoring'), 'MemberScoring')
const Settings = lz(() => import('./pages/admin/Settings'), 'Settings')
const Notifications = lz(() => import('./pages/admin/Notifications'), 'Notifications')

// Treasurer pages
const TreasurerDashboard = lz(() => import('./pages/treasurer/TreasurerDashboard'), 'TreasurerDashboard')
const TreasurerIncome = lz(() => import('./pages/treasurer/TreasurerIncome'), 'TreasurerIncome')
const TreasurerExpense = lz(() => import('./pages/treasurer/TreasurerExpense'), 'TreasurerExpense')
const TreasurerLedger = lz(() => import('./pages/treasurer/TreasurerLedger'), 'TreasurerLedger')
const TreasurerReminders = lz(() => import('./pages/treasurer/TreasurerReminders'), 'TreasurerReminders')
const TreasurerCashbookModule = lz(() => import('./pages/treasurer/modules/TreasurerCashbookModule'), 'TreasurerCashbookModule')

// Minigame pages
const MinigameList = lz(() => import('./pages/admin/minigame/MinigameList'), 'MinigameList')
const MinigameForm = lz(() => import('./pages/admin/minigame/MinigameForm'), 'MinigameForm')
const MinigameDashboard = lz(() => import('./pages/admin/minigame/MinigameDashboard'), 'MinigameDashboard')
const GroupAssignment = lz(() => import('./pages/admin/minigame/GroupAssignment'), 'GroupAssignment')
const MatchSchedule = lz(() => import('./pages/admin/minigame/MatchSchedule'), 'MatchSchedule')
const StandingsPage = lz(() => import('./pages/admin/minigame/StandingsPage'), 'StandingsPage')
const MatchHistory = lz(() => import('./pages/admin/minigame/MatchHistory'), 'MatchHistory')

// Member pages
const MemberDashboard = lz(() => import('./pages/member/MemberDashboard'), 'MemberDashboard')
const MemberAttendance = lz(() => import('./pages/member/MemberAttendance'), 'MemberAttendance')
const MemberContributions = lz(() => import('./pages/member/MemberContributions'), 'MemberContributions')
const MemberNotifications = lz(() => import('./pages/member/MemberNotifications'), 'MemberNotifications')
const MemberReceipt = lz(() => import('./pages/member/MemberReceipt'), 'MemberReceipt')
const MemberLisaChat = lz(() => import('./pages/member/MemberLisaChat'), 'MemberLisaChat')
const MemberOffice = lz(() => import('./pages/member/MemberOffice'), 'MemberOffice')

// Member modules gom (UI Consolidation v2.1) — view-only, tái dùng màn đã có làm tab.
const MemberPersonalModule = lz(() => import('./pages/member/modules/MemberPersonalModule'), 'MemberPersonalModule')
const MemberFinanceModule = lz(() => import('./pages/member/modules/MemberFinanceModule'), 'MemberFinanceModule')
const MemberActivityModule = lz(() => import('./pages/member/modules/MemberActivityModule'), 'MemberActivityModule')
const MemberCompeteModule = lz(() => import('./pages/member/modules/MemberCompeteModule'), 'MemberCompeteModule')

// Member accounts + change password
const MemberAccounts = lz(() => import('./pages/admin/MemberAccounts'), 'MemberAccounts')
const ChangePassword = lz(() => import('./pages/ChangePassword'), 'ChangePassword')

// AI Manager (Epic 4) — chỉ SUPER_ADMIN / CLUB_ADMIN
const AiManagerDashboard = lz(() => import('./pages/admin/ai/AiManagerDashboard'), 'AiManagerDashboard')
const AiApprovalInbox = lz(() => import('./pages/admin/ai/AiApprovalInbox'), 'AiApprovalInbox')
const MitDacExecutionLog = lz(() => import('./pages/admin/ai/MitDacExecutionLog'), 'MitDacExecutionLog')
const SchedulerPage = lz(() => import('./pages/admin/ai/SchedulerPage'), 'SchedulerPage')
const AlertCenterPage = lz(() => import('./pages/admin/ai/AlertCenterPage'), 'AlertCenterPage')
const DataMonitorPage = lz(() => import('./pages/admin/ai/DataMonitorPage'), 'DataMonitorPage')
const KpiMonitorPage = lz(() => import('./pages/admin/ai/KpiMonitorPage'), 'KpiMonitorPage')
const AuditLogViewer = lz(() => import('./pages/admin/ai/AuditLogViewer'), 'AuditLogViewer')
const ClubMemoryManager = lz(() => import('./pages/admin/ai/ClubMemoryManager'), 'ClubMemoryManager')
const AiDigitalOffice = lz(() => import('./pages/admin/AiDigitalOffice'), 'AiDigitalOffice')

// Hermes Workflows (Epic 5) — chỉ SUPER_ADMIN / CLUB_ADMIN
const WorkflowRules = lz(() => import('./pages/admin/workflows/WorkflowRules'), 'WorkflowRules')

// Module gom (UI Consolidation v2.1) — tái dùng màn đã có làm tab, không đổi nghiệp vụ.
const MembersModule = lz(() => import('./pages/admin/modules/MembersModule'), 'MembersModule')
const FinanceModule = lz(() => import('./pages/admin/modules/FinanceModule'), 'FinanceModule')
const ActivityModule = lz(() => import('./pages/admin/modules/ActivityModule'), 'ActivityModule')
const CompeteModule = lz(() => import('./pages/admin/modules/CompeteModule'), 'CompeteModule')
const SystemModule = lz(() => import('./pages/admin/modules/SystemModule'), 'SystemModule')

const queryClient = new QueryClient()

function ProtectedRoute({
  children,
  allowMustChangePassword = false,
}: {
  children: React.ReactNode
  allowMustChangePassword?: boolean
}) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  // allowMustChangePassword=true CHỈ dùng cho /change-password: không redirect vòng lại
  // chính route đó (nếu không, user mustChangePassword sẽ bị Navigate về đây mãi, form không render).
  if (!allowMustChangePassword && user?.mustChangePassword)
    return <Navigate to="/change-password" replace />
  return <>{children}</>
}

// Nhóm role nhân sự quản trị (admin/super/treasurer) vs member read-only.
const STAFF_ROLES = ['SUPER_ADMIN', 'CLUB_ADMIN', 'CLUB_TREASURER']

/**
 * RoleRoute — guard route theo role (không chỉ ẩn menu). Role không thuộc `allow`
 * → điều hướng về "/" (RootRedirect đưa về home đúng role). Chặn member gõ URL admin.
 */
function RoleRoute({ allow }: { allow: string[] }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (!allow.includes(user.role)) return <Navigate to="/" replace />
  return <Outlet />
}

function RootRedirect() {
  const { user, isAuthenticated } = useAuthStore()
  // Khách chưa đăng nhập → trang giới thiệu công khai (V2.2 commercial).
  if (!isAuthenticated) return <Landing />
  if (user?.role === 'SUPER_ADMIN') return <Navigate to="/super/dashboard" replace />
  // CLUB_ADMIN vào thẳng AIDO (trung tâm điều hành) sau login — UI Consolidation v2.1.
  if (user?.role === 'CLUB_ADMIN') return <Navigate to="/aido" replace />
  if (user?.role === 'CLUB_TREASURER') return <Navigate to="/treasurer/dashboard" replace />
  // MEMBER_VIEW vào thẳng Văn phòng AI (Office View) sau login — như CLUB_ADMIN.
  return <Navigate to="/member/aido" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Đang tải…</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/demo" element={<DemoSelector />} />
          <Route path="/change-password" element={<ProtectedRoute allowMustChangePassword><ChangePassword /></ProtectedRoute>} />
          <Route path="/" element={<RootRedirect />} />

          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            {/* Staff (super/admin/treasurer) — member bị chặn khỏi các route này */}
            <Route element={<RoleRoute allow={STAFF_ROLES} />}>
            {/* Super Admin */}
            <Route path="/super/dashboard" element={<SuperDashboard />} />
            <Route path="/super/clubs" element={<SuperClubs />} />
            <Route path="/super/clubs/:id" element={<SuperClubDetail />} />
            <Route path="/super/users" element={<SuperUsers />} />
            <Route path="/super/audit-logs" element={<AuditLogs />} />
            <Route path="/super/settings" element={<SuperSettings />} />

            {/* Club Admin */}
            <Route path="/dashboard" element={<ClubDashboard />} />
            <Route path="/members" element={<Members />} />
            <Route path="/thu-chi" element={<ThuChiHub />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/lisa" element={<LisaChat />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/member-accounts" element={<MemberAccounts />} />

            {/* Treasurer */}
            <Route path="/treasurer/dashboard" element={<TreasurerDashboard />} />
            <Route path="/treasurer/income" element={<TreasurerIncome />} />
            <Route path="/treasurer/expense" element={<TreasurerExpense />} />
            <Route path="/treasurer/ledger" element={<TreasurerLedger />} />
            {/* Module gom Sổ quỹ (v2.1) — tab con tái dùng Nhập thu/Nhập chi/Sổ quỹ */}
            <Route path="/treasurer/so-quy" element={<TreasurerCashbookModule />} />
            <Route path="/treasurer/reminders" element={<TreasurerReminders />} />

            </Route>
            {/* Quản lý tài chính + chấm điểm — staff quản lý đầy đủ; MEMBER_VIEW CHỈ XEM (toàn CLB, read-only).
                Nút Thêm/Sửa/Xóa/Duyệt/Chốt ẩn theo cờ isMember trong từng trang; backend chặn ghi song song. */}
            <Route element={<RoleRoute allow={[...STAFF_ROLES, 'MEMBER_VIEW']} />}>
            <Route path="/fund-periods" element={<FundPeriods />} />
            <Route path="/contributions" element={<Contributions />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/scoring" element={<MemberScoring />} />
            </Route>
            {/* Onboarding tạo CLB mới — chỉ SUPER_ADMIN (nút vào chỉ hiện ở SuperClubs cho SUPER_ADMIN) */}
            <Route element={<RoleRoute allow={['SUPER_ADMIN']} />}>
            <Route path="/onboarding" element={<Onboarding />} />
            </Route>
            {/* Màn dùng chung admin + member (member: read-only / self-scope / theo ủy quyền minigame) */}
            <Route element={<RoleRoute allow={['SUPER_ADMIN', 'CLUB_ADMIN', 'MEMBER_VIEW']} />}>
            <Route path="/debts" element={<Debts />} />
            <Route path="/schedule" element={<ScheduleCalendar />} />
            <Route path="/session-registration" element={<SessionRegistration />} />
            <Route path="/check-in" element={<CheckIn />} />
            <Route path="/activity" element={<WeeklyActivity />} />
            <Route path="/minigames" element={<MinigameList />} />
            <Route path="/minigames/new" element={<MinigameForm />} />
            <Route path="/minigames/:id" element={<MinigameDashboard />} />
            <Route path="/minigames/:id/edit" element={<MinigameForm />} />
            <Route path="/minigames/:id/groups" element={<GroupAssignment />} />
            <Route path="/minigames/:id/schedule" element={<MatchSchedule />} />
            <Route path="/minigames/:id/standings" element={<StandingsPage />} />
            <Route path="/match-history" element={<MatchHistory />} />
            <Route path="/finance-dashboard" element={<FinanceDashboard />} />
            </Route>
            {/* AI Manager (Epic 4) — chỉ SUPER_ADMIN / CLUB_ADMIN */}
            <Route element={<RoleRoute allow={['SUPER_ADMIN', 'CLUB_ADMIN']} />}>
            <Route path="/aido" element={<AiDigitalOffice />} />
            {/* Module gom (UI Consolidation v2.1) — tab con tái dùng màn cũ; route cũ vẫn giữ. */}
            <Route path="/thanh-vien" element={<MembersModule />} />
            <Route path="/tai-chinh" element={<FinanceModule />} />
            <Route path="/hoat-dong" element={<ActivityModule />} />
            <Route path="/thi-dau" element={<CompeteModule />} />
            <Route path="/he-thong" element={<SystemModule />} />
            <Route path="/admin/ai-manager" element={<AiManagerDashboard />} />
            <Route path="/admin/ai-manager/club-memory" element={<ClubMemoryManager />} />
            <Route path="/admin/ai-approvals" element={<AiApprovalInbox />} />
            <Route path="/admin/workflows" element={<WorkflowRules />} />
            <Route path="/admin/execution-log" element={<MitDacExecutionLog />} />
            <Route path="/admin/ai-scheduler" element={<SchedulerPage />} />
            <Route path="/admin/ai-alerts" element={<AlertCenterPage />} />
            <Route path="/admin/ai-data-monitor" element={<DataMonitorPage />} />
            <Route path="/admin/ai-kpi" element={<KpiMonitorPage />} />
            <Route path="/admin/ai-audit-logs" element={<AuditLogViewer />} />
            </Route>
            {/* Member (MEMBER_VIEW) — chỉ member read-only; staff không rơi vào đây */}
            <Route element={<RoleRoute allow={['MEMBER_VIEW']} />}>
            {/* Member */}
            <Route path="/member/dashboard" element={<MemberDashboard />} />
            <Route path="/member/receipt" element={<MemberReceipt />} />
            <Route path="/member/contributions" element={<MemberContributions />} />
            <Route path="/member/attendance" element={<MemberAttendance />} />
            <Route path="/member/lisa" element={<MemberLisaChat />} />
            <Route path="/member/notifications" element={<MemberNotifications />} />
            {/* Member modules gom (v2.1) — tab con tái dùng màn cũ, view-only */}
            <Route path="/member/ca-nhan" element={<MemberPersonalModule />} />
            <Route path="/member/tai-chinh" element={<MemberFinanceModule />} />
            <Route path="/member/hoat-dong" element={<MemberActivityModule />} />
            <Route path="/member/thi-dau" element={<MemberCompeteModule />} />
            <Route path="/member/aido" element={<MemberOffice />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        <Toaster position="bottom-right" toastOptions={{ duration: 5000 }} />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
