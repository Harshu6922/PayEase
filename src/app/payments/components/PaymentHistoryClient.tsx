'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parse } from 'date-fns'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import WorkerTypeBadge from '@/components/WorkerTypeBadge'

interface Employee { id: string; full_name: string; employee_id: string; worker_type: string }
interface SalaryPayment { id: string; employee_id: string; amount: number; payment_date: string; note: string | null; month: string }
interface Advance { id: string; employee_id: string; amount: number; advance_date: string; note: string | null }

interface Props {
  month: string
  payments: SalaryPayment[]
  advances: Advance[]
  employees: Employee[]
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const row = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } } }

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

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

  const handleMonthChange = (delta: number) => {
    const d = parse(month + '-01', 'yyyy-MM-dd', new Date())
    d.setMonth(d.getMonth() + delta)
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    router.push(`/payments?month=${newMonth}`)
  }

  const hasFilters = search || typeFilter !== 'all' || workerFilter !== 'all'

  return (
    <div className="flex flex-col min-h-screen bg-background">

      {/* ── Page Header ── */}
      <div className="px-4 md:px-6 pt-6 pb-4 border-b border-[#7C3AED]/10 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Payments</h1>

        {/* Month selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleMonthChange(-1)}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-text"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-text min-w-[110px] text-center">{monthLabel}</span>
          <button
            onClick={() => handleMonthChange(1)}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-text"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-4 md:px-6 py-5 flex flex-col gap-5">

        {/* ── Summary Cards ── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {[
            { label: 'Total Paid Out', value: totalPaid, valueClass: 'text-text' },
            { label: 'Salary Payments', value: totalSalary, valueClass: 'text-primary-light' },
            { label: 'Advances Given', value: totalAdvances, valueClass: 'text-warning' },
          ].map(card => (
            <motion.div
              key={card.label}
              variants={fadeInUp}
              className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl p-4 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] hover:border-[#7C3AED]/50 transition-all"
            >
              <p className="text-xs text-text-muted uppercase tracking-wide mb-2">{card.label}</p>
              <p className={`text-xl font-mono font-bold ${card.valueClass}`}>{formatRs(card.value)}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── By Worker Type ── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {[
            { label: 'Salaried Workers', key: 'salaried', valueClass: 'text-primary-light' },
            { label: 'Commission Workers', key: 'commission', valueClass: 'text-[#A855F7]' },
            { label: 'Daily Workers', key: 'daily', valueClass: 'text-rupee-gold' },
          ].map(card => (
            <motion.div
              key={card.key}
              variants={fadeInUp}
              className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl p-4 flex items-center gap-4 hover:border-[#7C3AED]/50 transition-all"
            >
              <div className="w-2 h-2 rounded-full bg-current flex-shrink-0" style={{ color: 'inherit' }} />
              <div>
                <p className="text-xs text-text-muted">{card.label}</p>
                <p className={`text-lg font-mono font-bold mt-0.5 ${card.valueClass}`}>
                  {formatRs(byWorkerType[card.key] ?? 0)}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Search + Filters ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search employee name or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-[#7C3AED]/20 text-text text-sm placeholder:text-text-muted focus:outline-none focus:border-[#7C3AED]/50 focus:bg-white/8 transition-all"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
            className="rounded-lg bg-white/5 border border-[#7C3AED]/20 px-3 py-2 text-sm text-text focus:outline-none focus:border-[#7C3AED]/50 transition-all appearance-none cursor-pointer"
          >
            <option value="all" className="bg-surface">All types</option>
            <option value="salary" className="bg-surface">Salary only</option>
            <option value="advance" className="bg-surface">Advances only</option>
          </select>
          <select
            value={workerFilter}
            onChange={e => setWorkerFilter(e.target.value as typeof workerFilter)}
            className="rounded-lg bg-white/5 border border-[#7C3AED]/20 px-3 py-2 text-sm text-text focus:outline-none focus:border-[#7C3AED]/50 transition-all appearance-none cursor-pointer"
          >
            <option value="all" className="bg-surface">All workers</option>
            <option value="salaried" className="bg-surface">Salaried</option>
            <option value="commission" className="bg-surface">Commission</option>
            <option value="daily" className="bg-surface">Daily</option>
          </select>
        </div>

        {/* ── Transaction Count + Clear Filters ── */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            {filteredEntries.length} transaction{filteredEntries.length !== 1 ? 's' : ''}
            {filteredEntries.length !== entries.length && (
              <span className="text-text-muted/60"> (filtered from {entries.length})</span>
            )}
          </p>
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setTypeFilter('all'); setWorkerFilter('all') }}
              className="flex items-center gap-1.5 text-xs text-primary-light hover:text-primary transition-colors font-medium"
            >
              <X className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}
        </div>

        {/* ── Entry Cards ── */}
        {filteredEntries.length === 0 ? (
          <div className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl px-6 py-16 text-center text-sm text-text-muted">
            No payments match your filters.
          </div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-3"
          >
            {filteredEntries.map(entry => {
              const emp = empMap[entry.employee_id]
              const workerType = emp
                ? (emp.worker_type.charAt(0).toUpperCase() + emp.worker_type.slice(1)) as 'Salaried' | 'Daily' | 'Commission'
                : null
              return (
                <motion.div
                  key={entry.type + entry.id}
                  variants={row}
                  className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-[#7C3AED]/40 hover:bg-white/[0.07] transition-all"
                >
                  {/* Left: avatar + name + badge */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/20 text-primary-light text-sm font-semibold flex items-center justify-center flex-shrink-0">
                      {emp ? initials(emp.full_name) : '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-text truncate">
                          {emp?.full_name ?? 'Unknown'}
                        </span>
                        {emp && (
                          <span className="text-xs text-text-muted">{emp.employee_id}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {workerType && <WorkerTypeBadge type={workerType} />}
                        <span className={`text-xs font-medium ${entry.type === 'salary' ? 'text-primary-light' : 'text-warning'}`}>
                          {entry.type === 'salary' ? 'Salary' : 'Advance'}
                        </span>
                        <span className="text-xs text-text-muted">
                          {format(new Date(entry.date + 'T00:00:00'), 'dd MMM yyyy')}
                        </span>
                        {entry.note && (
                          <span className="text-xs text-text-muted italic truncate max-w-[120px]">{entry.note}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: amount */}
                  <span className="font-mono text-lg font-bold text-rupee-gold whitespace-nowrap flex-shrink-0">
                    {formatRs(entry.amount)}
                  </span>
                </motion.div>
              )
            })}
          </motion.div>
        )}

      </div>
    </div>
  )
}
