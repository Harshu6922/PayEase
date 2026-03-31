'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
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

const inp: React.CSSProperties = {
  width: '100%', borderRadius: 10, padding: '9px 12px', fontSize: 13,
  color: '#ebe1fe', background: 'rgba(189,157,255,0.05)',
  border: '1px solid rgba(189,157,255,0.12)', outline: 'none',
  boxSizing: 'border-box',
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.08em',
  color: '#afa7c2', marginBottom: 5,
}

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
    const { error: deleteErr } = await supabase.from('expense_templates').delete().eq('id', id)
    if (deleteErr) {
      setError(`Delete failed: ${deleteErr.message}`)
      setDeleting(null)
      return
    }
    const next = templates.filter(t => t.id !== id)
    setTemplates(next); onChanged(next)
    setDeleting(null)
  }

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div
        className="fixed inset-0"
        style={{ background: 'rgba(10,7,20,0.7)', backdropFilter: 'blur(6px)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        style={{
          position: 'relative', width: '100%', maxWidth: 520,
          maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          background: 'rgba(22,17,38,0.97)',
          backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(189,157,255,0.15)',
          borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(189,157,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#ebe1fe', margin: 0 }}>Recurring Templates</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={openAdd}
              style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, background: 'rgba(189,157,255,0.15)', border: '1px solid rgba(189,157,255,0.25)', padding: '7px 12px', fontSize: 12, fontWeight: 600, color: '#bd9dff', cursor: 'pointer' }}>
              <Plus size={13} /> Add Template
            </button>
            <button onClick={onClose}
              style={{ color: '#afa7c2', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {error && (
            <div style={{ padding: '9px 12px', borderRadius: 10, background: 'rgba(255,110,132,0.1)', border: '1px solid rgba(255,110,132,0.2)', color: '#ff6e84', fontSize: 12 }}>
              {error}
            </div>
          )}

          {/* Inline form */}
          <AnimatePresence>
            {formOpen && (
              <motion.form
                onSubmit={handleSave}
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', borderRadius: 14, border: '1px solid rgba(189,157,255,0.2)', background: 'rgba(189,157,255,0.04)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, color: '#bd9dff', margin: 0 }}>
                  {editing ? 'Edit Template' : 'New Template'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Category</label>
                    <select value={form.category} onChange={e => set('category', e.target.value)}
                      style={{ ...inp, appearance: 'none' as any }}>
                      {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#1c162e' }}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Amount (₹) *</label>
                    <input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)}
                      placeholder="0.00" style={inp} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Description *</label>
                  <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
                    placeholder="e.g. Monthly rent, Maid salary…" style={inp} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Paid To</label>
                    <input type="text" value={form.paid_to} onChange={e => set('paid_to', e.target.value)}
                      placeholder="Vendor / person" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Note</label>
                    <input type="text" value={form.note} onChange={e => set('note', e.target.value)}
                      placeholder="Optional" style={inp} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setFormOpen(false)} disabled={saving}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#afa7c2', background: 'transparent', border: '1px solid rgba(189,157,255,0.15)', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#0F0A1E', background: '#bd9dff', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                    {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Template'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Template list */}
          {templates.length === 0 && !formOpen ? (
            <p style={{ textAlign: 'center', fontSize: 13, color: '#6b6080', padding: '32px 0' }}>
              No templates yet. Add one to get started.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {templates.map(t => (
                <div key={t.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 12, border: '1px solid rgba(189,157,255,0.1)', background: 'rgba(189,157,255,0.03)', padding: '10px 14px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#ebe1fe', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.description}
                    </p>
                    <p style={{ fontSize: 11, color: '#6b6080', margin: '2px 0 0' }}>
                      {t.category}{t.paid_to ? ` · ${t.paid_to}` : ''}
                    </p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#ebe1fe', whiteSpace: 'nowrap' }}>
                    ₹{Number(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => openEdit(t)}
                      style={{ padding: 6, borderRadius: 8, background: 'none', border: 'none', color: '#afa7c2', cursor: 'pointer' }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id}
                      style={{ padding: 6, borderRadius: 8, background: 'none', border: 'none', color: 'rgba(255,110,132,0.6)', cursor: 'pointer', opacity: deleting === t.id ? 0.5 : 1 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}
