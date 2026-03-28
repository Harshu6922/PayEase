'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, parse } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, Settings2, CalendarPlus, ChevronLeft, ChevronRight, Search, Download, Receipt } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { downloadPdf } from '@/lib/pdf-utils'
import ExpenseModal from './ExpenseModal'
import DeleteConfirm from './DeleteConfirm'
import TemplatesModal from './TemplatesModal'
import { staggerContainer, fadeInUp } from '@/lib/animations'
import type { ExpenseTemplate } from '@/types'

export interface Expense {
  id: string
  company_id: string
  date: string
  category: string
  description: string
  amount: number
  paid_to: string | null
  note: string | null
}

export const CATEGORIES = ['Factory', 'Household', 'Utilities', 'Salary', 'Maintenance', 'Other']

const CATEGORY_COLORS: Record<string, string> = {
  Factory:     'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  Household:   'bg-[#bd9dff]/10 text-[#bd9dff] border border-[#bd9dff]/20',
  Utilities:   'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  Salary:      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  Maintenance: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  Other:       'bg-[#afa7c2]/10 text-[#afa7c2] border border-[#afa7c2]/20',
}

function formatRs(n: number) {
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function navigateMonth(month: string, direction: 1 | -1): string {
  const [year, mon] = month.split('-').map(Number)
  const d = new Date(year, mon - 1 + direction, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const glassCard = {
  background: 'rgba(28,22,46,0.6)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(189,157,255,0.1)',
} as React.CSSProperties

export default function ExpensesManager({
  month, companyId, initialExpenses, initialTemplates, userRole = 'admin'
}: {
  month: string
  companyId: string
  initialExpenses: Expense[]
  initialTemplates: ExpenseTemplate[]
  userRole?: 'admin' | 'viewer'
}) {
  const router = useRouter()
  const supabase = createClient() as unknown as any

  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [templates, setTemplates] = useState<ExpenseTemplate[]>(initialTemplates)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<string | null>(null)

  const monthLabel = format(parse(month + '-01', 'yyyy-MM-dd', new Date()), 'MMMM yyyy')

  const allCategories = useMemo(() => {
    const cats = new Set(expenses.map(e => e.category))
    CATEGORIES.forEach(c => cats.add(c))
    return Array.from(cats).sort()
  }, [expenses])

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {}
    expenses.forEach(e => { map[e.category] = (map[e.category] ?? 0) + Number(e.amount) })
    return map
  }, [expenses])

  const grandTotal = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses])

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(expenses.map(e => e.category))).length
  }, [expenses])

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!e.description.toLowerCase().includes(q) &&
            !(e.paid_to ?? '').toLowerCase().includes(q) &&
            !(e.note ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [expenses, categoryFilter, search])

  const handleSaved = (expense: Expense) => {
    setExpenses(prev => {
      const idx = prev.findIndex(e => e.id === expense.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = expense
        return updated.sort((a, b) => b.date.localeCompare(a.date))
      }
      return [expense, ...prev].sort((a, b) => b.date.localeCompare(a.date))
    })
    setModalOpen(false)
    setEditing(null)
  }

  const handleDelete = async () => {
    if (!deleting) return
    await supabase.from('expenses').delete().eq('id', deleting.id)
    setExpenses(prev => prev.filter(e => e.id !== deleting.id))
    setDeleting(null)
  }

  const handleApplyTemplates = async () => {
    if (templates.length === 0) return
    setApplying(true)
    setApplyResult(null)
    const [year, mon] = month.split('-').map(Number)
    const today = new Date()
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === mon
    const lastDay = new Date(year, mon, 0).getDate()
    const applyDate = isCurrentMonth ? today.toISOString().split('T')[0] : `${month}-${String(lastDay).padStart(2, '0')}`
    const startDate = `${month}-01`
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`
    const { data: existing } = await supabase
      .from('expenses').select('template_id')
      .eq('company_id', companyId)
      .gte('date', startDate).lte('date', endDate)
      .not('template_id', 'is', null)
    const appliedTemplateIds = new Set((existing || []).map((e: any) => e.template_id))
    const toInsert = templates.filter(t => !appliedTemplateIds.has(t.id))
    const skipped = templates.length - toInsert.length
    if (toInsert.length > 0) {
      const payload = toInsert.map(t => ({
        company_id: companyId, date: applyDate, category: t.category,
        description: t.description, amount: t.amount, paid_to: t.paid_to,
        note: t.note, template_id: t.id,
      }))
      const { data: inserted, error: insertErr } = await supabase.from('expenses').insert(payload).select('*')
      if (insertErr) { setApplyResult(`Error: ${insertErr.message}`); setApplying(false); return }
      if (inserted) setExpenses(prev => [...prev, ...inserted].sort((a, b) => b.date.localeCompare(a.date)))
    }
    setApplyResult(`${toInsert.length} added${skipped > 0 ? `, ${skipped} skipped` : ''}`)
    setApplying(false)
  }

  const handleExportPdf = async () => {
    setExportingPdf(true)
    try {
      const [{ default: ExpensesPDF }, { pdf }] = await Promise.all([
        import('@/components/pdf/ExpensesPDF'),
        import('@react-pdf/renderer'),
      ])
      const { data: companyData } = await supabase.from('companies').select('name').maybeSingle()
      const companyName = (companyData as any)?.name ?? 'My Company'
      const blob = await pdf(<ExpensesPDF month={month} companyName={companyName} expenses={expenses} />).toBlob()
      downloadPdf(blob, `expenses-${month}.pdf`)
    } catch { alert('Failed to generate PDF.') }
    finally { setExportingPdf(false) }
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: '#0F0A1E' }}>
      {/* Ambient glow */}
      <div className="pointer-events-none fixed top-[-10%] left-[-10%] w-[60%] h-[60%] z-0"
        style={{ background: 'radial-gradient(circle, rgba(189,157,255,0.06) 0%, transparent 70%)' }} />

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-16">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight text-[#ebe1fe]">Expenses</h1>
            <p className="mt-2 text-[#afa7c2] text-sm">Track business and operational expenses</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Month nav */}
            <div className="flex items-center gap-2">
              <button onClick={() => router.push(`/expenses?month=${navigateMonth(month, -1)}`)}
                className="p-2 rounded-xl text-[#afa7c2] hover:text-[#ebe1fe] transition-all"
                style={glassCard}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="px-4 py-2 rounded-xl font-semibold text-sm text-[#ebe1fe] min-w-[140px] text-center" style={glassCard}>
                {monthLabel}
              </div>
              <button onClick={() => router.push(`/expenses?month=${navigateMonth(month, 1)}`)}
                className="p-2 rounded-xl text-[#afa7c2] hover:text-[#ebe1fe] transition-all"
                style={glassCard}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {userRole === 'admin' && templates.length > 0 && (
              <button onClick={handleApplyTemplates} disabled={applying}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#afa7c2] hover:text-[#ebe1fe] disabled:opacity-40 transition-colors"
                style={glassCard}>
                <CalendarPlus className="h-4 w-4" />
                {applying ? 'Applying…' : 'Apply Templates'}
              </button>
            )}
            {userRole === 'admin' && (
              <button onClick={() => setTemplatesOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#afa7c2] hover:text-[#ebe1fe] transition-colors"
                style={glassCard}>
                <Settings2 className="h-4 w-4" />
                Templates
              </button>
            )}
            <button onClick={handleExportPdf} disabled={exportingPdf || expenses.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#afa7c2] hover:text-[#ebe1fe] disabled:opacity-40 transition-colors"
              style={glassCard}>
              <Download className="h-4 w-4" />
              {exportingPdf ? 'Exporting…' : 'Export PDF'}
            </button>
            {userRole === 'admin' && (
              <button onClick={() => { setEditing(null); setModalOpen(true) }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:shadow-[0_0_20px_rgba(189,157,255,0.3)] active:scale-95"
                style={{ background: '#bd9dff', color: '#0F0A1E' }}>
                <Plus className="h-4 w-4" />
                Add Expense
              </button>
            )}
          </div>
        </header>

        {/* Apply result banner */}
        {applyResult && (
          <div className="mb-8 flex items-center justify-between px-4 py-3 rounded-xl text-sm text-emerald-400"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <span>✓ {applyResult}</span>
            <button onClick={() => setApplyResult(null)} className="text-emerald-400/70 hover:text-emerald-400 font-bold ml-4">×</button>
          </div>
        )}

        {/* Stat cards */}
        <motion.section variants={staggerContainer} initial="hidden" animate="visible"
          className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">
          <motion.div variants={fadeInUp} className="p-6 rounded-2xl relative overflow-hidden" style={glassCard}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A847]/5 blur-3xl rounded-full pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#afa7c2] text-xs font-bold uppercase tracking-widest">This Month</span>
              <div className="p-2 rounded-lg" style={{ background: 'rgba(212,168,71,0.1)' }}>
                <Receipt className="h-4 w-4 text-[#D4A847]" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#D4A847]">{formatRs(grandTotal)}</div>
            <p className="text-[#afa7c2] text-xs mt-1">{monthLabel}</p>
          </motion.div>

          <motion.div variants={fadeInUp} className="p-6 rounded-2xl relative overflow-hidden" style={glassCard}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#bd9dff]/5 blur-3xl rounded-full pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#afa7c2] text-xs font-bold uppercase tracking-widest">Total Entries</span>
              <div className="p-2 rounded-lg" style={{ background: 'rgba(189,157,255,0.1)' }}>
                <Receipt className="h-4 w-4 text-[#bd9dff]" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#bd9dff]">{expenses.length}</div>
            <p className="text-[#afa7c2] text-xs mt-1">Expense records this month</p>
          </motion.div>

          <motion.div variants={fadeInUp} className="p-6 rounded-2xl relative overflow-hidden" style={glassCard}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#afa7c2] text-xs font-bold uppercase tracking-widest">Categories</span>
              <div className="p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)' }}>
                <Settings2 className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-emerald-400">{String(uniqueCategories).padStart(2, '0')}</div>
            <p className="text-[#afa7c2] text-xs mt-1">Active cost centers</p>
          </motion.div>
        </motion.section>

        {/* Category breakdown pills */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {CATEGORIES.map(cat => (
            <button key={cat}
              onClick={() => setCategoryFilter(f => f === cat ? 'all' : cat)}
              className="p-4 rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-95"
              style={{
                ...glassCard,
                ...(categoryFilter === cat ? { border: '1px solid rgba(189,157,255,0.4)', boxShadow: '0 0 16px rgba(189,157,255,0.1)' } : {}),
              }}>
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 ${CATEGORY_COLORS[cat] ?? CATEGORY_COLORS['Other']}`}>
                {cat}
              </span>
              <p className="text-sm font-bold text-[#ebe1fe]">
                {categoryTotals[cat] ? formatRs(categoryTotals[cat]) : <span className="text-[#afa7c2]">—</span>}
              </p>
            </button>
          ))}
        </motion.div>

        {/* Table card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl overflow-hidden" style={glassCard}>

          {/* Toolbar */}
          <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#4b455c]/20">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-[#ebe1fe] mr-2">Expense Records</h2>
              {['all', ...allCategories].map(cat => (
                <button key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    categoryFilter === cat
                      ? 'bg-[#bd9dff] text-[#0F0A1E]'
                      : 'text-[#afa7c2] hover:text-[#ebe1fe]'
                  }`}
                  style={categoryFilter !== cat ? { background: 'rgba(189,157,255,0.06)', border: '1px solid rgba(189,157,255,0.1)' } : {}}>
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(189,157,255,0.05)', border: '1px solid rgba(189,157,255,0.1)' }}>
              <Search className="h-4 w-4 text-[#afa7c2] flex-shrink-0" />
              <input type="text" placeholder="Search expenses..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-[#ebe1fe] text-sm placeholder:text-[#afa7c2]/50 w-44" />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[640px]">
              <thead>
                <tr className="text-[#afa7c2] text-[11px] font-bold tracking-widest uppercase border-b border-[#4b455c]/10">
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-center">Category</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Paid To</th>
                  {userRole === 'admin' && <th className="px-6 py-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#4b455c]/10">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={userRole === 'admin' ? 6 : 5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Receipt className="h-10 w-10 text-[#afa7c2]/30" />
                        <p className="text-sm text-[#afa7c2]">
                          {expenses.length === 0
                            ? `No expenses recorded for ${monthLabel}.`
                            : 'No entries match your filters.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(expense => (
                    <tr key={expense.id} className="group hover:bg-[#bd9dff]/[0.03] transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-sm text-[#ebe1fe]">{expense.description}</p>
                        {expense.note && (
                          <p className="text-[10px] text-[#afa7c2]/60 italic truncate max-w-[200px] mt-0.5">{expense.note}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${CATEGORY_COLORS[expense.category] ?? CATEGORY_COLORS['Other']}`}>
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-sm text-[#D4A847]">
                        {formatRs(Number(expense.amount))}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#afa7c2]">
                        {format(new Date(expense.date + 'T00:00:00'), 'dd MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#afa7c2]">
                        {expense.paid_to || <span className="text-[#afa7c2]/40">—</span>}
                      </td>
                      {userRole === 'admin' && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditing(expense); setModalOpen(true) }}
                              className="p-1.5 rounded-lg text-[#afa7c2] hover:text-[#bd9dff] hover:bg-[#bd9dff]/10 transition-all">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setDeleting(expense)}
                              className="p-1.5 rounded-lg text-[#afa7c2] hover:text-red-400 hover:bg-red-400/10 transition-all">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-[#bd9dff]/10" style={{ background: 'rgba(189,157,255,0.03)' }}>
                    <td className="px-6 py-4 text-sm font-bold text-[#afa7c2] uppercase tracking-wider" colSpan={2}>
                      Total ({filtered.length} entries)
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-[#D4A847]">
                      {formatRs(filtered.reduce((s, e) => s + Number(e.amount), 0))}
                    </td>
                    <td colSpan={userRole === 'admin' ? 3 : 2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="px-6 py-4 border-t border-[#4b455c]/20">
            <span className="text-xs text-[#afa7c2]">
              Showing {filtered.length} of {expenses.length} expenses
              {categoryFilter !== 'all' && ` · filtered by ${categoryFilter}`}
            </span>
          </div>
        </motion.div>

      </main>

      {/* Modals */}
      <AnimatePresence>
        {modalOpen && (
          <ExpenseModal expense={editing} companyId={companyId} defaultMonth={month}
            onSave={handleSaved} onClose={() => { setModalOpen(false); setEditing(null) }} />
        )}
        {deleting && (
          <DeleteConfirm description={deleting.description}
            onConfirm={handleDelete} onClose={() => setDeleting(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {templatesOpen && (
          <TemplatesModal companyId={companyId} initialTemplates={templates}
            onClose={() => setTemplatesOpen(false)} onChanged={setTemplates} />
        )}
      </AnimatePresence>
    </div>
  )
}
