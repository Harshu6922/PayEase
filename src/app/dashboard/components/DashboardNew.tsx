'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Users, CalendarCheck, Banknote, Receipt, ClipboardList, FileText,
} from 'lucide-react'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { useCountUp } from '@/lib/hooks/useCountUp'

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
  topEmployees: { id: string; full_name: string; worker_type: string; monthly_salary: number }[]
}

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

const avatarColor: Record<string, string> = {
  salaried: 'bg-[#7C3AED]/20 text-[#bd9dff]',
  commission: 'bg-[#4b4168]/40 text-[#d3c5f5]',
  daily: 'bg-[#28213e] text-[#afa7c2]',
}

const typeBadge: Record<string, string> = {
  salaried: 'bg-[#7C3AED]/10 text-[#bd9dff]',
  commission: 'bg-[#4b4168]/30 text-[#d3c5f5]',
  daily: 'bg-[#28213e] text-[#afa7c2]',
}

const glassCard = 'backdrop-blur-md bg-[rgba(28,22,46,0.6)] border border-[#7C3AED]/10 rounded-xl transition-all duration-300 hover:shadow-[0_0_40px_rgba(124,58,237,0.08)] hover:border-[#bd9dff]/30'

export default function DashboardNew({
  month, totalEmployees, salaryEmployees, commissionEmployees,
  dailyEmployees, todaysAttendance, totalAdvances, advancesCount,
  totalExpenses, topEmployees,
}: Props) {
  const attendanceRate = totalEmployees > 0
    ? Math.round((todaysAttendance / totalEmployees) * 100)
    : 0

  const countedEmployees = useCountUp(totalEmployees)
  const countedAttendance = useCountUp(todaysAttendance)
  const countedAdvances = useCountUp(Math.round(totalAdvances))
  const countedExpenses = useCountUp(Math.round(totalExpenses))

  return (
    <div className="min-h-screen bg-[#100b1f] pb-12">

      {/* Top header */}
      <div className="flex items-center justify-between px-4 lg:px-8 pt-6 pb-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#afa7c2]">
            {month.toUpperCase()}
          </p>
          <h1 className="text-2xl font-extrabold text-[#ebe1fe] tracking-tight mt-0.5">Dashboard</h1>
        </div>
        <Link
          href="/reports"
          className="hidden sm:flex items-center gap-2 bg-[#b28cff] text-[#2e006c] px-5 py-2 rounded-xl font-bold text-sm hover:shadow-[0_0_20px_rgba(189,157,255,0.3)] transition-all active:scale-95"
        >
          <FileText className="h-4 w-4" />
          View Reports
        </Link>
      </div>

      <div className="px-4 lg:px-8 space-y-8">

        {/* Stats Grid */}
        <motion.section
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {/* Total Employees */}
          <motion.div variants={fadeInUp} className={`${glassCard} p-6`}>
            <div className="flex justify-between items-start mb-4">
              <span className="text-[#afa7c2] text-sm font-medium">Total Employees</span>
              <Users className="h-5 w-5 text-[#bd9dff]" />
            </div>
            <div className="text-3xl font-bold text-[#ebe1fe] mb-4">{countedEmployees}</div>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 rounded-full bg-[#7C3AED]/10 text-[#bd9dff] text-[10px] font-bold uppercase tracking-wider">
                Salaried: {salaryEmployees}
              </span>
              <span className="px-2 py-1 rounded-full bg-[#4b4168]/30 text-[#d3c5f5] text-[10px] font-bold uppercase tracking-wider">
                Comm: {commissionEmployees}
              </span>
              <span className="px-2 py-1 rounded-full bg-[#28213e] text-[#afa7c2] text-[10px] font-bold uppercase tracking-wider">
                Daily: {dailyEmployees}
              </span>
            </div>
          </motion.div>

          {/* Attendance Today */}
          <motion.div variants={fadeInUp} className={`${glassCard} p-6`}>
            <div className="flex justify-between items-start mb-4">
              <span className="text-[#afa7c2] text-sm font-medium">Attendance Today</span>
              <CalendarCheck className="h-5 w-5 text-[#bd9dff]" />
            </div>
            <div className="flex items-end gap-2 mb-2">
              <div className="text-3xl font-bold text-[#ebe1fe]">
                {countedAttendance}/{totalEmployees}
              </div>
              <div className="text-[#bd9dff] font-bold mb-1 text-sm">{attendanceRate}%</div>
            </div>
            <div className="w-full h-1.5 bg-[#28213e] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#bd9dff] rounded-full transition-all"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
            <p className="text-[10px] text-[#afa7c2] mt-3 font-medium">
              {totalEmployees - todaysAttendance} employees absent
            </p>
          </motion.div>

          {/* Advances Outstanding */}
          <motion.div variants={fadeInUp} className={`${glassCard} p-6`}>
            <div className="flex justify-between items-start mb-4">
              <span className="text-[#afa7c2] text-sm font-medium">Advances Outstanding</span>
              <Banknote className="h-5 w-5 text-[#bd9dff]" />
            </div>
            <div className="text-3xl font-bold text-[#ebe1fe] mb-1">
              ₹{countedAdvances.toLocaleString('en-IN')}
            </div>
            <p className="text-[#afa7c2] text-sm font-medium">Across {advancesCount} employees</p>
            <Link
              href="/advances"
              className="mt-4 inline-flex items-center gap-1 text-[#bd9dff] text-[10px] font-bold hover:underline"
            >
              View advances →
            </Link>
          </motion.div>

          {/* Expenses This Month */}
          <motion.div variants={fadeInUp} className={`${glassCard} p-6`}>
            <div className="flex justify-between items-start mb-4">
              <span className="text-[#afa7c2] text-sm font-medium">Expenses This Month</span>
              <Receipt className="h-5 w-5 text-[#bd9dff]" />
            </div>
            <div className="text-3xl font-bold text-[#ebe1fe] mb-1">
              ₹{countedExpenses.toLocaleString('en-IN')}
            </div>
            <p className="text-[#afa7c2] text-sm font-medium">Operating &amp; Misc.</p>
            <Link
              href="/expenses"
              className="mt-4 inline-flex items-center gap-1 text-[#bd9dff] text-[10px] font-bold hover:underline"
            >
              View expenses →
            </Link>
          </motion.div>
        </motion.section>

        {/* Main Layout: Table + Quick Actions */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Employee Overview (2/3) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`${glassCard} lg:col-span-2 overflow-hidden`}
          >
            <div className="px-6 py-5 flex justify-between items-center border-b border-[#4b455c]/20">
              <h2 className="text-lg font-bold text-[#ebe1fe]">Employee Overview</h2>
              <Link
                href="/employees"
                className="text-[#bd9dff] text-sm font-bold flex items-center gap-1 hover:underline"
              >
                View All →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[520px]">
                <thead>
                  <tr className="text-[#afa7c2] text-[11px] font-bold tracking-widest uppercase border-b border-[#4b455c]/10">
                    <th className="px-6 py-4">Employee Name</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Monthly Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#4b455c]/10">
                  {topEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-sm text-[#afa7c2]">
                        No employees found.
                      </td>
                    </tr>
                  ) : topEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-[#7C3AED]/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${avatarColor[emp.worker_type] ?? 'bg-[#28213e] text-[#afa7c2]'}`}>
                            {initials(emp.full_name)}
                          </div>
                          <span className="font-medium text-sm text-[#ebe1fe]">{emp.full_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${typeBadge[emp.worker_type] ?? 'bg-[#28213e] text-[#afa7c2]'}`}>
                          {emp.worker_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-sm text-[#ebe1fe]">
                        ₹{emp.monthly_salary?.toLocaleString('en-IN') ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Quick Actions (1/3) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`${glassCard} p-6 h-fit`}
          >
            <h2 className="text-lg font-bold text-[#ebe1fe] mb-6">Quick Actions</h2>
            <div className="space-y-4">
              <Link
                href="/attendance"
                className="flex items-center gap-4 p-4 rounded-xl bg-[#7C3AED]/10 border border-[#7C3AED]/20 hover:bg-[#7C3AED]/20 transition-all text-left group"
              >
                <span className="p-3 rounded-lg bg-[#bd9dff] text-[#2e006c] group-hover:scale-110 transition-transform flex-shrink-0">
                  <CalendarCheck className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-bold text-sm text-[#ebe1fe]">Mark Attendance</div>
                  <div className="text-[10px] text-[#afa7c2] font-medium mt-0.5">Daily register login</div>
                </div>
              </Link>

              <Link
                href="/work-entries"
                className="flex items-center gap-4 p-4 rounded-xl bg-[#4b4168]/20 border border-[#4b455c]/10 hover:bg-[#4b4168]/40 transition-all text-left group"
              >
                <span className="p-3 rounded-lg bg-[#4b4168] text-[#d3c5f5] group-hover:scale-110 transition-transform flex-shrink-0">
                  <ClipboardList className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-bold text-sm text-[#ebe1fe]">Log Work Entry</div>
                  <div className="text-[10px] text-[#afa7c2] font-medium mt-0.5">Update tasks for labourers</div>
                </div>
              </Link>
            </div>

            {/* Payroll alert */}
            <div className="mt-8 p-4 rounded-xl bg-gradient-to-br from-[#7C3AED]/10 to-transparent border border-[#7C3AED]/10">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="h-4 w-4 text-[#bd9dff]" />
                <span className="text-xs font-bold text-[#bd9dff] uppercase tracking-wider">Payroll Tip</span>
              </div>
              <p className="text-[11px] text-[#afa7c2] leading-relaxed">
                Mark today's attendance before running payroll to ensure accurate salary calculations.
              </p>
            </div>
          </motion.div>

        </section>
      </div>
    </div>
  )
}
