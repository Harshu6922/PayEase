'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

interface Props {
  advanceId: string
  employeeId: string
  companyId: string
  remaining: number
  onSaved: () => void
  onClose: () => void
}

const formatRs = (n: number) =>
  '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })

const inputCls = `w-full rounded-xl px-4 py-2.5 text-sm text-[#ebe1fe] placeholder:text-[#afa7c2]/50
  bg-[rgba(189,157,255,0.05)] border border-[rgba(189,157,255,0.1)]
  focus:outline-none focus:border-[#bd9dff]/40 focus:ring-0 transition-colors`

const labelCls = 'block text-xs font-semibold text-[#afa7c2] uppercase tracking-wider mb-1.5'

export default function LogRepaymentModal({ advanceId, employeeId, companyId, remaining, onSaved, onClose }: Props) {
  const supabase = createClient() as unknown as any
  const today = new Date().toISOString().split('T')[0]

  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [method, setMethod] = useState<'cash' | 'salary_deduction'>('cash')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount.'); return }
    if (amt > remaining) { setError(`Amount exceeds outstanding balance of ${formatRs(remaining)}.`); return }

    setSaving(true)
    const { error: err } = await supabase.from('advance_repayments').insert({
      company_id: companyId,
      advance_id: advanceId,
      employee_id: employeeId,
      amount: amt,
      repayment_date: date,
      method,
      note: note.trim() || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'rgba(22,17,38,0.95)', border: '1px solid rgba(189,157,255,0.15)', backdropFilter: 'blur(24px)' }}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#4b455c]/20">
          <div>
            <h2 className="text-base font-bold text-[#ebe1fe]">Log Repayment</h2>
            <p className="text-xs text-[#afa7c2] mt-0.5">Outstanding: {formatRs(remaining)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#afa7c2] hover:text-[#ebe1fe] hover:bg-[#bd9dff]/10 transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <div>
            <label className={labelCls}>Amount (₹) <span className="text-red-400">*</span></label>
            <input type="number" min="0.01" step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)} placeholder="0"
              className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Date <span className="text-red-400">*</span></label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Method <span className="text-red-400">*</span></label>
            <select value={method} onChange={e => setMethod(e.target.value as 'cash' | 'salary_deduction')} className={inputCls}>
              <option value="cash" style={{ background: '#1c162e' }}>Cash</option>
              <option value="salary_deduction" style={{ background: '#1c162e' }}>Salary Deduction</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Note <span className="text-[#afa7c2]/50 normal-case font-normal">(optional)</span></label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              placeholder="Any details..." className={inputCls} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#afa7c2] hover:text-[#ebe1fe] disabled:opacity-50 transition-colors"
              style={{ background: 'rgba(189,157,255,0.05)', border: '1px solid rgba(189,157,255,0.1)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 transition-all hover:shadow-[0_0_16px_rgba(189,157,255,0.3)] active:scale-95"
              style={{ background: '#bd9dff', color: '#100b1f' }}>
              {saving ? 'Saving...' : 'Log Repayment'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
