'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CommissionItem, AgentItemRate } from '@/types'

interface Props {
  item: CommissionItem
  existingRate: AgentItemRate | null
  employeeId: string
  onSave: (rate: AgentItemRate) => void
  onClose: () => void
}

const glassModal: React.CSSProperties = {
  background: 'rgba(22,17,38,0.95)',
  backdropFilter: 'blur(32px)',
  WebkitBackdropFilter: 'blur(32px)',
  border: '1px solid rgba(189,157,255,0.15)',
}

const inputCls = `w-full rounded-xl px-4 py-2.5 text-sm text-[#ebe1fe] placeholder-[#afa7c2]/50
  bg-[rgba(189,157,255,0.05)] border border-[rgba(189,157,255,0.1)]
  focus:outline-none focus:border-[#bd9dff]/40 transition-colors`

const labelCls = 'block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[#afa7c2]'

export default function SetRateModal({ item, existingRate, employeeId, onSave, onClose }: Props) {
  const [rate, setRate] = useState<string>(existingRate?.commission_rate?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const parsedRate = parseFloat(rate)
    if (rate.trim() === '' || isNaN(parsedRate) || parsedRate < 0) {
      setError('Rate must be a valid non-negative number.')
      return
    }
    setSaving(true)
    try {
      const supabase = createClient() as unknown as any
      if (existingRate) {
        const { data, error: updateError } = await supabase
          .from('agent_item_rates').update({ commission_rate: parsedRate }).eq('id', existingRate.id).select('*')
        if (updateError) throw updateError
        if (!data || data.length === 0) throw new Error('No data returned from update.')
        onSave(data[0] as AgentItemRate)
      } else {
        const { data, error: insertError } = await supabase
          .from('agent_item_rates').insert({ employee_id: employeeId, item_id: item.id, commission_rate: parsedRate }).select('*')
        if (insertError) throw insertError
        if (!data || data.length === 0) throw new Error('No data returned from insert.')
        onSave(data[0] as AgentItemRate)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }} onClick={onClose} />
      <motion.div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={glassModal}
        initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold" style={{ color: '#ebe1fe' }}>
            {existingRate ? 'Edit Rate' : 'Set Rate'} — {item.name}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: '#afa7c2' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs mb-5" style={{ color: '#afa7c2' }}>
          {item.default_rate != null ? `Default rate: ₹${item.default_rate.toFixed(2)} / unit` : 'No default rate set'}
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(255,110,132,0.1)', border: '1px solid rgba(255,110,132,0.2)', color: '#ff6e84' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Custom Rate (₹ per unit) <span style={{ color: '#ff6e84' }}>*</span></label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: '#D4A847' }}>₹</span>
              <input type="number" value={rate} onChange={e => setRate(e.target.value)}
                placeholder="e.g. 3.50" min="0" step="0.01" className={inputCls + ' pl-8'} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ border: '1px solid rgba(189,157,255,0.15)', color: '#afa7c2' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: 'rgba(189,157,255,0.2)', border: '1px solid rgba(189,157,255,0.35)', color: '#bd9dff' }}>
              {saving ? 'Saving…' : 'Save Rate'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
