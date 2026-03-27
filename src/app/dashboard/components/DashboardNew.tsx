'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Users, CalendarCheck, Banknote, Receipt,
  ClipboardList, CalendarDays, FileText, Wallet,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { useCountUp } from '@/lib/hooks/useCountUp'
import WorkerTypeBadge from '@/components/WorkerTypeBadge'

interface Props {
  month: string
  totalEmployees: number
  salaryEmployees: number
  commissionEmployees: number
  dailyEmployees: number
  todaysAttendance: number
  totalAdvances: number
  advancesCount: number
  totalExpenses: number
  topEmployees: { id: string; name: string; worker_type: string }[]
}

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

function MetricCard({
  label,
  icon: Icon,
  value,
  valueClass,
  prefix = '₹',
}: {
  label: string
  icon: React.ElementType
  value: number
  valueClass: string
  prefix?: string
}) {
  const counted = useCountUp(Math.round(value))
  return (
    <motion.div
      variants={fadeInUp}
      className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl p-4 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] hover:border-[#7C3AED]/50 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary-light" />
        </div>
      </div>
      <p className={`text-2xl font-mono font-bold ${valueClass}`}>
        {prefix}{counted.toLocaleString('en-IN')}
      </p>
    </motion.div>
  )
}

export default function DashboardNew({
  month, totalEmployees, salaryEmployees, commissionEmployees,
  dailyEmployees, todaysAttendance, totalAdvances, advancesCount,
  totalExpenses, topEmployees,
}: Props) {
  const attendanceRate = totalEmployees > 0
    ? Math.round((todaysAttendance / totalEmployees) * 100)
    : 0

  // Derive a user-initial from the month string for avatar display
  const avatarInitial = 'A'

  // Count-up animated values (hooks must be at top level)
  const countedAttendance = useCountUp(todaysAttendance)
  const countedEmployees = useCountUp(totalEmployees)

  return (
    <div className="flex flex-col min-h-screen bg-background">

      {/* ── Desktop Top Bar ── */}
      <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-[#7C3AED]/10">
        {/* Left: company label */}
        <p className="text-sm text-text-muted">PayEase</p>

        {/* Center: month selector */}
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="p-1 rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-text"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          <span className="text-text font-semibold text-sm min-w-[130px] text-center">{month}</span>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="p-1 rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-text"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Right: user avatar */}
        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary-light text-sm flex items-center justify-center font-semibold select-none">
          {avatarInitial}
        </div>
      </div>

      {/* ── Mobile Header ── */}
      <div className="md:hidden px-4 pt-6 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide mb-0.5">PayEase</p>
          <h1 className="text-xl font-bold text-text">Dashboard</h1>
        </div>
        <Link
          href="/reports"
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary-light hover:bg-primary/20 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          Reports
        </Link>
      </div>

      {/* ── Desktop Page Title Row ── */}
      <div className="hidden md:flex items-center justify-between px-6 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-text">Dashboard</h1>
        <Link
          href="/reports"
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-primary/10 text-primary-light hover:bg-primary/20 transition-colors"
        >
          <FileText className="w-4 h-4" />
          View Reports
        </Link>
      </div>

      {/* ── 4 Metric Cards ── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 md:px-6 py-4"
      >
        {/* Total Expenses (Total Payable proxy) */}
        <MetricCard
          label="Total Expenses"
          icon={Wallet}
          value={totalExpenses}
          valueClass="text-rupee-gold"
        />

        {/* Present Today */}
        <motion.div
          variants={fadeInUp}
          className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl p-4 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] hover:border-[#7C3AED]/50 transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs text-text-muted uppercase tracking-wide">Present Today</p>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4 text-primary-light" />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-success">
            {countedAttendance}
            <span className="text-sm font-normal text-text-muted ml-1">/ {totalEmployees}</span>
          </p>
          <div className="mt-2">
            <div className="w-full h-1 rounded-full overflow-hidden bg-white/10">
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
            <p className="text-xs text-text-muted mt-1">{attendanceRate}% rate</p>
          </div>
        </motion.div>

        {/* Advances Outstanding */}
        <MetricCard
          label="Advances Outstanding"
          icon={Banknote}
          value={totalAdvances}
          valueClass="text-primary"
        />

        {/* Employees */}
        <motion.div
          variants={fadeInUp}
          className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl p-4 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] hover:border-[#7C3AED]/50 transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs text-text-muted uppercase tracking-wide">Employees</p>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary-light" />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-text">
            {countedEmployees}
          </p>
          <div className="flex gap-1.5 flex-wrap mt-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary-light border border-primary/30">
              {salaryEmployees} Sal
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#A855F7]/15 text-[#A855F7] border border-[#A855F7]/30">
              {commissionEmployees} Com
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rupee-gold/15 text-rupee-gold border border-rupee-gold/30">
              {dailyEmployees} Daily
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Employee Overview Table ── */}
      <div className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl mx-4 md:mx-6 mb-6 overflow-hidden">
        {/* Table header bar */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-[#7C3AED]/10">
          <h2 className="text-sm font-semibold text-text">Employee Overview</h2>
          <Link href="/employees" className="text-xs font-medium text-primary-light hover:text-primary transition-colors">
            View all →
          </Link>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-surface">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wide">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wide">Type</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wide">Advances</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {topEmployees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-text-muted">
                    No employees found.
                  </td>
                </tr>
              ) : (
                topEmployees.map((emp) => {
                  const workerType = emp.worker_type.charAt(0).toUpperCase() + emp.worker_type.slice(1) as 'Salaried' | 'Daily' | 'Commission'
                  return (
                    <tr
                      key={emp.id}
                      className="border-t border-[#7C3AED]/10 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary-light text-xs font-semibold flex items-center justify-center flex-shrink-0">
                            {initials(emp.name)}
                          </div>
                          <span className="text-sm font-medium text-text">{emp.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <WorkerTypeBadge type={workerType} />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className="font-mono text-sm text-warning">—</span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          href={`/employees/${emp.id}`}
                          className="bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors inline-block"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-[#7C3AED]/10">
          {topEmployees.length === 0 ? (
            <p className="px-4 py-6 text-sm text-text-muted text-center">No employees found.</p>
          ) : (
            topEmployees.map((emp) => {
              const workerType = emp.worker_type.charAt(0).toUpperCase() + emp.worker_type.slice(1) as 'Salaried' | 'Daily' | 'Commission'
              return (
                <div key={emp.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-primary/20 text-primary-light text-xs font-semibold flex items-center justify-center flex-shrink-0">
                    {initials(emp.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{emp.name}</p>
                    <WorkerTypeBadge type={workerType} />
                  </div>
                  <Link
                    href={`/employees/${emp.id}`}
                    className="bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    View
                  </Link>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="mx-4 md:mx-6 mb-6">
        <div className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-text mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              href="/attendance"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/10 text-primary-light text-sm font-semibold hover:bg-primary/20 transition-colors"
            >
              <CalendarCheck className="w-4 h-4 flex-shrink-0" />
              Mark Attendance
            </Link>
            <Link
              href="/daily-attendance"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-[#7C3AED]/20 text-text text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <CalendarDays className="w-4 h-4 flex-shrink-0 text-text-muted" />
              Daily Attendance
            </Link>
            <Link
              href="/work-entries"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-[#7C3AED]/20 text-text text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <ClipboardList className="w-4 h-4 flex-shrink-0 text-text-muted" />
              Log Work Entry
            </Link>
            <Link
              href="/expenses"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-[#7C3AED]/20 text-text text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <Receipt className="w-4 h-4 flex-shrink-0 text-text-muted" />
              Add Expense
            </Link>
          </div>
        </div>
      </div>

    </div>
  )
}
