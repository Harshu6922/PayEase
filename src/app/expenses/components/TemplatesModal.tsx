'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from './ExpensesManager'
import type { ExpenseTemplate } from '@/types'

interface Props {
  companyId: string
  initialTemplates: ExpenseTemplate[]
  onClose: () => void
  onChanged: (templates: ExpenseTemplate[]) => void
}

const row = { hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' as const } } }

const emptyForm = { category: 'Other', description: '', amount: '', paid_to: '', note: '' }

export default function TemplatesModal({ companyId, initialTemplates, onClose, onChanged }: Props) {
  const supabase = createClient() as unknown as any
  const [templates, setTemplates] = useState<ExpenseTemplate[]>(initialTemplates)
  const [editing, setEditing] = useState<ExpenseTemplate | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const openAdd = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); setError(null) }
  const openEdit = (t: ExpenseTemplate) => {
    setEditing(t)
    setForm({ category: t.category, description: t.description, amount: String(t.amount), paid_to: t.paid_to ?? '', note: t.note ?? '' })
    setFormOpen(true)
    setError(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.description.trim()) { setError('Description is required.'); return }
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) { setError('Enter a valid amount.'); return }
    setSaving(true)
    const payload = {
      company_id: companyId,
      category: form.category,
      description: form.description.trim(),
      amount,
      paid_to: form.paid_to.trim() || null,
      note: form.note.trim() || null,
    }
    if (editing) {
      const { data, error: err } = await supabase
        .from('expense_templates').update(payload).eq('id', editing.id).select('*').single()
      if (err) { setError(err.message); setSaving(false); return }
      const next = templates.map(t => t.id === editing.id ? data : t)
      setTemplates(next); onChanged(next)
    } else {
      const { data, error: err } = await supabase
        .from('expense_templates').insert(payload).select('*').single()
      if (err) { setError(err.message); setSaving(false); return }
      const next = [...templates, data]
      setTemplates(next); onChanged(next)
    }
    setSaving(false)
    setFormOpen(false)
    setEditing(null)
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    await supabase.from('expense_templates').delete().eq('id', id)
    const next = templates.filter(t => t.id !== id)
    setTemplates(next); onChanged(next)
    setDeleting(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Recurring Templates</h2>
          <div className="flex items-center gap-2">
            <button onClick={openAdd}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Template
            </button>
            <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {/* Inline form */}
          <AnimatePresence>
            {formOpen && (
              <motion.form
                onSubmit={handleSave}
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3"
              >
                <p className="text-sm font-semibold text-indigo-800">{editing ? 'Edit Template' : 'New Template'}</p>
                {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                    <select value={form.category} onChange={e => set('category', e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Amount (Rs.) *</label>
                    <input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)}
                      placeholder="0.00"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
                  <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
                    placeholder="e.g. Monthly rent, Maid salary…"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Paid To</label>
                    <input type="text" value={form.paid_to} onChange={e => set('paid_to', e.target.value)}
                      placeholder="Vendor / person"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Note</label>
                    <input type="text" value={form.note} onChange={e => set('note', e.target.value)}
                      placeholder="Optional"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setFormOpen(false)} disabled={saving}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                    {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Template'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Template list */}
          {templates.length === 0 && !formOpen ? (
            <p className="text-center text-sm text-gray-400 py-8">No templates yet. Add one to get started.</p>
          ) : (
            <motion.div className="space-y-2">
              {templates.map(t => (
                <motion.div key={t.id} variants={row}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 group hover:bg-white hover:shadow-sm transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{t.description}</p>
                    <p className="text-xs text-gray-400">{t.category}{t.paid_to ? ` · ${t.paid_to}` : ''}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                    Rs. {Number(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(t)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
