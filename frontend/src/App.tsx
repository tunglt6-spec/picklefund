import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import { AppLayout } from './components/layout/AppLayout'
import { Login } from './pages/Login'
import { NotFound } from './pages/NotFound'

// Public (V2.2 commercial)
import { Landing } from './pages/public/Landing'
import { Pricing } from './pages/public/Pricing'
import { DemoSelector } from './pages/public/DemoSelector'

// Super Admin pages
import { SuperDashboard } from './pages/super/SuperDashboard'
import { SuperClubs } from './pages/super/SuperClubs'
import { Onboarding } from './pages/super/Onboarding'
import { SuperClubDetail } from './pages/super/SuperClubDetail'
import { SuperUsers } from './pages/super/SuperUsers'
import { AuditLogs } from './pages/super/AuditLogs'
import { SuperSettings } from './pages/super/SuperSettings'

// Club Admin pages
import { ClubDashboard } from './pages/admin/ClubDashboard'
import { LisaChat } from './pages/admin/LisaChat'
import { Billing } from './pages/admin/Billing'
import { Members } from './pages/admin/Members'
import { FundPeriods } from './pages/admin/FundPeriods'
import { Contributions } from './pages/admin/Contributions'
import { Expenses } from './pages/admin/Expenses'
import { Debts } from './pages/admin/Debts'
import { ThuChiHub } from './pages/admin/ThuChiHub'
import { Attendance } from './pages/admin/Attendance'
import { WeeklyActivity } from './pages/admin/WeeklyActivity'
import { SessionRegistration } from './pages/admin/SessionRegistration'
import { CheckIn } from './pages/admin/CheckIn'
import { ScheduleCalendar } from './pages/admin/ScheduleCalendar'
import { FinanceDashboard } from './pages/admin/FinanceDashboard'
import { Reports } from './pages/admin/Reports'
import { MemberScoring } from './pages/admin/MemberScoring'
import { Settings } from './pages/admin/Settings'
import { Notifications } from './pages/admin/Notifications'

// Treasurer pages
import { TreasurerDashboard } from './pages/treasurer/TreasurerDashboard'
import { TreasurerIncome } from './pages/treasurer/TreasurerIncome'
import { TreasurerExpense } from './pages/treasurer/TreasurerExpense'
import { TreasurerLedger } from './pages/treasurer/TreasurerLedger'
import { TreasurerReminders } from './pages/treasurer/TreasurerReminders'

// Minigame pages
import { MinigameList } from './pages/admin/minigame/MinigameList'
import { MinigameForm } from './pages/admin/minigame/MinigameForm'
import { MinigameDashboard } from './pages/admin/minigame/MinigameDashboard'
import { GroupAssignment } from './pages/admin/minigame/GroupAssignment'
import { MatchSchedule } from './pages/admin/minigame/MatchSchedule'
import { StandingsPage } from './pages/admin/minigame/StandingsPage'
import { MatchHistory } from './pages/admin/minigame/MatchHistory'

// Member pages
import { MemberDashboard } from './pages/member/MemberDashboard'
import { MemberAttendance } from './pages/member/MemberAttendance'
import { MemberContributions } from './pages/member/MemberContributions'
import { MemberNotifications } from './pages/member/MemberNotifications'
import { MemberReceipt } from './pages/member/MemberReceipt'
import { MemberLisaChat } from './pages/member/MemberLisaChat'

// Member accounts + change password
import { MemberAccounts } from './pages/admin/MemberAccounts'
import { ChangePassword } from './pages/ChangePassword'

// AI Manager (Epic 4) — chỉ SUPER_ADMIN / CLUB_ADMIN
import { AiManagerDashboard } from './pages/admin/ai/AiManagerDashboard'
import { AiApprovalInbox } from './pages/admin/ai/AiApprovalInbox'
import { MitDacExecutionLog } from './pages/admin/ai/MitDacExecutionLog'
import { ClubMemoryManager } from './pages/admin/ai/ClubMemoryManager'

// Hermes Workflows (Epic 5) — chỉ SUPER_ADMIN / CLUB_ADMIN
import { WorkflowRules } from './pages/admin/workflows/WorkflowRules'

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
  if (user?.role === 'CLUB_ADMIN') return <Navigate to="/dashboard" replace />
  if (user?.role === 'CLUB_TREASURER') return <Navigate to="/treasurer/dashboard" replace />
  return <Navigate to="/member/dashboard" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
            <Route path="/fund-periods" element={<FundPeriods />} />
            <Route path="/contributions" element={<Contributions />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/thu-chi" element={<ThuChiHub />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/scoring" element={<MemberScoring />} />
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
            <Route path="/treasurer/reminders" element={<TreasurerReminders />} />

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
            <Route path="/admin/ai-manager" element={<AiManagerDashboard />} />
            <Route path="/admin/ai-manager/club-memory" element={<ClubMemoryManager />} />
            <Route path="/admin/ai-approvals" element={<AiApprovalInbox />} />
            <Route path="/admin/workflows" element={<WorkflowRules />} />
            <Route path="/admin/execution-log" element={<MitDacExecutionLog />} />
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
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster position="bottom-right" toastOptions={{ duration: 5000 }} />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
