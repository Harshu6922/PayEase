'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, parse } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, Settings2, CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { downloadPdf } from '@/lib/pdf-utils'
import ExpenseModal from './ExpenseModal'
import DeleteConfirm from './DeleteConfirm'
import TemplatesModal from './TemplatesModal'
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
  Factory:     'bg-blue-500/15 text-blue-400 border-blue-500/20',
  Household:   'bg-purple-500/15 text-purple-400 border-purple-500/20',
  Utilities:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  Salary:      'bg-success/15 text-success border-success/20',
  Maintenance: 'bg-warning/15 text-warning border-warning/20',
  Other:       'bg-white/10 text-text-muted border-white/10',
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const row = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } } }

function formatRs(n: number) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function navigateMonth(month: string, direction: 1 | -1): string {
  const [year, mon] = month.split('-').map(Number)
  const d = new Date(year, mon - 1 + direction, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

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

  // All unique categories (standard + any custom ones from actual expenses)
  const allCategories = useMemo(() => {
    const cats = new Set(expenses.map(e => e.category))
    CATEGORIES.forEach(c => cats.add(c))
    return Array.from(cats).sort()
  }, [expenses])

  // Category totals
  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {}
    expenses.forEach(e => {
      map[e.category] = (map[e.category] ?? 0) + Number(e.amount)
    })
    return map
  }, [expenses])

  const grandTotal = useMemo(() =>
    expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses])

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

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) router.push(`/expenses?month=${e.target.value}`)
  }

  const handleApplyTemplates = async () => {
    if (templates.length === 0) return
    setApplying(true)
    setApplyResult(null)

    const [year, mon] = month.split('-').map(Number)
    const today = new Date()
    const isCurrentMonth =
      today.getFullYear() === year && today.getMonth() + 1 === mon
    const lastDay = new Date(year, mon, 0).getDate()
    const applyDate = isCurrentMonth
      ? today.toISOString().split('T')[0]
      : `${month}-${String(lastDay).padStart(2, '0')}`

    const startDate = `${month}-01`
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`
    const { data: existing } = await supabase
      .from('expenses')
      .select('template_id')
      .eq('company_id', companyId)
      .gte('date', startDate)
      .lte('date', endDate)
      .not('template_id', 'is', null)

    const appliedTemplateIds = new Set((existing || []).map((e: any) => e.template_id))

    const toInsert = templates.filter(t => !appliedTemplateIds.has(t.id))
    const skipped = templates.length - toInsert.length

    if (toInsert.length > 0) {
      const payload = toInsert.map(t => ({
        company_id: companyId,
        date: applyDate,
        category: t.category,
        description: t.description,
        amount: t.amount,
        paid_to: t.paid_to,
        note: t.note,
        template_id: t.id,
      }))
      const { data: inserted, error: insertErr } = await supabase
        .from('expenses').insert(payload).select('*')
      if (insertErr) {
        setApplyResult(`Error applying templates: ${insertErr.message}`)
        setApplying(false)
        return
      }
      if (inserted) {
        setExpenses(prev =>
          [...prev, ...inserted].sort((a, b) => b.date.localeCompare(a.date))
        )
      }
    }

    setApplyResult(
      `${toInsert.length} added${skipped > 0 ? `, ${skipped} skipped (already applied this month)` : ''}`
    )
    setApplying(false)
  }

  const handleExportPdf = async () => {
    setExportingPdf(true)
    try {
      const [{ default: ExpensesPDF }, { pdf }] = await Promise.all([
        import('@/components/pdf/ExpensesPDF'),
        import('@react-pdf/renderer'),
      ])
      // Fetch company name
      const { data: companyData } = await supabase
        .from('companies')
        .select('name')
        .maybeSingle()
      const companyName = (companyData as any)?.name ?? 'My Company'
      const blob = await pdf(
        <ExpensesPDF month={month} companyName={companyName} expenses={expenses} />
      ).toBlob()
      downloadPdf(blob, `expenses-${month}.pdf`)
    } catch {
      alert('Failed to generate PDF.')
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <>
      {/* Page header */}
      <div className="px-4 md:px-6 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-text font-bold text-2xl">Expenses</h1>
          <p className="text-text-muted text-sm mt-0.5">Track all outgoing expenses for {monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf || expenses.length === 0}
            className="hidden sm:flex items-center gap-2 border border-[#7C3AED]/30 text-text-muted hover:text-text rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40"
          >
            {exportingPdf ? 'Generating…' : 'Export PDF'}
          </button>
          {userRole === 'admin' && templates.length > 0 && (
            <button
              onClick={handleApplyTemplates}
              disabled={applying}
              className="hidden sm:flex items-center gap-2 border border-[#7C3AED]/30 text-text-muted hover:text-text rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40"
            >
              <CalendarPlus className="h-4 w-4" />
              {applying ? 'Applying…' : 'Apply Templates'}
            </button>
          )}
          {userRole === 'admin' && (
            <button
              onClick={() => setTemplatesOpen(true)}
              className="hidden sm:flex items-center gap-2 border border-[#7C3AED]/30 text-text-muted hover:text-text rounded-xl px-3 py-2 text-sm font-medium transition-colors"
            >
              <Settings2 className="h-4 w-4" />
              Templates
            </button>
          )}
          {userRole === 'admin' && (
            <button
              onClick={() => { setEditing(null); setModalOpen(true) }}
              className="flex items-center gap-2 bg-primary text-white rounded-xl px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </button>
          )}
        </div>
      </div>

      <div className="px-4 md:px-6 pb-8">
        {/* Apply result banner */}
        {applyResult && (
          <div className="mb-4 flex items-center justify-between backdrop-blur-md bg-success/10 border border-success/20 rounded-xl px-4 py-3 text-sm text-success">
            <span>✓ {applyResult}</span>
            <button onClick={() => setApplyResult(null)} className="text-success/70 hover:text-success font-bold ml-4 transition-colors">×</button>
          </div>
        )}

        {/* Monthly total glass card with month nav */}
        <div className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-text-muted text-sm">{monthLabel} Expenses</p>
            {/* Month navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => router.push(`/expenses?month=${navigateMonth(month, -1)}`)}
                className="p-1.5 rounded-lg border border-[#7C3AED]/20 text-text-muted hover:text-text hover:border-[#7C3AED]/40 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <input
                type="month"
                value={month}
                onChange={handleMonthChange}
                className="bg-transparent border-0 text-text-muted text-sm text-center focus:outline-none cursor-pointer px-1 w-32"
              />
              <button
                onClick={() => router.push(`/expenses?month=${navigateMonth(month, 1)}`)}
                className="p-1.5 rounded-lg border border-[#7C3AED]/20 text-text-muted hover:text-text hover:border-[#7C3AED]/40 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="font-mono font-bold text-3xl text-rupee-gold">{formatRs(grandTotal)}</p>
        </div>

        {/* Category summary cards */}
        <motion.div
          variants={container} initial="hidden" animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6"
        >
          {CATEGORIES.map(cat => (
            <motion.button
              key={cat}
              variants={row}
              onClick={() => setCategoryFilter(f => f === cat ? 'all' : cat)}
              className={`backdrop-blur-md bg-white/5 border rounded-xl p-4 text-left transition-all hover:bg-white/10 ${
                categoryFilter === cat
                  ? 'border-primary/60 ring-1 ring-primary/30'
                  : 'border-[#7C3AED]/20'
              }`}
            >
              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 border ${CATEGORY_COLORS[cat] ?? CATEGORY_COLORS['Other']}`}>
                {cat}
              </span>
              <p className="text-sm font-bold font-mono text-text">
                {categoryTotals[cat] ? formatRs(categoryTotals[cat]) : '—'}
              </p>
            </motion.button>
          ))}
        </motion.div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Search description, paid to…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-background border border-[#7C3AED]/30 rounded-xl px-4 py-3 text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-sm"
          />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-background border border-[#7C3AED]/30 rounded-xl px-4 py-3 text-text-muted focus:outline-none focus:border-primary/50 text-sm"
          >
            <option value="all">All categories</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(search || categoryFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setCategoryFilter('all') }}
              className="text-sm text-primary-light hover:text-text font-medium whitespace-nowrap transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Expense list */}
        <div className="space-y-2">
          {/* Count header */}
          <div className="px-1 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            {filtered.length !== expenses.length && ` (filtered from ${expenses.length})`}
          </div>

          {filtered.length === 0 ? (
            <div className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl px-6 py-12 text-center text-sm text-text-muted">
              {expenses.length === 0
                ? `No expenses recorded for ${monthLabel}. Add your first one.`
                : 'No entries match your filters.'}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
                {filtered.map(expense => (
                  <motion.div
                    key={expense.id}
                    variants={row}
                    layout
                    exit={{ opacity: 0, height: 0 }}
                    className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl px-4 py-3 flex items-center gap-4 group hover:bg-white/10 transition-colors"
                  >
                    {/* Category badge */}
                    <span className={`hidden sm:inline-block text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 border ${CATEGORY_COLORS[expense.category] ?? CATEGORY_COLORS['Other']}`}>
                      {expense.category}
                    </span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-text text-sm font-medium truncate">{expense.description}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted flex-wrap">
                        <span>{format(new Date(expense.date + 'T00:00:00'), 'dd MMM yyyy')}</span>
                        {expense.paid_to && (
                          <><span>·</span><span>Paid to: <span className="text-text">{expense.paid_to}</span></span></>
                        )}
                        {expense.note && (
                          <><span>·</span><span className="italic truncate">{expense.note}</span></>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <span className="font-mono text-rupee-gold font-semibold text-sm whitespace-nowrap">
                      {formatRs(Number(expense.amount))}
                    </span>

                    {/* Actions */}
                    {userRole === 'admin' && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditing(expense); setModalOpen(true) }}
                          className="p-1.5 rounded-lg text-text-muted hover:text-primary-light hover:bg-primary/10 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleting(expense)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Modals */}
        <AnimatePresence>
          {modalOpen && (
            <ExpenseModal
              expense={editing}
              companyId={companyId}
              defaultMonth={month}
              onSave={handleSaved}
              onClose={() => { setModalOpen(false); setEditing(null) }}
            />
          )}
          {deleting && (
            <DeleteConfirm
              description={deleting.description}
              onConfirm={handleDelete}
              onClose={() => setDeleting(null)}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {templatesOpen && (
            <TemplatesModal
              companyId={companyId}
              initialTemplates={templates}
              onClose={() => setTemplatesOpen(false)}
              onChanged={setTemplates}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
