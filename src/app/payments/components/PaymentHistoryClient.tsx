'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parse } from 'date-fns'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Search, Banknote, Users, TrendingUp, X } from 'lucide-react'
import { fadeInUp, staggerContainer } from '@/lib/animations'

interface Employee { id: string; full_name: string; employee_id: string; worker_type: string }
interface SalaryPayment { id: string; employee_id: string; amount: number; payment_date: string; note: string | null; month: string }
interface Advance { id: string; employee_id: string; amount: number; advance_date: string; note: string | null }

interface Props {
  month: string
  payments: SalaryPayment[]
  advances: Advance[]
  employees: Employee[]
}

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

const formatRs = (n: number) =>
  '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })

const avatarColors = [
  'bg-[#bd9dff]/20 text-[#bd9dff]',
  'bg-amber-500/20 text-amber-400',
  'bg-emerald-500/20 text-emerald-400',
  'bg-indigo-500/20 text-indigo-400',
  'bg-rose-500/20 text-rose-400',
]
const avatarColor = (name: string) => {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffff
  return avatarColors[h % avatarColors.length]
}

const workerTypeBadge: Record<string, string> = {
  salaried:   'bg-[#4b4168] text-[#d7c9f9]',
  commission: 'bg-[#28213e] text-[#afa7c2]',
  daily:      'bg-[#2f2747] text-[#ebe1fe]',
}

const glassCard: React.CSSProperties = {
  background: 'rgba(28,22,46,0.6)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(189,157,255,0.1)',
}

type TypeFilter = 'all' | 'salary' | 'advance'
type WorkerFilter = 'all' | 'salaried' | 'commission' | 'daily'

export default function PaymentHistoryClient({ month, payments, advances, employees }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [workerFilter, setWorkerFilter] = useState<WorkerFilter>('all')

  const empMap = useMemo(() => {
    const m: Record<string, Employee> = {}
    employees.forEach(e => { m[e.id] = e })
    return m
  }, [employees])

  const monthLabel = format(parse(month + '-01', 'yyyy-MM-dd', new Date()), 'MMMM yyyy')

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
  const uniqueEmpsPaid = new Set(payments.map(p => p.employee_id)).size

  const byWorkerType = useMemo(() => {
    const totals: Record<string, number> = { salaried: 0, commission: 0, daily: 0 }
    entries.forEach(e => {
      const wt = empMap[e.employee_id]?.worker_type
      if (wt && wt in totals) totals[wt] += e.amount
    })
    return totals
  }, [entries, empMap])

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

  const filteredTotal = filteredEntries.reduce((s, e) => s + e.amount, 0)

  const handleMonthChange = (delta: number) => {
    const d = parse(month + '-01', 'yyyy-MM-dd', new Date())
    d.setMonth(d.getMonth() + delta)
    router.push(`/payments?month=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const hasFilters = search || typeFilter !== 'all' || workerFilter !== 'all'

  return (
    <div className="min-h-screen pb-20" style={{ background: '#0F0A1E' }}>
      {/* Ambient glow */}
      <div className="pointer-events-none fixed top-[-10%] left-[-10%] w-[60%] h-[60%] z-0"
        style={{ background: 'radial-gradient(circle, rgba(189,157,255,0.06) 0%, transparent 70%)' }} />

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-16">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight text-[#ebe1fe]">
              Payment History
            </h1>
            <p className="mt-2 text-[#afa7c2] text-sm">Record of all salary payments and advances</p>
          </div>

          {/* Month nav */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl" style={glassCard}>
            <button onClick={() => handleMonthChange(-1)}
              className="p-2 rounded-xl text-[#bd9dff] hover:bg-white/5 transition-all active:scale-90">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="px-5 py-2 rounded-xl font-bold text-sm text-[#bd9dff] min-w-[140px] text-center"
              style={{ background: 'rgba(189,157,255,0.1)', border: '1px solid rgba(189,157,255,0.2)' }}>
              {monthLabel}
            </div>
            <button onClick={() => handleMonthChange(1)}
              className="p-2 rounded-xl text-[#bd9dff] hover:bg-white/5 transition-all active:scale-90">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Stat cards */}
        <motion.section variants={staggerContainer} initial="hidden" animate="visible"
          className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">

          <motion.div variants={fadeInUp} className="p-6 rounded-2xl relative overflow-hidden" style={glassCard}>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#D4A847]/10 blur-3xl rounded-full pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <p className="text-[#afa7c2] text-[10px] font-bold uppercase tracking-widest">Total Paid</p>
              <div className="p-2 rounded-lg" style={{ background: 'rgba(212,168,71,0.1)' }}>
                <Banknote className="h-4 w-4 text-[#D4A847]" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-[#D4A847]">{formatRs(totalPaid)}</h3>
            <div className="mt-3 flex items-center gap-2 text-[#afa7c2] text-xs">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Salary {formatRs(totalSalary)} · Advances {formatRs(totalAdvances)}</span>
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} className="p-6 rounded-2xl relative overflow-hidden" style={glassCard}>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <p className="text-[#afa7c2] text-[10px] font-bold uppercase tracking-widest">Employees Paid</p>
              <div className="p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)' }}>
                <Users className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-emerald-400">{uniqueEmpsPaid}</h3>
            <p className="text-[#afa7c2] text-xs mt-3">Salary payments recorded</p>
          </motion.div>

          <motion.div variants={fadeInUp} className="p-6 rounded-2xl relative overflow-hidden" style={glassCard}>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <p className="text-[#afa7c2] text-[10px] font-bold uppercase tracking-widest">Advances Given</p>
              <div className="p-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.1)' }}>
                <Banknote className="h-4 w-4 text-amber-400" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-amber-400">{advances.length}</h3>
            <p className="text-[#afa7c2] text-xs mt-3">{formatRs(totalAdvances)} total advances</p>
          </motion.div>
        </motion.section>

        {/* By worker type row */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Salaried', key: 'salaried', color: 'text-[#bd9dff]', dot: 'bg-[#bd9dff]' },
            { label: 'Commission', key: 'commission', color: 'text-[#afa7c2]', dot: 'bg-[#afa7c2]' },
            { label: 'Daily', key: 'daily', color: 'text-[#D4A847]', dot: 'bg-[#D4A847]' },
          ].map(c => (
            <div key={c.key} className="p-4 rounded-2xl flex items-center gap-3" style={glassCard}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
              <div>
                <p className="text-[10px] text-[#afa7c2] uppercase tracking-widest font-bold">{c.label}</p>
                <p className={`text-base font-bold mt-0.5 ${c.color}`}>{formatRs(byWorkerType[c.key] ?? 0)}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Table card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl overflow-hidden" style={glassCard}>

          {/* Toolbar */}
          <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#4b455c]/20">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-[#ebe1fe]">Payment Records</h2>
              {/* Type filter pills */}
              {(['all', 'salary', 'advance'] as TypeFilter[]).map(f => (
                <button key={f}
                  onClick={() => setTypeFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    typeFilter === f ? 'bg-[#bd9dff] text-[#0F0A1E]' : 'text-[#afa7c2] hover:text-[#ebe1fe]'
                  }`}
                  style={typeFilter !== f ? { background: 'rgba(189,157,255,0.06)', border: '1px solid rgba(189,157,255,0.1)' } : {}}>
                  {f === 'all' ? 'All' : f === 'salary' ? 'Salary' : 'Advances'}
                </button>
              ))}
              {/* Worker filter pills */}
              {(['all', 'salaried', 'commission', 'daily'] as WorkerFilter[]).map(f => (
                f !== 'all' && (
                  <button key={f}
                    onClick={() => setWorkerFilter(wf => wf === f ? 'all' : f)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      workerFilter === f ? 'bg-[#bd9dff] text-[#0F0A1E]' : 'text-[#afa7c2] hover:text-[#ebe1fe]'
                    }`}
                    style={workerFilter !== f ? { background: 'rgba(189,157,255,0.06)', border: '1px solid rgba(189,157,255,0.1)' } : {}}>
                    {f}
                  </button>
                )
              ))}
              {hasFilters && (
                <button onClick={() => { setSearch(''); setTypeFilter('all'); setWorkerFilter('all') }}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-red-400 hover:text-red-300 transition-colors"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(189,157,255,0.05)', border: '1px solid rgba(189,157,255,0.1)' }}>
              <Search className="h-4 w-4 text-[#afa7c2] flex-shrink-0" />
              <input type="text" placeholder="Search employee..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-[#ebe1fe] text-sm placeholder:text-[#afa7c2]/50 w-44" />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[680px]">
              <thead>
                <tr className="text-[#afa7c2] text-[11px] font-bold tracking-widest uppercase border-b border-[#4b455c]/10">
                  <th className="px-8 py-5">Employee</th>
                  <th className="px-8 py-5 text-right">Amount</th>
                  <th className="px-8 py-5">Date</th>
                  <th className="px-8 py-5 text-center">Type</th>
                  <th className="px-8 py-5 text-center">Worker</th>
                  <th className="px-8 py-5">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#4b455c]/10">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Banknote className="h-10 w-10 text-[#afa7c2]/30" />
                        <p className="text-sm text-[#afa7c2]">No payments match your filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map(entry => {
                    const emp = empMap[entry.employee_id]
                    return (
                      <tr key={entry.type + entry.id} className="hover:bg-[#bd9dff]/[0.03] transition-colors group">
                        {/* Employee */}
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${emp ? avatarColor(emp.full_name) : 'bg-[#afa7c2]/20 text-[#afa7c2]'}`}>
                              {emp ? initials(emp.full_name) : '?'}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-[#ebe1fe]">{emp?.full_name ?? 'Unknown'}</p>
                              <p className="font-mono text-[10px] text-[#afa7c2] uppercase tracking-widest">{emp?.employee_id ?? '—'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-8 py-5 text-right font-bold text-[#D4A847]">
                          {formatRs(entry.amount)}
                        </td>

                        {/* Date */}
                        <td className="px-8 py-5 text-sm text-[#afa7c2]">
                          {format(new Date(entry.date + 'T00:00:00'), 'dd MMM yyyy')}
                        </td>

                        {/* Type badge */}
                        <td className="px-8 py-5 text-center">
                          {entry.type === 'salary' ? (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[#bd9dff]/10 text-[#bd9dff] border border-[#bd9dff]/20">
                              Salary
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Advance
                            </span>
                          )}
                        </td>

                        {/* Worker type */}
                        <td className="px-8 py-5 text-center">
                          {emp ? (
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${workerTypeBadge[emp.worker_type] ?? 'bg-[#28213e] text-[#afa7c2]'}`}>
                              {emp.worker_type}
                            </span>
                          ) : <span className="text-[#afa7c2]/40">—</span>}
                        </td>

                        {/* Note */}
                        <td className="px-8 py-5 text-sm text-[#afa7c2] italic max-w-[160px] truncate">
                          {entry.note || <span className="text-[#afa7c2]/30 not-italic">—</span>}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>

              {filteredEntries.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-[#bd9dff]/10" style={{ background: 'rgba(189,157,255,0.03)' }}>
                    <td className="px-8 py-5 text-sm font-bold text-[#afa7c2] uppercase tracking-wider">
                      Page Total ({filteredEntries.length} entries)
                    </td>
                    <td className="px-8 py-5 text-right text-xl font-extrabold text-[#D4A847]">
                      {formatRs(filteredTotal)}
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="px-8 py-5 border-t border-[#4b455c]/20 flex items-center justify-between">
            <p className="text-[#afa7c2] text-sm font-medium">
              Showing {filteredEntries.length} of {entries.length} entries
            </p>
          </div>
        </motion.div>

      </main>
    </div>
  )
}
