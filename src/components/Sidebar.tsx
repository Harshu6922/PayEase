'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Users,
  CalendarCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Banknote,
  Tag,
  CalendarDays,
  ClipboardList,
  WalletCards,
  Receipt,
  X,
  BarChart2,
  TrendingUp,
  Settings,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navigation = [
  {
    group: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    group: 'Workforce',
    items: [
      { name: 'Employees', href: '/employees', icon: Users },
      { name: 'Attendance', href: '/attendance', icon: CalendarCheck },
      { name: 'Att. Summary', href: '/attendance/summary', icon: BarChart2 },
      { name: 'Daily Attendance', href: '/daily-attendance', icon: CalendarDays },
      { name: 'Advances', href: '/advances', icon: Banknote },
    ],
  },
  {
    group: 'Commission',
    items: [
      { name: 'Commission Items', href: '/commission', icon: Tag },
      { name: 'Work Entries', href: '/work-entries', icon: ClipboardList },
    ],
  },
  {
    group: 'Payroll',
    items: [
      { name: 'Reports', href: '/reports', icon: FileText },
      { name: 'Payment History', href: '/payments', icon: WalletCards },
      { name: 'Expenses', href: '/expenses', icon: Receipt },
      { name: 'Charts', href: '/charts', icon: TrendingUp },
    ],
  },
  {
    group: 'Account',
    items: [
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      {/* Brand header */}
      <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-black">P</span>
          </div>
          <span className="font-bold text-gray-900 text-[15px] tracking-tight">PayrollApp</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navigation.map((section) => (
          <div key={section.group}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              {section.group}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-bg"
                        className="absolute inset-0 rounded-lg bg-indigo-50"
                        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                      />
                    )}
                    <Icon
                      className={`relative h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                        isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
                      }`}
                    />
                    <span className="relative">{item.name}</span>
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-dot"
                        className="relative ml-auto h-1.5 w-1.5 rounded-full bg-indigo-500"
                        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                      />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 p-3">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="h-[18px] w-[18px] text-gray-400 group-hover:text-red-500 transition-colors" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
