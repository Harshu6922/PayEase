'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { CommissionItem } from '@/types'

interface Props {
  item: CommissionItem | null
  companyId: string
  onSave: (item: CommissionItem) => void
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

export default function CommissionItemModal({ item, companyId, onSave, onClose }: Props) {
  const [name, setName] = useState('')
  const [defaultRate, setDefaultRate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(item?.name ?? '')
    setDefaultRate(item?.default_rate?.toString() ?? '')
  }, [item])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) { setError('Item name is required.'); return }

    let parsedRate: number | null = null
    if (defaultRate.trim() !== '') {
      const val = parseFloat(defaultRate)
      if (isNaN(val) || val < 0) { setError('Default rate must be a valid non-negative number.'); return }
      parsedRate = val
    }

    setSaving(true)
    try {
      const supabase = createClient() as unknown as SupabaseClient<Database>

      if (item) {
        const { data, error: updateError } = await supabase
          .from('commission_items')
          .update({ name: name.trim(), default_rate: parsedRate })
          .eq('id', item.id)
          .select('*')
          .single()
        if (updateError) throw updateError
        onSave(data as CommissionItem)
      } else {
        const { data, error: insertError } = await supabase
          .from('commission_items')
          .insert({ company_id: companyId, name: name.trim(), default_rate: parsedRate })
          .select('*')
        if (insertError) throw insertError
        if (!data || data.length === 0) throw new Error('No data returned from insert.')
        onSave(data[0] as CommissionItem)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
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
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={glassModal}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: '#ebe1fe' }}>
            {item ? 'Edit Commission Item' : 'Add Commission Item'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: '#afa7c2' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl px-4 py-3"
            style={{ background: 'rgba(255,110,132,0.1)', border: '1px solid rgba(255,110,132,0.2)' }}>
            <p className="text-sm" style={{ color: '#ff6e84' }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelCls}>Item Name <span style={{ color: '#ff6e84' }}>*</span></label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Stitching"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Default Rate (optional)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: '#D4A847' }}>₹</span>
              <input
                type="number"
                value={defaultRate}
                onChange={e => setDefaultRate(e.target.value)}
                placeholder="2.50"
                min="0"
                step="0.01"
                className={inputCls + ' pl-8'}
              />
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: '#afa7c2' }}>Rate per piece — can be overridden per work entry</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ border: '1px solid rgba(189,157,255,0.15)', color: '#afa7c2' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: 'rgba(189,157,255,0.2)', border: '1px solid rgba(189,157,255,0.35)', color: '#bd9dff' }}
            >
              {saving ? 'Saving…' : 'Save Item'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
