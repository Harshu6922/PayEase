'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import {
  Users, CalendarCheck, FileText, LayoutDashboard, LogOut, Banknote,
  Tag, CalendarDays, ClipboardList, WalletCards, Receipt, X, BarChart2,
  TrendingUp, Settings, Sun, Moon, Monitor, CreditCard, RotateCcw, MessageCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navigation = [
  {
    group: 'Overview',
    items: [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    group: 'Workforce',
    items: [
      { name: 'Employees', href: '/employees', icon: Users },
      { name: 'Attendance', href: '/attendance', icon: CalendarCheck },
      { name: 'Att. Summary', href: '/attendance/summary', icon: BarChart2 },
      { name: 'Daily Labourers', href: '/daily-attendance', icon: CalendarDays },
      { name: 'Advances', href: '/advances', icon: Banknote },
      { name: 'Repayments', href: '/advance-repayments', icon: RotateCcw },
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
      { name: 'My Plan', href: '/billing', icon: CreditCard },
      { name: 'Contact Us', href: '/contact', icon: MessageCircle },
    ],
  },
]

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  return (
    <div className="flex h-full w-64 flex-col border-r border-white/[0.06]" style={{ backgroundColor: '#1C2333' }}>
      {/* Brand header */}
      <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <img src="/payease logo.png" alt="PayEase" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-bold text-white text-[15px] tracking-tight">PayEase</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            style={{ color: '#6B7A99' }}
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
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase" style={{ color: '#6B7A99', letterSpacing: '0.08em' }}>
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
                      isActive ? '' : 'hover:bg-white/[0.04]'
                    }`}
                    style={{ color: isActive ? '#D4A847' : '#6B7A99' }}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-bg"
                        className="absolute inset-0 rounded-lg"
                        style={{ backgroundColor: 'rgba(212,168,71,0.12)' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                      />
                    )}
                    {isActive && (
                      <span
                        className="absolute"
                        style={{
                          left: 0, top: '50%', transform: 'translateY(-50%)',
                          width: '3px', height: '20px',
                          backgroundColor: '#D4A847', borderRadius: '2px', zIndex: 1,
                        }}
                      />
                    )}
                    <Icon
                      className="relative h-[18px] w-[18px] flex-shrink-0 transition-colors"
                      style={{ color: isActive ? '#D4A847' : '#6B7A99' }}
                    />
                    <span className="relative">{item.name}</span>
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-dot"
                        className="relative ml-auto h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: '#D4A847' }}
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
      <div className="border-t border-white/[0.06] p-3 space-y-0.5">
        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/[0.04] transition-all"
          style={{ color: '#6B7A99' }}
          title={`Theme: ${theme ?? 'system'}`}
        >
          <ThemeIcon className="h-[18px] w-[18px] transition-colors" style={{ color: '#6B7A99' }} />
          <span className="capitalize" suppressHydrationWarning>{theme ?? 'system'} theme</span>
        </button>
        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-red-500/10 hover:text-red-400 transition-all"
          style={{ color: '#6B7A99' }}
        >
          <LogOut className="h-[18px] w-[18px] group-hover:text-red-400 transition-colors" style={{ color: '#6B7A99' }} />
          Sign Out
        </button>
      </div>
    </div>
  )
}
