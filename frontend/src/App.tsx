import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import { AppLayout } from './components/layout/AppLayout'
import { Login } from './pages/Login'
import { NotFound } from './pages/NotFound'

// Super Admin pages
import { SuperDashboard } from './pages/super/SuperDashboard'
import { SuperClubs } from './pages/super/SuperClubs'
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
import { Attendance } from './pages/admin/Attendance'
import { Reports } from './pages/admin/Reports'
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

// Member pages
import { MemberDashboard } from './pages/member/MemberDashboard'
import { MemberAttendance } from './pages/member/MemberAttendance'
import { MemberContributions } from './pages/member/MemberContributions'
import { MemberNotifications } from './pages/member/MemberNotifications'
import { MemberReceipt } from './pages/member/MemberReceipt'

// Member accounts + change password
import { MemberAccounts } from './pages/admin/MemberAccounts'
import { ChangePassword } from './pages/ChangePassword'

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.mustChangePassword) return <Navigate to="/change-password" replace />
  return <>{children}</>
}

function RootRedirect() {
  const { user, isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
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
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/" element={<RootRedirect />} />

          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
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
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/minigames" element={<MinigameList />} />
            <Route path="/minigames/new" element={<MinigameForm />} />
            <Route path="/minigames/:id" element={<MinigameDashboard />} />
            <Route path="/minigames/:id/edit" element={<MinigameForm />} />
            <Route path="/minigames/:id/groups" element={<GroupAssignment />} />
            <Route path="/minigames/:id/schedule" element={<MatchSchedule />} />
            <Route path="/minigames/:id/standings" element={<StandingsPage />} />
            <Route path="/reports" element={<Reports />} />
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

            {/* Member */}
            <Route path="/member/dashboard" element={<MemberDashboard />} />
            <Route path="/member/receipt" element={<MemberReceipt />} />
            <Route path="/member/contributions" element={<MemberContributions />} />
            <Route path="/member/attendance" element={<MemberAttendance />} />
            <Route path="/member/notifications" element={<MemberNotifications />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster position="bottom-right" toastOptions={{ duration: 5000 }} />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
