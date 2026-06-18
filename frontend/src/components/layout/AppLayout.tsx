import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { MobileHeader } from './MobileHeader'
import { useApiSync } from '../../hooks/useApiSync'
import { useMinigameSync } from '../../hooks/useMinigameSync'

export function AppLayout() {
  useApiSync()
  useMinigameSync()
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

        {/* Mobile bottom nav — 60px + safe area */}
        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  )
}
