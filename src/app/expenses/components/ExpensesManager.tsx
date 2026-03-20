'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, parse } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, Settings2, CalendarPlus } from 'lucide-react'
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
  Factory:     'bg-blue-50   text-blue-700',
  Household:   'bg-purple-50 text-purple-700',
  Utilities:   'bg-yellow-50 text-yellow-700',
  Salary:      'bg-green-50  text-green-700',
  Maintenance: 'bg-orange-50 text-orange-700',
  Other:       'bg-gray-50   text-gray-600',
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const row = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } } }

function formatRs(n: number) {
  return 'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ExpensesManager({
  month, companyId, initialExpenses, initialTemplates
}: {
  month: string
  companyId: string
  initialExpenses: Expense[]
  initialTemplates: ExpenseTemplate[]
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
      const { data: inserted } = await supabase
        .from('expenses').insert(payload).select('*')
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="mt-1 text-sm text-gray-500">Track all outgoing expenses for {monthLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={handleMonthChange}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf || expenses.length === 0}
            className="flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-600 disabled:opacity-50 transition-colors shadow-sm"
          >
            {exportingPdf ? 'Generating…' : 'Export PDF'}
          </button>
          {templates.length > 0 && (
            <button
              onClick={handleApplyTemplates}
              disabled={applying}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
            >
              <CalendarPlus className="h-4 w-4" />
              {applying ? 'Applying…' : 'Apply Templates'}
            </button>
          )}
          <button
            onClick={() => setTemplatesOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Settings2 className="h-4 w-4" />
            Templates
          </button>
          <button
            onClick={() => { setEditing(null); setModalOpen(true) }}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      </div>

      {applyResult && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
          <span>✓ {applyResult}</span>
          <button onClick={() => setApplyResult(null)} className="text-green-600 hover:text-green-800 font-bold ml-4">×</button>
        </div>
      )}

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
            className={`rounded-xl border p-4 text-left transition-all shadow-sm hover:shadow-md ${
              categoryFilter === cat ? 'ring-2 ring-indigo-500 border-indigo-300' : 'bg-white border-gray-200'
            }`}
          >
            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 ${CATEGORY_COLORS[cat]}`}>
              {cat}
            </span>
            <p className="text-base font-bold text-gray-900">
              {categoryTotals[cat] ? formatRs(categoryTotals[cat]) : '—'}
            </p>
          </motion.button>
        ))}
      </motion.div>

      {/* Total bar */}
      <div className="flex items-center justify-between rounded-xl bg-gray-900 text-white px-6 py-4 mb-6 shadow-sm">
        <span className="text-sm font-medium text-gray-300">Total Expenses — {monthLabel}</span>
        <span className="text-xl font-black">{formatRs(grandTotal)}</span>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search description, paid to…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All categories</option>
          {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(search || categoryFilter !== 'all') && (
          <button
            onClick={() => { setSearch(''); setCategoryFilter('all') }}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap"
          >
            Clear
          </button>
        )}
      </div>

      {/* Expense list */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
          {filtered.length !== expenses.length && ` (filtered from ${expenses.length})`}
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            {expenses.length === 0
              ? `No expenses recorded for ${monthLabel}. Add your first one.`
              : 'No entries match your filters.'}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <motion.div variants={container} initial="hidden" animate="show">
              {filtered.map(expense => (
                <motion.div
                  key={expense.id}
                  variants={row}
                  layout
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors group"
                >
                  {/* Category badge */}
                  <span className={`hidden sm:inline-block text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${CATEGORY_COLORS[expense.category] ?? CATEGORY_COLORS['Other']}`}>
                    {expense.category}
                  </span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{expense.description}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
                      <span>{format(new Date(expense.date + 'T00:00:00'), 'dd MMM yyyy')}</span>
                      {expense.paid_to && <><span>·</span><span>Paid to: <span className="text-gray-600">{expense.paid_to}</span></span></>}
                      {expense.note && <><span>·</span><span className="italic truncate">{expense.note}</span></>}
                    </div>
                  </div>

                  {/* Amount */}
                  <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{formatRs(Number(expense.amount))}</span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditing(expense); setModalOpen(true) }}
                      className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleting(expense)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
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
    </>
  )
}
