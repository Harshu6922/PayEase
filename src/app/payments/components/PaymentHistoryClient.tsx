'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parse } from 'date-fns'
import { motion } from 'framer-motion'

interface Employee { id: string; full_name: string; employee_id: string; worker_type: string }
interface SalaryPayment { id: string; employee_id: string; amount: number; payment_date: string; note: string | null; month: string }
interface Advance { id: string; employee_id: string; amount: number; advance_date: string; note: string | null }

interface Props {
  month: string
  payments: SalaryPayment[]
  advances: Advance[]
  employees: Employee[]
}

const workerTypeBadge: Record<string, string> = {
  salaried:   'bg-indigo-50 text-indigo-700',
  commission: 'bg-amber-50 text-amber-700',
  daily:      'bg-green-50 text-green-700',
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const row = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } } }

export default function PaymentHistoryClient({ month, payments, advances, employees }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'salary' | 'advance'>('all')
  const [workerFilter, setWorkerFilter] = useState<'all' | 'salaried' | 'commission' | 'daily'>('all')

  const empMap = useMemo(() => {
    const m: Record<string, Employee> = {}
    employees.forEach(e => { m[e.id] = e })
    return m
  }, [employees])

  const monthLabel = format(parse(month + '-01', 'yyyy-MM-dd', new Date()), 'MMMM yyyy')

  // Combine salary payments + advances into one sorted list
  const entries = useMemo(() => {
    const list: { id: string; type: 'salary' | 'advance'; employee_id: string; amount: number; date: string; note: string | null }[] = [
      ...payments.map(p => ({ id: p.id, type: 'salary' as const, employee_id: p.employee_id, amount: Number(p.amount), date: p.payment_date, note: p.note })),
      ...advances.map(a => ({ id: a.id, type: 'advance' as const, employee_id: a.employee_id, amount: Number(a.amount), date: a.advance_date, note: a.note })),
    ]
    return list.sort((a, b) => b.date.localeCompare(a.date))
  }, [payments, advances])

  const totalSalary   = payments.reduce((s, p) => s + Number(p.amount), 0)
  const totalAdvances = advances.reduce((s, a) => s + Number(a.amount), 0)
  const totalPaid     = totalSalary + totalAdvances

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const emp = empMap[e.employee_id]
      if (typeFilter !== 'all' && e.type !== typeFilter) return false
      if (workerFilter !== 'all' && emp?.worker_type !== workerFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!emp?.full_name.toLowerCase().includes(q) && !emp?.employee_id.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [entries, empMap, search, typeFilter, workerFilter])

  const byWorkerType = useMemo(() => {
    const totals: Record<string, number> = { salaried: 0, commission: 0, daily: 0 }
    entries.forEach(e => {
      const wt = empMap[e.employee_id]?.worker_type
      if (wt && wt in totals) totals[wt] += e.amount
    })
    return totals
  }, [entries, empMap])

  const formatRs = (n: number) =>
    'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) router.push(`/payments?month=${e.target.value}`)
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
          <p className="mt-1 text-sm text-gray-500">All salary payments and advances for {monthLabel}</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={handleMonthChange}
          className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      {/* Summary cards */}
      <motion.div
        variants={container} initial="hidden" animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4"
      >
        {[
          { label: 'Total Paid Out', value: formatRs(totalPaid), color: 'text-gray-900', sub: 'All types combined' },
          { label: 'Salary Payments', value: formatRs(totalSalary), color: 'text-indigo-600', sub: 'From payments table' },
          { label: 'Advances Given', value: formatRs(totalAdvances), color: 'text-amber-600', sub: 'Advance disbursements' },
        ].map(card => (
          <motion.div key={card.label} variants={row} className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* By worker type */}
      <motion.div
        variants={container} initial="hidden" animate="show"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
      >
        {[
          { label: 'Salaried Workers', key: 'salaried', color: 'text-indigo-700', bg: 'bg-indigo-50', dot: 'bg-indigo-500' },
          { label: 'Commission Workers', key: 'commission', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
          { label: 'Daily Workers', key: 'daily', color: 'text-green-700', bg: 'bg-green-50', dot: 'bg-green-500' },
        ].map(card => (
          <motion.div key={card.key} variants={row}
            className={`rounded-xl border p-5 shadow-sm flex items-center gap-4 ${card.bg}`}
          >
            <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${card.dot}`} />
            <div>
              <p className="text-xs font-medium text-gray-500">{card.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${card.color}`}>{formatRs(byWorkerType[card.key] ?? 0)}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search employee name or ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 shadow-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All types</option>
          <option value="salary">Salary only</option>
          <option value="advance">Advances only</option>
        </select>
        <select
          value={workerFilter}
          onChange={e => setWorkerFilter(e.target.value as typeof workerFilter)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 shadow-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All workers</option>
          <option value="salaried">Salaried</option>
          <option value="commission">Commission</option>
          <option value="daily">Daily</option>
        </select>
      </div>

      {/* Entries table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            {filteredEntries.length} transaction{filteredEntries.length !== 1 ? 's' : ''}
            {filteredEntries.length !== entries.length && (
              <span className="text-gray-400 font-normal"> (filtered from {entries.length})</span>
            )}
          </h2>
          {(search || typeFilter !== 'all' || workerFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setTypeFilter('all'); setWorkerFilter('all') }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>

        {filteredEntries.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            No payments match your filters.
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show">
            {filteredEntries.map(entry => {
              const emp = empMap[entry.employee_id]
              return (
                <motion.div
                  key={entry.type + entry.id}
                  variants={row}
                  className="flex items-center justify-between px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Type indicator */}
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      entry.type === 'salary' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {entry.type === 'salary' ? '₹' : 'A'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {emp?.full_name ?? 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-400">{emp?.employee_id}</span>
                        {emp && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${workerTypeBadge[emp.worker_type] ?? 'bg-gray-100 text-gray-600'}`}>
                            {emp.worker_type}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-medium ${entry.type === 'salary' ? 'text-indigo-600' : 'text-amber-600'}`}>
                          {entry.type === 'salary' ? 'Salary Payment' : 'Advance'}
                        </span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-400">
                          {format(new Date(entry.date + 'T00:00:00'), 'dd MMM yyyy')}
                        </span>
                        {entry.note && (
                          <>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 italic truncate">{entry.note}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="text-sm font-bold text-gray-900 dark:text-white ml-4 whitespace-nowrap">
                    {formatRs(entry.amount)}
                  </span>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>
    </>
  )
}
