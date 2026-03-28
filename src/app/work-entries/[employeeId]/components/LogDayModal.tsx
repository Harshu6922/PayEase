'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AgentItemRate, WorkEntry } from '@/types'

interface Props {
  agentRates: AgentItemRate[]
  existingEntries: WorkEntry[]
  companyId: string
  employeeId: string
  editingDate: string | null
  onSave: (date: string, entries: WorkEntry[]) => void
  onClose: () => void
}

const glassModal: React.CSSProperties = {
  background: 'rgba(22,17,38,0.95)',
  backdropFilter: 'blur(32px)',
  WebkitBackdropFilter: 'blur(32px)',
  border: '1px solid rgba(189,157,255,0.15)',
}

const inputCls = `w-20 rounded-xl px-2 py-1.5 text-right text-sm text-[#ebe1fe]
  bg-[rgba(189,157,255,0.05)] border border-[rgba(189,157,255,0.1)]
  focus:outline-none focus:border-[#bd9dff]/40 transition-colors`

const dateInputCls = `w-full rounded-xl px-4 py-2.5 text-sm text-[#ebe1fe]
  bg-[rgba(189,157,255,0.05)] border border-[rgba(189,157,255,0.1)]
  focus:outline-none focus:border-[#bd9dff]/40 transition-colors
  disabled:opacity-40 disabled:cursor-not-allowed`

const labelCls = 'block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[#afa7c2]'

export default function LogDayModal({
  agentRates, existingEntries, companyId, employeeId, editingDate, onSave, onClose
}: Props) {
  const [date, setDate] = useState(editingDate ?? format(new Date(), 'yyyy-MM-dd'))
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editingDate && existingEntries.length > 0) {
      const init: Record<string, string> = {}
      existingEntries.forEach(e => { init[e.item_id] = String(e.quantity) })
      setQuantities(init)
    } else {
      setQuantities({})
    }
  }, [editingDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const grandTotal = agentRates.reduce((sum, r) => {
    const qty = parseFloat(quantities[r.item_id] ?? '0') || 0
    return sum + qty * r.commission_rate
  }, 0)

  const handleSave = async () => {
    const hasQty = agentRates.some(r => parseFloat(quantities[r.item_id] ?? '0') > 0)
    if (!hasQty) { setError('Enter at least one quantity greater than 0.'); return }

    setSaving(true)
    setError(null)
    const supabase = createClient() as unknown as any

    try {
      for (const rate of agentRates) {
        const qty = parseFloat(quantities[rate.item_id] ?? '0') || 0
        if (qty > 0) {
          const { error: upsertErr } = await supabase.from('work_entries').upsert(
            { employee_id: employeeId, company_id: companyId, date, item_id: rate.item_id, quantity: qty, rate: rate.commission_rate },
            { onConflict: 'employee_id,item_id,date' }
          )
          if (upsertErr) throw new Error(upsertErr.message)
        } else {
          const hadEntry = existingEntries.some(e => e.item_id === rate.item_id)
          if (hadEntry) {
            await supabase.from('work_entries').delete()
              .eq('employee_id', employeeId).eq('item_id', rate.item_id).eq('date', date)
          }
        }
      }
      const { data: fresh } = await supabase.from('work_entries').select('*')
        .eq('employee_id', employeeId).eq('date', date)
      onSave(date, (fresh || []) as WorkEntry[])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save entries.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <motion.div
        className="relative w-full max-w-md rounded-2xl shadow-2xl"
        style={glassModal}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(189,157,255,0.08)' }}>
          <h2 className="text-lg font-bold" style={{ color: '#ebe1fe' }}>
            {editingDate ? 'Edit Entries' : 'Log Day'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: '#afa7c2' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Date */}
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              disabled={!!editingDate}
              className={dateInputCls}
            />
          </div>

          {/* Item rows */}
          {agentRates.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: '#afa7c2' }}>
              No commission items assigned to this worker.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 pb-1"
                style={{ borderBottom: '1px solid rgba(189,157,255,0.06)' }}>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#afa7c2' }}>Item</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-right w-20" style={{ color: '#afa7c2' }}>Qty</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-right w-24" style={{ color: '#afa7c2' }}>Total</span>
              </div>
              {agentRates.map(rate => {
                const qty = parseFloat(quantities[rate.item_id] ?? '0') || 0
                const lineTotal = qty * rate.commission_rate
                return (
                  <div key={rate.item_id} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#ebe1fe' }}>
                        {rate.commission_items?.name ?? 'Unknown'}
                      </p>
                      <p className="text-xs" style={{ color: '#afa7c2' }}>@ ₹{rate.commission_rate}/unit</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={quantities[rate.item_id] ?? ''}
                      onChange={e => setQuantities(prev => ({ ...prev, [rate.item_id]: e.target.value }))}
                      placeholder="0"
                      className={inputCls}
                    />
                    <span className="text-sm text-right w-24 font-mono" style={{ color: lineTotal > 0 ? '#D4A847' : '#afa7c2' }}>
                      {lineTotal > 0 ? `₹${lineTotal.toLocaleString('en-IN')}` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Grand total */}
          <div className="flex justify-between items-center pt-1"
            style={{ borderTop: '1px solid rgba(189,157,255,0.08)' }}>
            <span className="text-sm font-semibold" style={{ color: '#afa7c2' }}>Total</span>
            <span className="text-base font-bold" style={{ color: '#D4A847' }}>
              ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {error && (
            <p className="text-sm" style={{ color: '#ff6e84' }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid rgba(189,157,255,0.08)' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
            style={{ background: 'rgba(189,157,255,0.2)', border: '1px solid rgba(189,157,255,0.35)', color: '#bd9dff' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            style={{ border: '1px solid rgba(189,157,255,0.15)', color: '#afa7c2' }}
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  )
}
