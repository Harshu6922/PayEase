'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, CalendarCheck, WalletCards, Settings,
} from 'lucide-react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

const bottomTabs = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Employees', href: '/employees', icon: Users },
  { name: 'Attendance', href: '/attendance', icon: CalendarCheck },
  { name: 'Payroll', href: '/reports', icon: WalletCards },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function AppShell({ children, banner }: { children: React.ReactNode; banner?: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/' || pathname.startsWith('/employee-portal')
  if (isAuthPage) return <>{children}</>

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar — always visible */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="relative z-50 flex h-full w-60 flex-col shadow-2xl"
            >
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {banner}
        {/* Mobile top bar */}
        <Navbar onMenuOpen={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center bg-[#1A1035]/95 backdrop-blur-md border-t border-[#7C3AED]/10 h-16">
          {bottomTabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== '/dashboard' && pathname.startsWith(tab.href + '/'))
            const Icon = tab.icon
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors"
              >
                {isActive && (
                  <motion.span
                    layoutId="bottom-tab-indicator"
                    className="absolute top-0 h-0.5 w-8 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                  />
                )}
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    isActive ? 'text-primary-light' : 'text-text-muted'
                  }`}
                />
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isActive ? 'text-primary-light' : 'text-text-muted'
                  }`}
                >
                  {tab.name}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
