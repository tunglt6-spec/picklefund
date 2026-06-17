import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { MobileHeader } from './MobileHeader'
import { useApiSync } from '../../hooks/useApiSync'

export function AppLayout() {
  useApiSync()
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
        {/* Mobile header */}
        <div className="md:hidden">
          <MobileHeader />
        </div>

        <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  )
}
