'use client'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, parse } from 'date-fns'
import { motion } from 'framer-motion'
import Link from 'next/link'

function calcEarnings(emp: any, attendance: any[], workEntries: any[], dailyAtt: any[], days: number) {
  if (emp.worker_type === 'commission') {
    return workEntries.filter(e => e.employee_id === emp.id).reduce((s: number, e: any) => s + Number(e.total_amount ?? 0), 0)
  }
  if (emp.worker_type === 'daily') {
    return dailyAtt.filter(a => a.employee_id === emp.id).reduce((s: number, a: any) => s + Number(a.pay_amount ?? 0), 0)
  }
  // salaried
  const empAtt = attendance.filter(a => a.employee_id === emp.id)
  const workedDays = empAtt.filter(a => Number(a.worked_hours) > 0).length
  const perDay = days > 0 ? Number(emp.monthly_salary) / days : 0
  const ot = empAtt.reduce((s: number, a: any) => s + Number(a.overtime_amount ?? 0), 0)
  const ded = empAtt.reduce((s: number, a: any) => s + Number(a.deduction_amount ?? 0), 0)
  return workedDays * perDay + ot - ded
}

function formatRs(n: number) {
  return 'Rs. ' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const row = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } } }

interface Props {
  month: string; prevMonth: string; employees: any[]
  curAttendance: any[]; prevAttendance: any[]
  curWorkEntries: any[]; prevWorkEntries: any[]
  curDailyAtt: any[]; prevDailyAtt: any[]
  curDays: number; prevDays: number
}

export default function PayrollComparison(props: Props) {
  const { month, prevMonth, employees, curAttendance, prevAttendance, curWorkEntries, prevWorkEntries, curDailyAtt, prevDailyAtt, curDays, prevDays } = props
  const router = useRouter()

  const monthLabel = format(parse(month + '-01', 'yyyy-MM-dd', new Date()), 'MMMM yyyy')
  const prevLabel  = format(parse(prevMonth + '-01', 'yyyy-MM-dd', new Date()), 'MMMM yyyy')

  const rows = useMemo(() => employees.map(emp => {
    const cur  = calcEarnings(emp, curAttendance,  curWorkEntries,  curDailyAtt,  curDays)
    const prev = calcEarnings(emp, prevAttendance, prevWorkEntries, prevDailyAtt, prevDays)
    const delta = cur - prev
    const pct   = prev > 0 ? (delta / prev) * 100 : null
    return { emp, cur, prev, delta, pct }
  }), [employees, curAttendance, prevAttendance, curWorkEntries, prevWorkEntries, curDailyAtt, prevDailyAtt, curDays, prevDays])

  const totalCur  = rows.reduce((s, r) => s + r.cur, 0)
  const totalPrev = rows.reduce((s, r) => s + r.prev, 0)
  const totalDelta = totalCur - totalPrev

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Month-over-Month Comparison</h1>
          <p className="mt-1 text-sm text-gray-500">{prevLabel} → {monthLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month" value={month}
            onChange={e => e.target.value && router.push(`/reports/comparison?month=${e.target.value}`)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none"
          />
          <Link href="/reports" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            ← Back to Reports
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: prevLabel, value: formatRs(totalPrev), color: 'text-gray-700' },
          { label: monthLabel, value: formatRs(totalCur), color: 'text-indigo-700' },
          {
            label: 'Change',
            value: (totalDelta >= 0 ? '+' : '-') + ' ' + formatRs(totalDelta),
            color: totalDelta >= 0 ? 'text-green-600' : 'text-red-600',
            sub: totalPrev > 0 ? `${totalDelta >= 0 ? '+' : ''}${((totalDelta / totalPrev) * 100).toFixed(1)}%` : ''
          },
        ].map(card => (
          <motion.div key={card.label} variants={row} className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            {(card as any).sub && <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{(card as any).sub}</p>}
          </motion.div>
        ))}
      </motion.div>

      {/* Per-employee table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{prevLabel}</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{monthLabel}</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Change</th>
            </tr>
          </thead>
          <motion.tbody variants={container} initial="hidden" animate="show" className="divide-y divide-gray-50">
            {rows.map(({ emp, cur, prev, delta, pct }) => (
              <motion.tr key={emp.id} variants={row} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-semibold text-gray-900">{emp.full_name}</p>
                  <p className="text-xs text-gray-400">{emp.employee_id} · {emp.worker_type}</p>
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-600">{formatRs(prev)}</td>
                <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{formatRs(cur)}</td>
                <td className="px-6 py-4 text-right text-sm">
                  <span className={`font-semibold ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {delta === 0 ? '—' : `${delta > 0 ? '+' : '-'} ${formatRs(delta)}`}
                  </span>
                  {pct !== null && delta !== 0 && (
                    <span className="block text-xs text-gray-400">{pct > 0 ? '+' : ''}{pct.toFixed(1)}%</span>
                  )}
                </td>
              </motion.tr>
            ))}
          </motion.tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
            <tr>
              <td className="px-6 py-4 text-sm font-bold text-gray-900">Total</td>
              <td className="px-6 py-4 text-right text-sm font-bold text-gray-700">{formatRs(totalPrev)}</td>
              <td className="px-6 py-4 text-right text-sm font-bold text-indigo-700">{formatRs(totalCur)}</td>
              <td className={`px-6 py-4 text-right text-sm font-bold ${totalDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalDelta >= 0 ? '+' : '-'} {formatRs(totalDelta)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}
