'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Users, CalendarCheck, FileText, LayoutDashboard, LogOut, Banknote,
  Tag, CalendarDays, ClipboardList, WalletCards, Receipt, X, BarChart2,
  TrendingUp, Settings, CreditCard, RotateCcw, MessageCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navigation = [
  {
    group: 'Main',
    items: [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    group: 'Payroll',
    items: [
      { name: 'Reports', href: '/reports', icon: FileText },
      { name: 'Payments', href: '/payments', icon: WalletCards },
      { name: 'Expenses', href: '/expenses', icon: Receipt },
    ],
  },
  {
    group: 'Attendance',
    items: [
      { name: 'Employees', href: '/employees', icon: Users },
      { name: 'Attendance', href: '/attendance', icon: CalendarCheck },
      { name: 'Daily Attendance', href: '/daily-attendance', icon: CalendarDays },
    ],
  },
  {
    group: 'Work',
    items: [
      { name: 'Work Entries', href: '/work-entries', icon: ClipboardList },
      { name: 'Commission', href: '/commission', icon: Tag },
      { name: 'Advances', href: '/advances', icon: Banknote },
      { name: 'Repayments', href: '/advance-repayments', icon: RotateCcw },
    ],
  },
  {
    group: 'Reports',
    items: [{ name: 'Charts', href: '/charts', icon: TrendingUp }],
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex h-full w-60 flex-col bg-[#1A1035] border-r border-[#7C3AED]/10">
      {/* Brand header */}
      <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-[#7C3AED]/10">
        <div className="flex items-center gap-2.5">
          <img src="/payease logo.png" alt="PayEase" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-bold text-text text-[15px] tracking-tight">PayEase</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#7C3AED]/10 transition-colors text-text-muted"
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
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
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
                        ? 'bg-[#7C3AED]/10 text-primary-light border-l-2 border-[#7C3AED]'
                        : 'text-text-muted hover:text-text hover:bg-[#7C3AED]/10'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-bg"
                        className="absolute inset-0 rounded-lg"
                        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                      />
                    )}
                    <Icon className="relative h-[18px] w-[18px] flex-shrink-0" />
                    <span className="relative">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#7C3AED]/10 p-3">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-danger/10 hover:text-danger transition-all"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
