'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, type Expense } from './ExpensesManager'
import GlassSelect from '@/components/ui/GlassSelect'

interface Props {
  expense: Expense | null
  companyId: string
  defaultMonth: string
  onSave: (expense: Expense) => void
  onClose: () => void
}

const inp: React.CSSProperties = {
  width: '100%', borderRadius: 12, padding: '10px 14px', fontSize: 13,
  color: '#ebe1fe', background: 'rgba(189,157,255,0.05)',
  border: '1px solid rgba(189,157,255,0.12)', outline: 'none',
  boxSizing: 'border-box',
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.08em',
  color: '#afa7c2', marginBottom: 6,
}

export default function ExpenseModal({ expense, companyId, defaultMonth, onSave, onClose }: Props) {
  const supabase = createClient() as any

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
        date: expense.date, category: expense.category,
        description: expense.description, amount: String(expense.amount),
        paid_to: expense.paid_to ?? '', note: expense.note ?? '',
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
      company_id: companyId, date: form.date, category: form.category,
      description: form.description.trim(), amount,
      paid_to: form.paid_to.trim() || null, note: form.note.trim() || null,
    }
    if (expense) {
      const { data, error: err } = await supabase.from('expenses').update(payload).eq('id', expense.id).select('*').single()
      if (err) { setError(err.message); setSaving(false); return }
      onSave(data as Expense)
    } else {
      const { data, error: err } = await supabase.from('expenses').insert(payload).select('*').single()
      if (err) { setError(err.message); setSaving(false); return }
      onSave(data as Expense)
    }
    setSaving(false)
  }

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div className="fixed inset-0" onClick={onClose}
        style={{ background: 'rgba(10,7,20,0.7)', backdropFilter: 'blur(6px)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        style={{
          position: 'relative', width: '100%', maxWidth: 480,
          background: 'rgba(22,17,38,0.97)',
          backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(189,157,255,0.15)',
          borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(189,157,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#ebe1fe', margin: 0 }}>
            {expense ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button onClick={onClose} style={{ color: '#afa7c2', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px' }}>
          {error && (
            <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,110,132,0.1)', border: '1px solid rgba(255,110,132,0.2)', color: '#ff6e84', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                style={{ ...inp, colorScheme: 'dark' }} />
            </div>
            <div>
              <label style={lbl}>Category</label>
              <GlassSelect
                value={isCustom ? '__custom__' : form.category}
                onChange={v => {
                  if (v === '__custom__') set('category', customCategory || '')
                  else { set('category', v); setCustomCategory('') }
                }}
                options={[
                  ...CATEGORIES.map(c => ({ value: c, label: c })),
                  { value: '__custom__', label: 'Custom…' },
                ]}
              />
              {isCustom && (
                <input type="text" value={form.category} autoFocus
                  onChange={e => { set('category', e.target.value); setCustomCategory(e.target.value) }}
                  placeholder="Custom category" style={{ ...inp, marginTop: 8 }} />
              )}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Description <span style={{ color: '#ff6e84' }}>*</span></label>
            <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="e.g. Electricity bill, Plumber visit…" style={inp} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Amount (₹) <span style={{ color: '#ff6e84' }}>*</span></label>
              <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
                min="0.01" step="0.01" placeholder="0.00" style={inp} />
            </div>
            <div>
              <label style={lbl}>Paid To <span style={{ color: '#6b6080', fontWeight: 400, textTransform: 'none', fontSize: 10 }}>(optional)</span></label>
              <input type="text" value={form.paid_to} onChange={e => set('paid_to', e.target.value)}
                placeholder="Vendor / person name" style={inp} />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Note <span style={{ color: '#6b6080', fontWeight: 400, textTransform: 'none', fontSize: 10 }}>(optional)</span></label>
            <input type="text" value={form.note} onChange={e => set('note', e.target.value)}
              placeholder="Any additional details…" style={inp} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} disabled={saving}
              style={{ flex: 1, padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#afa7c2', background: 'transparent', border: '1px solid rgba(189,157,255,0.15)', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, color: '#0F0A1E', background: '#bd9dff', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : expense ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}
