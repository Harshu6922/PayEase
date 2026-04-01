'use client'

import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { Search, Banknote, TrendingDown, CheckCircle, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import LogRepaymentModal from './LogRepaymentModal'
import AddAdvanceModal from './AddAdvanceModal'
import { staggerContainer, fadeInUp } from '@/lib/animations'

export interface AdvanceWithBalance {
  id: string
  employee_id: string
  company_id: string
  amount: number
  advance_date: string
  note: string | null
  repaid_total: number
  remaining: number
  employee_name: string
  employee_display_id: string
  repayments: { amount: number; repayment_date: string }[]
}

function currentMonthStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function prevMonth(m: string) {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMonth(m: string) {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(m: string) {
  const [y, mo] = m.split('-').map(Number)
  return new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

const formatRs = (n: number) =>
  '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function getStatus(adv: AdvanceWithBalance): 'pending' | 'partial' | 'settled' {
  if (adv.remaining <= 0) return 'settled'
  if (adv.repaid_total > 0) return 'partial'
  return 'pending'
}

const statusConfig = {
  pending:  { label: 'Pending',          cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  partial:  { label: 'Partially Repaid', cls: 'bg-[#bd9dff]/10 text-[#bd9dff] border border-[#bd9dff]/20' },
  settled:  { label: 'Fully Repaid',     cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
}

const avatarColor = (name: string) => {
  const colors = [
    'bg-amber-500/20 text-amber-400',
    'bg-[#bd9dff]/20 text-[#bd9dff]',
    'bg-emerald-500/20 text-emerald-400',
    'bg-indigo-500/20 text-indigo-400',
    'bg-rose-500/20 text-rose-400',
  ]
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffff
  return colors[h % colors.length]
}

type FilterKey = 'all' | 'pending' | 'partial' | 'settled'

export default function AdvancesClient({
  initialAdvances,
  companyId,
  employees,
  totalOutstanding,
  userRole = 'admin',
}: {
  initialAdvances: AdvanceWithBalance[]
  companyId: string
  employees: { id: string; full_name: string; employee_id: string }[]
  totalOutstanding: number
  userRole?: 'admin' | 'viewer'
}) {
  const supabase = createClient() as unknown as any
  const [advances, setAdvances] = useState<AdvanceWithBalance[]>(initialAdvances)
  const [repayingAdvance, setRepayingAdvance] = useState<AdvanceWithBalance | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr)

  const givenThisMonth = useMemo(() =>
    advances.filter(a => a.advance_date.startsWith(selectedMonth)).reduce((s, a) => s + a.amount, 0),
  [advances, selectedMonth])

  const recoveredThisMonth = useMemo(() =>
    advances.reduce((s, a) =>
      s + a.repayments.filter(r => r.repayment_date.startsWith(selectedMonth)).reduce((rs, r) => rs + r.amount, 0),
    0),
  [advances, selectedMonth])

  const refresh = async () => {
    const { data } = await supabase
      .from('employee_advances')
      .select(`
        id, employee_id, company_id, amount, advance_date, note,
        employees(full_name, employee_id),
        advance_repayments(amount, repayment_date)
      `)
      .eq('company_id', companyId)
      .order('advance_date', { ascending: false })

    if (data) {
      setAdvances(data.map((a: any) => {
        const repayments = (a.advance_repayments || []).map((r: any) => ({ amount: Number(r.amount), repayment_date: r.repayment_date }))
        const repaid_total = repayments.reduce((s: number, r: any) => s + r.amount, 0)
        return {
          id: a.id,
          employee_id: a.employee_id,
          company_id: a.company_id,
          amount: Number(a.amount),
          advance_date: a.advance_date,
          note: a.note,
          repaid_total,
          remaining: Number(a.amount) - repaid_total,
          employee_name: a.employees?.full_name ?? '—',
          employee_display_id: a.employees?.employee_id ?? '—',
          repayments,
        }
      }))
    }
    setRepayingAdvance(null)
    setShowAddModal(false)
  }

  const filtered = useMemo(() => {
    let rows = advances
    if (filter !== 'all') rows = rows.filter(a => getStatus(a) === filter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      rows = rows.filter(a =>
        a.employee_name.toLowerCase().includes(q) ||
        a.employee_display_id.toLowerCase().includes(q)
      )
    }
    return rows
  }, [advances, filter, searchQuery])

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'partial', label: 'Partial' },
    { key: 'settled', label: 'Settled' },
  ]

  return (
    <div className="min-h-screen bg-[#100b1f] pb-20">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed top-[-10%] left-[-10%] w-[60%] h-[60%] z-0"
        style={{ background: 'radial-gradient(circle, rgba(189,157,255,0.06) 0%, transparent 70%)' }}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-16">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight text-[#ebe1fe]">
              Advances
            </h1>
            <p className="mt-2 text-[#afa7c2] text-sm">Track and manage employee salary advances</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Month navigator */}
            <div className="flex items-center gap-1 rounded-xl px-2 py-1.5" style={{ background: 'rgba(28,22,46,0.7)', border: '1px solid rgba(189,157,255,0.12)' }}>
              <button
                onClick={() => setSelectedMonth(m => prevMonth(m))}
                className="p-1.5 rounded-lg text-[#afa7c2] hover:text-[#ebe1fe] hover:bg-[#bd9dff]/10 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-[#ebe1fe] min-w-[130px] text-center">
                {formatMonthLabel(selectedMonth)}
              </span>
              <button
                onClick={() => setSelectedMonth(m => nextMonth(m))}
                disabled={selectedMonth >= currentMonthStr()}
                className="p-1.5 rounded-lg text-[#afa7c2] hover:text-[#ebe1fe] hover:bg-[#bd9dff]/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {userRole === 'admin' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:shadow-[0_0_20px_rgba(189,157,255,0.3)] active:scale-95"
                style={{ background: 'rgba(178,140,255,0.15)', border: '1px solid rgba(189,157,255,0.25)', color: '#bd9dff' }}
              >
                <Plus className="h-4 w-4" />
                Give Advance
              </button>
            )}
          </div>
        </header>

        {/* Stat cards */}
        <motion.section
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12"
        >
          <motion.div variants={fadeInUp} className="p-6 rounded-2xl relative overflow-hidden"
            style={{ background: 'rgba(28,22,46,0.6)', backdropFilter: 'blur(24px)', border: '1px solid rgba(189,157,255,0.1)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A847]/5 blur-3xl rounded-full pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#afa7c2] text-sm font-medium">Total Outstanding</span>
              <div className="p-2 rounded-lg" style={{ background: 'rgba(212,168,71,0.1)' }}>
                <Banknote className="h-4 w-4 text-[#D4A847]" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#D4A847]">{formatRs(totalOutstanding)}</div>
            <p className="text-[#afa7c2] text-xs mt-1">Across all employees</p>
          </motion.div>

          <motion.div variants={fadeInUp} className="p-6 rounded-2xl relative overflow-hidden"
            style={{ background: 'rgba(28,22,46,0.6)', backdropFilter: 'blur(24px)', border: '1px solid rgba(189,157,255,0.1)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#bd9dff]/5 blur-3xl rounded-full pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#afa7c2] text-sm font-medium">Given in {formatMonthLabel(selectedMonth).split(' ')[0]}</span>
              <div className="p-2 rounded-lg" style={{ background: 'rgba(189,157,255,0.1)' }}>
                <TrendingDown className="h-4 w-4 text-[#bd9dff]" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#bd9dff]">{formatRs(givenThisMonth)}</div>
            <p className="text-[#afa7c2] text-xs mt-1">{formatMonthLabel(selectedMonth)}</p>
          </motion.div>

          <motion.div variants={fadeInUp} className="p-6 rounded-2xl relative overflow-hidden"
            style={{ background: 'rgba(28,22,46,0.6)', backdropFilter: 'blur(24px)', border: '1px solid rgba(189,157,255,0.1)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#afa7c2] text-sm font-medium">Recovered in {formatMonthLabel(selectedMonth).split(' ')[0]}</span>
              <div className="p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)' }}>
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-emerald-400">{formatRs(recoveredThisMonth)}</div>
            <p className="text-[#afa7c2] text-xs mt-1">{formatMonthLabel(selectedMonth)}</p>
          </motion.div>
        </motion.section>

        {/* Table card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(28,22,46,0.6)', backdropFilter: 'blur(24px)', border: '1px solid rgba(189,157,255,0.1)' }}
        >
          {/* Toolbar */}
          <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#4b455c]/20">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-[#ebe1fe]">Advance Records</h2>
              {/* Filter pills */}
              <div className="flex gap-2">
                {filters.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      filter === f.key
                        ? 'bg-[#bd9dff] text-[#100b1f]'
                        : 'text-[#afa7c2] hover:text-[#ebe1fe]'
                    }`}
                    style={filter !== f.key ? { background: 'rgba(189,157,255,0.06)', border: '1px solid rgba(189,157,255,0.1)' } : {}}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Search */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(189,157,255,0.05)', border: '1px solid rgba(189,157,255,0.1)' }}
            >
              <Search className="h-4 w-4 text-[#afa7c2] flex-shrink-0" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-[#ebe1fe] text-sm placeholder:text-[#afa7c2]/50 w-44"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="text-[#afa7c2] text-[11px] font-bold tracking-widest uppercase border-b border-[#4b455c]/10">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Outstanding</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#4b455c]/10">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Banknote className="h-10 w-10 text-[#afa7c2]/30" />
                        <p className="text-sm text-[#afa7c2]">
                          {searchQuery || filter !== 'all' ? 'No advances match your filters.' : 'No advances recorded yet.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(adv => {
                    const status = getStatus(adv)
                    const sc = statusConfig[status]
                    return (
                      <tr key={adv.id} className="hover:bg-[#bd9dff]/[0.03] transition-colors">
                        {/* Employee */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${avatarColor(adv.employee_name)}`}>
                              {getInitials(adv.employee_name)}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-[#ebe1fe]">{adv.employee_name}</p>
                              <p className="font-mono text-[10px] text-[#afa7c2] uppercase tracking-widest">{adv.employee_display_id}</p>
                            </div>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-6 py-4 text-right font-bold text-sm text-[#ebe1fe]">
                          {formatRs(adv.amount)}
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4 text-sm text-[#afa7c2]">
                          {format(new Date(adv.advance_date + 'T00:00:00'), 'dd MMM yyyy')}
                          {adv.note && (
                            <p className="text-[10px] text-[#afa7c2]/60 italic truncate max-w-[140px]">{adv.note}</p>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${sc.cls}`}>
                            {sc.label}
                          </span>
                        </td>

                        {/* Outstanding */}
                        <td className="px-6 py-4 text-right font-semibold text-sm">
                          {status === 'settled'
                            ? <span className="text-[#afa7c2]">₹0</span>
                            : <span className="text-[#ebe1fe]">{formatRs(adv.remaining)}</span>
                          }
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-center">
                          {status === 'settled' ? (
                            <CheckCircle className="h-5 w-5 text-emerald-400/40 mx-auto" />
                          ) : userRole === 'admin' ? (
                            <button
                              onClick={() => setRepayingAdvance(adv)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#bd9dff] hover:text-[#100b1f] hover:bg-[#bd9dff] transition-all"
                              style={{ border: '1px solid rgba(189,157,255,0.3)' }}
                            >
                              Repay
                            </button>
                          ) : (
                            <span className="text-[#afa7c2] text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#4b455c]/20 flex items-center justify-between">
            <span className="text-xs text-[#afa7c2]">
              Showing {filtered.length} of {advances.length} records
            </span>
          </div>
        </motion.div>

      </main>

      {/* Modals */}
      <AnimatePresence>
        {repayingAdvance && (
          <LogRepaymentModal
            advanceId={repayingAdvance.id}
            employeeId={repayingAdvance.employee_id}
            companyId={companyId}
            remaining={repayingAdvance.remaining}
            onSaved={refresh}
            onClose={() => setRepayingAdvance(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <AddAdvanceModal
            employees={employees}
            companyId={companyId}
            onSaved={refresh}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
