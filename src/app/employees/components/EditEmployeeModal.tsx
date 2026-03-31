'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Database } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Employee } from '@/types'

interface Props {
  employee: Employee
}

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

export default function EditEmployeeModal({ employee }: Props) {
  const router = useRouter()
  const supabase = createClient() as unknown as SupabaseClient<Database>
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    full_name: employee.full_name,
    employee_id: employee.employee_id,
    monthly_salary: String(employee.monthly_salary),
    standard_working_hours: String(employee.standard_working_hours),
    overtime_multiplier: String(employee.overtime_multiplier || 1.5),
    joining_date: employee.joining_date,
    is_active: employee.is_active,
    worker_type: employee.worker_type ?? ('salaried' as 'salaried' | 'commission' | 'daily'),
    daily_rate: employee.daily_rate?.toString() ?? '',
    notes: (employee as any).notes ?? '',
    default_start_time: employee.default_start_time?.substring(0, 5) ?? '',
    default_end_time: employee.default_end_time?.substring(0, 5) ?? '',
    phone_number: employee.phone_number ?? '',
    notification_method: (employee.notification_method ?? 'whatsapp') as 'whatsapp' | 'sms' | 'none',
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
      const { error: updateError } = await supabase.from('employees').update({
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
        notes: formData.notes || null,
        daily_rate: formData.worker_type === 'daily' ? parseFloat(formData.daily_rate) : null,
        default_start_time: formData.default_start_time || null,
        default_end_time: formData.default_end_time || null,
        phone_number: formData.phone_number.trim() || null,
        notification_method: formData.phone_number.trim() ? formData.notification_method : 'none',
      }).eq('id', employee.id)

      if (updateError) throw new Error(updateError.message)
      setIsOpen(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm font-semibold transition-colors hover:opacity-80"
        style={{ color: '#bd9dff' }}
      >
        Edit
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
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
              <h2 className="text-lg font-bold" style={{ color: '#ebe1fe' }}>Edit Employee</h2>
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: '#afa7c2' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {error && (
                <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(255,110,132,0.1)', border: '1px solid rgba(255,110,132,0.2)', color: '#ff6e84' }}>
                  {error}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className={labelCls}>Full Name</label>
                <input type="text" name="full_name" required value={formData.full_name} onChange={handleChange} className={inputCls} />
              </div>

              {/* Employee ID */}
              <div>
                <label className={labelCls}>Employee ID</label>
                <input type="text" name="employee_id" required value={formData.employee_id} onChange={handleChange} className={inputCls} />
              </div>

              {/* Phone Number + Notify Via */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Phone Number <span className="normal-case font-normal opacity-60">(optional)</span></label>
                  <input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange}
                    placeholder="e.g. 9876543210" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Notify Via</label>
                  <select name="notification_method" value={formData.notification_method}
                    onChange={handleChange} className={selectCls}
                    disabled={!formData.phone_number.trim()}>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="none">None</option>
                  </select>
                </div>
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
                  <input type="number" value={formData.monthly_salary}
                    onChange={e => setFormData(prev => ({ ...prev, monthly_salary: e.target.value }))}
                    className={inputCls} required />
                </div>
              )}

              {/* Daily Rate — daily only */}
              {formData.worker_type === 'daily' && (
                <div>
                  <label className={labelCls}>Daily Rate (INR)</label>
                  <input type="number" value={formData.daily_rate} min="0.01" step="0.01"
                    onChange={e => setFormData(prev => ({ ...prev, daily_rate: e.target.value }))}
                    className={inputCls} required />
                </div>
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
                <input type="checkbox" name="is_active" id={`is_active_${employee.id}`}
                  checked={formData.is_active} onChange={handleChange}
                  className="h-4 w-4 rounded accent-[#bd9dff]" />
                <label htmlFor={`is_active_${employee.id}`} className="text-sm" style={{ color: '#ebe1fe' }}>
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
              <button type="submit" form="edit-employee-form" disabled={loading}
                onClick={handleSubmit}
                className="px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: 'rgba(189,157,255,0.2)', border: '1px solid rgba(189,157,255,0.35)', color: '#bd9dff' }}>
                {loading ? 'Saving…' : 'Update Employee'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  )
}
