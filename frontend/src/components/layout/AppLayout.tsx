import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { MobileHeader } from './MobileHeader'
import { useApiSync } from '../../hooks/useApiSync'
import { useMinigameSync } from '../../hooks/useMinigameSync'
import { useAuthStore } from '../../store/authStore'

const LISA_ROUTES: Record<string, string> = {
  CLUB_ADMIN: '/lisa',
  CLUB_TREASURER: '/lisa',
  CLUB_MEMBER: '/member/lisa',
}

export function AppLayout() {
  useApiSync()
  useMinigameSync()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()

  const lisaRoute = user ? LISA_ROUTES[user.role] : null
  const isOnLisa = lisaRoute ? location.pathname === lisaRoute : false

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 flex w-72 flex-col">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header — 64px */}
        <div className="md:hidden">
          <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        </div>

        {/* Page content — extra bottom padding on mobile so bottom nav never covers content */}
        <main className="flex-1 flex flex-col overflow-hidden md:pb-0" style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom))' }}>
          <div className="flex-1 overflow-y-auto md:pb-0">
            <Outlet />
          </div>
        </main>

        {/* Lisa AI floating button — mobile only, hide when already on Lisa page */}
        {lisaRoute && !isOnLisa && (
          <button
            onClick={() => navigate(lisaRoute)}
            className="md:hidden fixed z-40 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            style={{
              right: 16,
              bottom: 'calc(72px + env(safe-area-inset-bottom))',
              width: 48,
              height: 48,
              borderRadius: 24,
              background: 'linear-gradient(135deg,#4F46E5,#06B6D4)',
            }}
            aria-label="Hỏi Lisa AI"
          >
            <Sparkles size={20} color="#fff" />
          </button>
        )}

        {/* Mobile bottom nav — 60px + safe area */}
        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  )
}
