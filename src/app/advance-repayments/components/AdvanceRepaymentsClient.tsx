'use client'

import { format } from 'date-fns'
import { motion } from 'framer-motion'

export interface RepaymentRow {
  id: string
  amount: number
  repayment_date: string
  method: string
  note: string | null
  advance_amount: number
  advance_date: string | null
  employee_name: string
  employee_display_id: string
}

const formatRs = (n: number) =>
  'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const row = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } } }

const methodLabel: Record<string, string> = {
  salary_deduction: 'Salary Deduction',
  cash: 'Cash',
}

export default function AdvanceRepaymentsClient({ repayments }: { repayments: RepaymentRow[] }) {
  if (repayments.length === 0) {
    return (
      <div className="rounded-xl border bg-white dark:bg-gray-800 shadow-sm px-6 py-16 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">No advance repayments recorded yet.</p>
        <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Repayments are created automatically when salary is paid in full.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        <span>Employee</span>
        <span>Original Advance</span>
        <span>Repaid On</span>
        <span>Method</span>
        <span className="text-right">Amount</span>
      </div>

      <motion.div variants={container} initial="hidden" animate="show">
        {repayments.map(r => (
          <motion.div
            key={r.id}
            variants={row}
            className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 items-center px-6 py-4 border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{r.employee_name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{r.employee_display_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{formatRs(r.advance_amount)}</p>
              {r.advance_date && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  given {format(new Date(r.advance_date + 'T00:00:00'), 'dd MMM yyyy')}
                </p>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              {format(new Date(r.repayment_date + 'T00:00:00'), 'dd MMM yyyy')}
            </p>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
              r.method === 'salary_deduction'
                ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            }`}>
              {methodLabel[r.method] ?? r.method}
            </span>
            <p className="text-sm font-bold text-gray-900 dark:text-white text-right whitespace-nowrap">
              {formatRs(r.amount)}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
