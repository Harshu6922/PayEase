'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Database } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

const glassModal: React.CSSProperties = {
  background: 'rgba(22,17,38,0.97)',
  backdropFilter: 'blur(32px)',
  WebkitBackdropFilter: 'blur(32px)',
  border: '1px solid rgba(189,157,255,0.15)',
}

const inputCls = `w-full rounded-xl px-4 py-2.5 text-sm text-[#ebe1fe] placeholder-[#afa7c2]/50
  bg-[rgba(189,157,255,0.05)] border border-[rgba(189,157,255,0.1)]
  focus:outline-none focus:border-[#bd9dff]/40 transition-colors`

const labelCls = 'block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[#afa7c2]'

const selectCls = `w-full rounded-xl px-4 py-2.5 text-sm text-[#ebe1fe] appearance-none
  bg-[rgba(189,157,255,0.05)] border border-[rgba(189,157,255,0.1)]
  focus:outline-none focus:border-[#bd9dff]/40 transition-colors`

export default function AddEmployeeModal({
  atSeatLimit = false,
  employeeLimit = 15,
  isSubscribed = true,
}: {
  atSeatLimit?: boolean
  employeeLimit?: number
  isSubscribed?: boolean
}) {
  const router = useRouter()
  const supabase = createClient() as unknown as SupabaseClient<Database>
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    employee_id: '',
    phone_number: '',
    monthly_salary: '',
    standard_working_hours: '8',
    overtime_multiplier: '1.5',
    joining_date: new Date().toISOString().split('T')[0],
    is_active: true,
    worker_type: 'salaried' as 'salaried' | 'commission' | 'daily',
    daily_rate: '',
    default_start_time: '',
    default_end_time: '',
    notes: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (formData.worker_type === 'daily') {
        if (!formData.daily_rate || parseFloat(formData.daily_rate) <= 0) {
          setError('Daily rate must be greater than 0')
          setLoading(false)
          return
        }
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw new Error(`Auth error: ${userError.message}`)
      if (!user) throw new Error('Active session not found. Please log in again.')

      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('company_id').eq('id', user.id).maybeSingle()
      if (profileError) throw new Error('Could not fetch company profile.')
      if (!profile) throw new Error(`No profile found for user: ${user.id}`)
      if (!(profile as any).company_id) throw new Error('Profile missing company_id.')

      const companyId = (profile as any).company_id

      const { error: insertError } = await supabase.from('employees').insert({
        company_id: companyId,
        full_name: formData.full_name,
        employee_id: formData.employee_id,
        monthly_salary: formData.worker_type === 'daily' || formData.worker_type === 'commission'
          ? 0 : parseFloat(formData.monthly_salary),
        standard_working_hours: formData.worker_type === 'commission'
          ? 8 : parseFloat(formData.standard_working_hours),
        overtime_multiplier: formData.worker_type === 'commission' || formData.worker_type === 'daily'
          ? 1 : parseFloat(formData.overtime_multiplier),
        joining_date: formData.joining_date,
        is_active: formData.is_active,
        worker_type: formData.worker_type,
        daily_rate: formData.worker_type === 'daily' ? parseFloat(formData.daily_rate) : null,
        default_start_time: formData.default_start_time || null,
        default_end_time: formData.default_end_time || null,
        phone_number: formData.phone_number.trim() || null,
        notes: formData.notes.trim() || null,
      })

      if (insertError) throw new Error(insertError.message)

      setIsOpen(false)
      setFormData({
        full_name: '',
        employee_id: '',
        phone_number: '',
        monthly_salary: '',
        standard_working_hours: '8',
        overtime_multiplier: '1.5',
        joining_date: new Date().toISOString().split('T')[0],
        is_active: true,
        worker_type: 'salaried',
        daily_rate: '',
        default_start_time: '',
        default_end_time: '',
        notes: '',
      })
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving.')
    } finally {
      setLoading(false)
    }
  }

  if (atSeatLimit) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-warning bg-warning/10 border border-warning/30 rounded-xl px-4 py-2">
          {employeeLimit}-employee limit reached.{' '}
          <a href="/billing" className="font-semibold underline underline-offset-2 hover:text-text">
            Upgrade plan
          </a>
        </span>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => {
          if (!isSubscribed && atSeatLimit) { router.push('/billing'); return }
          if (atSeatLimit) return
          setIsOpen(true)
        }}
        className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all"
        style={{ background: 'rgba(189,157,255,0.15)', border: '1px solid rgba(189,157,255,0.3)', color: '#bd9dff' }}
      >
        <Plus className="h-4 w-4" />
        Add Employee
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            className="relative w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
            style={glassModal}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(189,157,255,0.08)' }}>
              <h2 className="text-lg font-bold" style={{ color: '#ebe1fe' }}>Add Employee</h2>
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: '#afa7c2' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {error && (
                <div className="px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'rgba(255,110,132,0.1)', border: '1px solid rgba(255,110,132,0.2)', color: '#ff6e84' }}>
                  {error}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className={labelCls}>Full Name</label>
                <input type="text" name="full_name" required value={formData.full_name}
                  onChange={handleChange} placeholder="e.g. Ramesh Kumar" className={inputCls} />
              </div>

              {/* Employee ID */}
              <div>
                <label className={labelCls}>Employee ID</label>
                <input type="text" name="employee_id" required value={formData.employee_id}
                  onChange={handleChange} placeholder="e.g. EMP-001" className={inputCls} />
              </div>

              {/* Phone Number */}
              <div>
                <label className={labelCls}>Phone Number <span className="normal-case font-normal opacity-60">(optional)</span></label>
                <input type="tel" name="phone_number" value={formData.phone_number}
                  onChange={handleChange} placeholder="e.g. 9876543210" className={inputCls} />
              </div>

              {/* Worker Type */}
              <div>
                <label className={labelCls}>Worker Type</label>
                <select name="worker_type" value={formData.worker_type} onChange={handleChange} className={selectCls}>
                  <option value="salaried">Salaried</option>
                  <option value="daily">Daily</option>
                  <option value="commission">Commission</option>
                </select>
              </div>

              {/* Monthly Salary — salaried only */}
              {formData.worker_type === 'salaried' && (
                <div>
                  <label className={labelCls}>Monthly Salary (INR)</label>
                  <input type="number" value={formData.monthly_salary} placeholder="e.g. 25000"
                    onChange={e => setFormData(prev => ({ ...prev, monthly_salary: e.target.value }))}
                    className={inputCls} required />
                </div>
              )}

              {/* Daily Rate — daily only */}
              {formData.worker_type === 'daily' && (
                <div>
                  <label className={labelCls}>Daily Rate (INR)</label>
                  <input type="number" value={formData.daily_rate} min="0.01" step="0.01" placeholder="e.g. 800"
                    onChange={e => setFormData(prev => ({ ...prev, daily_rate: e.target.value }))}
                    className={inputCls} required />
                </div>
              )}

              {/* Commission info */}
              {formData.worker_type === 'commission' && (
                <p className="text-sm rounded-xl px-4 py-3"
                  style={{ background: 'rgba(189,157,255,0.05)', border: '1px solid rgba(189,157,255,0.1)', color: '#afa7c2' }}>
                  Commission-based employees have no fixed salary. Earnings are logged separately.
                </p>
              )}

              {/* Working Hours + OT — salaried and daily */}
              {(formData.worker_type === 'salaried' || formData.worker_type === 'daily') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Working Hrs/Day</label>
                    <input type="number" value={formData.standard_working_hours}
                      onChange={e => setFormData(prev => ({ ...prev, standard_working_hours: e.target.value }))}
                      className={inputCls} required />
                  </div>
                  {formData.worker_type === 'salaried' && (
                    <div>
                      <label className={labelCls}>OT Multiplier</label>
                      <input type="number" value={formData.overtime_multiplier} step="0.1"
                        onChange={e => setFormData(prev => ({ ...prev, overtime_multiplier: e.target.value }))}
                        className={inputCls} required />
                    </div>
                  )}
                </div>
              )}

              {/* Shift times — salaried and daily */}
              {(formData.worker_type === 'salaried' || formData.worker_type === 'daily') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Default Start</label>
                    <input type="time" value={formData.default_start_time}
                      onChange={e => setFormData(prev => ({ ...prev, default_start_time: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Default End</label>
                    <input type="time" value={formData.default_end_time}
                      onChange={e => setFormData(prev => ({ ...prev, default_end_time: e.target.value }))}
                      className={inputCls} />
                  </div>
                </div>
              )}

              {/* Joining Date */}
              <div>
                <label className={labelCls}>Joining Date</label>
                <input type="date" name="joining_date" value={formData.joining_date}
                  onChange={handleChange} className={inputCls} />
              </div>

              {/* Notes */}
              <div>
                <label className={labelCls}>Notes <span className="normal-case font-normal opacity-60">(optional)</span></label>
                <textarea name="notes" rows={2} value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Bank details, any other info…"
                  className={inputCls + ' resize-none'} />
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3 pt-1">
                <input type="checkbox" name="is_active" id="add_is_active"
                  checked={formData.is_active} onChange={handleChange}
                  className="h-4 w-4 rounded accent-[#bd9dff]" />
                <label htmlFor="add_is_active" className="text-sm" style={{ color: '#ebe1fe' }}>
                  Active Employee
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 flex-shrink-0"
              style={{ borderTop: '1px solid rgba(189,157,255,0.08)' }}>
              <button type="button" onClick={() => setIsOpen(false)} disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ border: '1px solid rgba(189,157,255,0.15)', color: '#afa7c2' }}>
                Cancel
              </button>
              <button type="button" disabled={loading} onClick={handleSubmit}
                className="px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: 'rgba(189,157,255,0.2)', border: '1px solid rgba(189,157,255,0.35)', color: '#bd9dff' }}>
                {loading ? 'Saving…' : 'Add Employee'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
