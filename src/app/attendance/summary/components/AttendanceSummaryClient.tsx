'use client'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, parse } from 'date-fns'
import { motion } from 'framer-motion'
import Link from 'next/link'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const row = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } } }

function AttendanceBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-10 text-right">{pct.toFixed(0)}%</span>
    </div>
  )
}

export default function AttendanceSummaryClient({ month, employees, records }: {
  month: string; employees: any[]; records: any[]
}) {
  const router = useRouter()
  const monthLabel = format(parse(month + '-01', 'yyyy-MM-dd', new Date()), 'MMMM yyyy')
  const [y, m] = month.split('-').map(Number)
  const totalWorkingDays = new Date(y, m, 0).getDate()

  const summary = useMemo(() => employees.map(emp => {
    const empRecs = records.filter(r => r.employee_id === emp.id)
    const present  = empRecs.filter(r => r.status === 'Present').length
    const halfDay  = empRecs.filter(r => r.status === 'Half Day').length
    const absent   = totalWorkingDays - present - halfDay
    const pct      = totalWorkingDays > 0 ? ((present + halfDay * 0.5) / totalWorkingDays) * 100 : 0
    return { emp, present, halfDay, absent: Math.max(0, absent), pct }
  }).sort((a, b) => b.pct - a.pct), [employees, records, totalWorkingDays])

  const avgAttendance = summary.length > 0
    ? summary.reduce((s, r) => s + r.pct, 0) / summary.length
    : 0
  const perfectAttendance = summary.filter(r => r.absent === 0).length
  const lowAttendance     = summary.filter(r => r.pct < 70).length

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Summary</h1>
          <p className="mt-1 text-sm text-gray-500">{monthLabel} · {totalWorkingDays} days</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="month" value={month}
            onChange={e => e.target.value && router.push(`/attendance/summary?month=${e.target.value}`)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:outline-none"
          />
          <Link href="/attendance" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            ← Attendance
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Avg Attendance', value: `${avgAttendance.toFixed(1)}%`, color: avgAttendance >= 80 ? 'text-green-600' : 'text-amber-600' },
          { label: 'Perfect Attendance', value: perfectAttendance, color: 'text-indigo-600' },
          { label: 'Low Attendance (<70%)', value: lowAttendance, color: lowAttendance > 0 ? 'text-red-600' : 'text-green-600' },
        ].map(card => (
          <motion.div key={card.label} variants={row} className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Per-employee table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Present</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Half Day</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Absent</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">Attendance</th>
            </tr>
          </thead>
          <motion.tbody variants={container} initial="hidden" animate="show" className="divide-y divide-gray-50 bg-white">
            {summary.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">No salaried employees found.</td></tr>
            ) : summary.map(({ emp, present, halfDay, absent, pct }) => (
              <motion.tr key={emp.id} variants={row} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-semibold text-gray-900">{emp.full_name}</p>
                  <p className="text-xs text-gray-400">{emp.employee_id}</p>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-block bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">{present}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-block bg-yellow-50 text-yellow-700 text-xs font-semibold px-2.5 py-1 rounded-full">{halfDay}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${absent > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-500'}`}>{absent}</span>
                </td>
                <td className="px-6 py-4 w-48">
                  <AttendanceBar pct={pct} />
                </td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>
    </>
  )
}
