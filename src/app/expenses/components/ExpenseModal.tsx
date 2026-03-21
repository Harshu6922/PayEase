'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, type Expense } from './ExpensesManager'

interface Props {
  expense: Expense | null
  companyId: string
  defaultMonth: string
  onSave: (expense: Expense) => void
  onClose: () => void
}

export default function ExpenseModal({ expense, companyId, defaultMonth, onSave, onClose }: Props) {
  const supabase = createClient() as unknown as any

  const today = new Date().toISOString().split('T')[0]
  const defaultDate = defaultMonth
    ? `${defaultMonth}-${String(new Date().getDate()).padStart(2, '0')}`
    : today

  const [form, setForm] = useState({
    date:        expense?.date        ?? defaultDate,
    category:    expense?.category    ?? 'Other',
    description: expense?.description ?? '',
    amount:      expense?.amount      ? String(expense.amount) : '',
    paid_to:     expense?.paid_to     ?? '',
    note:        expense?.note        ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customCategory, setCustomCategory] = useState(
    CATEGORIES.includes(expense?.category ?? 'Other') ? '' : (expense?.category ?? '')
  )
  const isCustom = !CATEGORIES.includes(form.category)

  useEffect(() => {
    if (expense) {
      setForm({
        date:        expense.date,
        category:    expense.category,
        description: expense.description,
        amount:      String(expense.amount),
        paid_to:     expense.paid_to ?? '',
        note:        expense.note ?? '',
      })
    }
  }, [expense])

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.description.trim()) { setError('Description is required.'); return }
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) { setError('Enter a valid amount greater than 0.'); return }

    setSaving(true)
    const payload = {
      company_id:  companyId,
      date:        form.date,
      category:    form.category,
      description: form.description.trim(),
      amount,
      paid_to:     form.paid_to.trim() || null,
      note:        form.note.trim() || null,
    }

    if (expense) {
      const { data, error: err } = await supabase
        .from('expenses').update(payload).eq('id', expense.id).select('*').single()
      if (err) { setError(err.message); setSaving(false); return }
      onSave(data as Expense)
    } else {
      const { data, error: err } = await supabase
        .from('expenses').insert(payload).select('*').single()
      if (err) { setError(err.message); setSaving(false); return }
      onSave(data as Expense)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-md"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      >
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {expense ? 'Edit Expense' : 'Add Expense'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={isCustom ? '__custom__' : form.category}
                onChange={e => {
                  if (e.target.value === '__custom__') {
                    set('category', customCategory || '')
                  } else {
                    set('category', e.target.value)
                    setCustomCategory('')
                  }
                }}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:border-indigo-500 focus:outline-none"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="__custom__">Custom…</option>
              </select>
              {isCustom && (
                <input
                  type="text"
                  value={form.category}
                  onChange={e => { set('category', e.target.value); setCustomCategory(e.target.value) }}
                  placeholder="Enter custom category"
                  className="mt-2 block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description <span className="text-red-500">*</span></label>
            <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="e.g. Electricity bill, Plumber visit…"
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (Rs.) <span className="text-red-500">*</span></label>
              <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
                min="0.01" step="0.01" placeholder="0.00"
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paid To <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
              <input type="text" value={form.paid_to} onChange={e => set('paid_to', e.target.value)}
                placeholder="Vendor / person name"
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
            <input type="text" value={form.note} onChange={e => set('note', e.target.value)}
              placeholder="Any additional details…"
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : expense ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
