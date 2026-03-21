'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Users, CalendarCheck, Banknote, Receipt,
  ClipboardList, CalendarDays, FileText,
} from 'lucide-react'

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

const fmt = (n: number) => '₨ ' + n.toLocaleString('en-PK')

const typeStyle: Record<string, { bg: string; text: string; label: string }> = {
  salaried:   { bg: '#EEF2FF', text: '#4338CA', label: 'Salaried' },
  commission: { bg: '#FFF8ED', text: '#92400E', label: 'Commission' },
  daily:      { bg: '#F0FDF4', text: '#166534', label: 'Daily' },
}

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export default function DashboardNew({
  month, totalEmployees, salaryEmployees, commissionEmployees,
  dailyEmployees, todaysAttendance, totalAdvances, advancesCount,
  totalExpenses, topEmployees,
}: Props) {
  const attendanceRate = totalEmployees > 0
    ? Math.round((todaysAttendance / totalEmployees) * 100)
    : 0

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#F7F6F3' }}>

      {/* ── Header Band ── */}
      <div className="px-8 pt-8 pb-7" style={{ backgroundColor: '#1C2333' }}>
        <div className="flex items-start justify-between mb-7">
          <div>
            <p className="text-xs font-semibold uppercase mb-1.5" style={{ color: '#6B7A99', letterSpacing: '0.1em' }}>
              {month}
            </p>
            <h1 className="font-display text-4xl font-extrabold text-white" style={{ letterSpacing: '-0.5px' }}>
              Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <Link
              href="/reports"
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#D4A847', color: '#1C2333' }}
            >
              <FileText className="h-4 w-4" />
              View Reports
            </Link>
          </div>
        </div>

        {/* Hero metrics */}
        <div className="flex items-center gap-10 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase mb-1" style={{ color: '#6B7A99', letterSpacing: '0.08em' }}>
              Active Employees
            </p>
            <p className="font-display font-extrabold leading-none" style={{ fontSize: '52px', color: '#D4A847', letterSpacing: '-1.5px' }}>
              {totalEmployees}
            </p>
          </div>
          <div className="w-px h-12 self-center" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />
          <div>
            <p className="text-xs font-semibold uppercase mb-1" style={{ color: '#6B7A99', letterSpacing: '0.08em' }}>
              Present Today
            </p>
            <p className="font-display font-bold text-white leading-none" style={{ fontSize: '32px', letterSpacing: '-0.5px' }}>
              {todaysAttendance}{' '}
              <span className="text-xl font-normal" style={{ color: '#6B7A99' }}>/ {totalEmployees}</span>
            </p>
          </div>
          <div className="w-px h-12 self-center" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />
          <div>
            <p className="text-xs font-semibold uppercase mb-1" style={{ color: '#6B7A99', letterSpacing: '0.08em' }}>
              Advances Outstanding
            </p>
            <p className="font-display font-bold text-white leading-none" style={{ fontSize: '32px', letterSpacing: '-0.5px' }}>
              {fmt(totalAdvances)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 p-8 flex flex-col gap-6">

        {/* KPI Cards */}
        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden" animate="show" variants={stagger}
        >
          {/* Employees */}
          <motion.div variants={fadeUp}>
            <div className="rounded-2xl p-6 flex flex-col gap-4 border h-full" style={{ backgroundColor: '#fff', borderColor: '#EDECEA' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Total Employees</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F3F0E8' }}>
                  <Users className="h-4 w-4" style={{ color: '#D4A847' }} />
                </div>
              </div>
              <div>
                <p className="font-display font-extrabold leading-none" style={{ fontSize: '40px', color: '#1A1F36', letterSpacing: '-1px' }}>{totalEmployees}</p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Active this month</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ backgroundColor: '#EEF2FF', color: '#4338CA' }}>● {salaryEmployees} Salaried</span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ backgroundColor: '#FFF8ED', color: '#92400E' }}>● {commissionEmployees} Commission</span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ backgroundColor: '#F0FDF4', color: '#166534' }}>● {dailyEmployees} Daily</span>
              </div>
            </div>
          </motion.div>

          {/* Attendance */}
          <motion.div variants={fadeUp}>
            <div className="rounded-2xl p-6 flex flex-col gap-4 border h-full" style={{ backgroundColor: '#fff', borderColor: '#EDECEA' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Attendance Today</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F0FDF4' }}>
                  <CalendarCheck className="h-4 w-4" style={{ color: '#22C55E' }} />
                </div>
              </div>
              <div>
                <p className="font-display font-extrabold leading-none" style={{ fontSize: '40px', color: '#1A1F36', letterSpacing: '-1px' }}>
                  {todaysAttendance}<span className="text-xl font-normal ml-1" style={{ color: '#9CA3AF' }}>/ {totalEmployees}</span>
                </p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Present · {totalEmployees - todaysAttendance} absent</p>
              </div>
              <div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                  <div className="h-full rounded-full" style={{ width: `${attendanceRate}%`, backgroundColor: '#22C55E' }} />
                </div>
                <p className="text-xs mt-1.5" style={{ color: '#9CA3AF' }}>{attendanceRate}% attendance rate</p>
              </div>
            </div>
          </motion.div>

          {/* Advances */}
          <motion.div variants={fadeUp}>
            <div className="rounded-2xl p-6 flex flex-col gap-4 border h-full" style={{ backgroundColor: '#fff', borderColor: '#EDECEA' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Advances Outstanding</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFF8ED' }}>
                  <Banknote className="h-4 w-4" style={{ color: '#D4A847' }} />
                </div>
              </div>
              <div>
                <p className="font-display font-extrabold leading-none" style={{ fontSize: '36px', color: '#1A1F36', letterSpacing: '-1px' }}>{fmt(totalAdvances)}</p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Across {advancesCount} employees</p>
              </div>
              <Link href="/advances" className="text-xs font-medium px-2.5 py-1 rounded-md self-start" style={{ backgroundColor: '#FFF3CD', color: '#92400E' }}>
                View advances →
              </Link>
            </div>
          </motion.div>

          {/* Expenses */}
          <motion.div variants={fadeUp}>
            <div className="rounded-2xl p-6 flex flex-col gap-4 border h-full" style={{ backgroundColor: '#fff', borderColor: '#EDECEA' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Expenses This Month</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEF2F2' }}>
                  <Receipt className="h-4 w-4" style={{ color: '#EF4444' }} />
                </div>
              </div>
              <div>
                <p className="font-display font-extrabold leading-none" style={{ fontSize: '36px', color: '#1A1F36', letterSpacing: '-1px' }}>{fmt(totalExpenses)}</p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>This month</p>
              </div>
              <Link href="/expenses" className="text-xs font-medium px-2.5 py-1 rounded-md self-start" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                View expenses →
              </Link>
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom Row */}
        <div className="flex gap-4 flex-col lg:flex-row">

          {/* Employee List */}
          <div className="flex-[2] rounded-2xl border overflow-hidden" style={{ backgroundColor: '#fff', borderColor: '#EDECEA' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#F3F4F6' }}>
              <h2 className="font-display font-bold text-base" style={{ color: '#1A1F36' }}>Employee Overview</h2>
              <Link href="/employees" className="text-xs font-medium" style={{ color: '#D4A847' }}>View all →</Link>
            </div>
            <div className="flex px-6 py-2 border-b" style={{ borderColor: '#F3F4F6' }}>
              <span className="flex-[2] text-xs font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Employee</span>
              <span className="flex-1 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Type</span>
            </div>
            {topEmployees.length === 0 && (
              <p className="px-6 py-4 text-sm" style={{ color: '#9CA3AF' }}>No employees found.</p>
            )}
            {topEmployees.map((emp) => {
              const t = typeStyle[emp.worker_type] ?? typeStyle.salaried
              return (
                <div key={emp.id} className="flex items-center px-6 py-3 border-b last:border-0" style={{ borderColor: '#F9FAFB' }}>
                  <div className="flex-[2] flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
                      style={{ backgroundColor: t.bg, color: t.text }}
                    >
                      {initials(emp.name)}
                    </div>
                    <span className="text-sm font-medium" style={{ color: '#1A1F36' }}>{emp.name}</span>
                  </div>
                  <div className="flex-1 flex justify-center">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ backgroundColor: t.bg, color: t.text }}>
                      {t.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex-1">
            <div className="rounded-2xl border p-5 flex flex-col gap-3" style={{ backgroundColor: '#fff', borderColor: '#EDECEA' }}>
              <h2 className="font-display font-bold text-base" style={{ color: '#1A1F36' }}>Quick Actions</h2>
              <Link
                href="/attendance"
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#1C2333', color: '#fff' }}
              >
                <CalendarCheck className="h-4 w-4" style={{ color: '#D4A847' }} />
                Mark Attendance
              </Link>
              <Link href="/daily-attendance" className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-gray-50 transition-colors" style={{ backgroundColor: '#F7F6F3', borderColor: '#EDECEA', color: '#374151' }}>
                <CalendarDays className="h-4 w-4 text-gray-400" /> Daily Attendance
              </Link>
              <Link href="/work-entries" className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-gray-50 transition-colors" style={{ backgroundColor: '#F7F6F3', borderColor: '#EDECEA', color: '#374151' }}>
                <ClipboardList className="h-4 w-4 text-gray-400" /> Log Work Entry
              </Link>
              <Link href="/expenses" className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-gray-50 transition-colors" style={{ backgroundColor: '#F7F6F3', borderColor: '#EDECEA', color: '#374151' }}>
                <Receipt className="h-4 w-4 text-gray-400" /> Add Expense
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
