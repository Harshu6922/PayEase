'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
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

export default function LogDayModal({
  agentRates, existingEntries, companyId, employeeId, editingDate, onSave, onClose
}: Props) {
  const [date, setDate] = useState(editingDate ?? format(new Date(), 'yyyy-MM-dd'))
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill quantities when editing
  useEffect(() => {
    if (editingDate && existingEntries.length > 0) {
      const init: Record<string, string> = {}
      existingEntries.forEach(e => { init[e.item_id] = String(e.quantity) })
      setQuantities(init)
    } else {
      setQuantities({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingDate])

  const grandTotal = agentRates.reduce((sum, r) => {
    const qty = parseFloat(quantities[r.item_id] ?? '0') || 0
    return sum + qty * r.commission_rate
  }, 0)

  const handleSave = async () => {
    const hasQty = agentRates.some(r => parseFloat(quantities[r.item_id] ?? '0') > 0)
    if (!hasQty) { setError('Enter at least one quantity greater than 0.'); return }

    setSaving(true)
    setError(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any

    try {
      for (const rate of agentRates) {
        const qty = parseFloat(quantities[rate.item_id] ?? '0') || 0

        if (qty > 0) {
          const { error: upsertErr } = await supabase.from('work_entries').upsert(
            {
              employee_id: employeeId,
              company_id: companyId,
              date,
              item_id: rate.item_id,
              quantity: qty,
              rate: rate.commission_rate,
            },
            { onConflict: 'employee_id,item_id,date' }
          )
          if (upsertErr) throw new Error(upsertErr.message)
        } else {
          // If qty = 0 and there was a previous entry for this item, delete it
          const hadEntry = existingEntries.some(e => e.item_id === rate.item_id)
          if (hadEntry) {
            await supabase.from('work_entries')
              .delete()
              .eq('employee_id', employeeId)
              .eq('item_id', rate.item_id)
              .eq('date', date)
          }
        }
      }

      // Re-fetch entries for this date to get generated total_amount
      const { data: fresh } = await supabase
        .from('work_entries')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', date)

      onSave(date, (fresh || []) as WorkEntry[])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save entries.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingDate ? 'Edit Entries' : 'Log Day'}
          </h2>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Date picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              disabled={!!editingDate}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          {/* Item rows */}
          <div className="space-y-3">
            {agentRates.map(rate => {
              const qty = parseFloat(quantities[rate.item_id] ?? '0') || 0
              const lineTotal = qty * rate.commission_rate
              return (
                <div key={rate.item_id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {rate.commission_items?.name ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-400">@ Rs. {rate.commission_rate}/unit</p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={quantities[rate.item_id] ?? ''}
                    onChange={e => setQuantities(prev => ({ ...prev, [rate.item_id]: e.target.value }))}
                    placeholder="0"
                    className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-right text-gray-900 text-sm"
                  />
                  <span className="text-sm text-gray-500 w-24 text-right">
                    {lineTotal > 0 ? `Rs. ${lineTotal.toLocaleString()}` : '—'}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Grand total */}
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm font-semibold text-gray-700">Total</span>
            <span className="text-base font-bold text-gray-900">
              Rs. {grandTotal.toLocaleString()}
            </span>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
