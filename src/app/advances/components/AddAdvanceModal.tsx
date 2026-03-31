'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import GlassSelect from '@/components/ui/GlassSelect'

type EmployeeMinimal = { id: string; full_name: string; employee_id: string }

interface Props {
  employees: EmployeeMinimal[]
  companyId: string
  onSaved: () => void
  onClose: () => void
}

const inputCls = `w-full rounded-xl px-4 py-2.5 text-sm text-[#ebe1fe] placeholder:text-[#afa7c2]/50
  bg-[rgba(189,157,255,0.05)] border border-[rgba(189,157,255,0.1)]
  focus:outline-none focus:border-[#bd9dff]/40 focus:ring-0 transition-colors`

const labelCls = 'block text-xs font-semibold text-[#afa7c2] uppercase tracking-wider mb-1.5'

export default function AddAdvanceModal({ employees, companyId, onSaved, onClose }: Props) {
  const supabase = createClient() as unknown as SupabaseClient<any>
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    employee_id: '',
    amount: '',
    advance_date: new Date().toISOString().split('T')[0],
    note: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!formData.employee_id) { setError('Please select an employee.'); return }
    if (!formData.amount || Number(formData.amount) <= 0) { setError('Please enter a valid amount.'); return }

    setLoading(true)
    try {
      const { error: insertError } = await supabase.from('employee_advances').insert({
        company_id: companyId,
        employee_id: formData.employee_id,
        amount: parseFloat(formData.amount),
        advance_date: formData.advance_date,
        note: formData.note || null,
      })
      if (insertError) throw new Error(insertError.message)
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'rgba(22,17,38,0.95)', border: '1px solid rgba(189,157,255,0.15)', backdropFilter: 'blur(24px)' }}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#4b455c]/20">
          <div>
            <h2 className="text-base font-bold text-[#ebe1fe]">Give Advance</h2>
            <p className="text-xs text-[#afa7c2] mt-0.5">Record a salary advance for an employee</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#afa7c2] hover:text-[#ebe1fe] hover:bg-[#bd9dff]/10 transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <div>
            <label className={labelCls}>Employee</label>
            <GlassSelect
              value={formData.employee_id}
              onChange={v => setFormData(prev => ({ ...prev, employee_id: v }))}
              placeholder="Select employee..."
              options={employees.map(emp => ({ value: emp.id, label: `${emp.full_name} (${emp.employee_id})` }))}
            />
          </div>

          <div>
            <label className={labelCls}>Amount (₹)</label>
            <input type="number" name="amount" required step="1" min="1"
              value={formData.amount} onChange={handleChange}
              placeholder="0" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Date</label>
            <input type="date" name="advance_date" required
              value={formData.advance_date} onChange={handleChange} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Note <span className="text-[#afa7c2]/50 normal-case font-normal">(optional)</span></label>
            <textarea name="note" rows={2} value={formData.note} onChange={handleChange}
              placeholder="Reason for advance..." className={inputCls + ' resize-none'} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={loading}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#afa7c2] hover:text-[#ebe1fe] disabled:opacity-50 transition-colors"
              style={{ background: 'rgba(189,157,255,0.05)', border: '1px solid rgba(189,157,255,0.1)' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 transition-all hover:shadow-[0_0_16px_rgba(189,157,255,0.3)] active:scale-95"
              style={{ background: '#bd9dff', color: '#100b1f' }}>
              {loading ? 'Saving...' : 'Give Advance'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
