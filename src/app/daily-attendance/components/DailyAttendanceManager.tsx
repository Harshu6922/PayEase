'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, getDaysInMonth, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Employee, DailyAttendance } from '@/types'
import PaymentModal from '@/components/PaymentModal'
import WorkerTypeBadge from '@/components/WorkerTypeBadge'

interface Props {
  workers: Employee[]
  companyId: string
  userRole?: 'admin' | 'viewer'
}

interface EditingCell {
  worker: Employee
  date: string
  record: DailyAttendance
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function DailyAttendanceManager({ workers, companyId, userRole = 'admin' }: Props) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  // Mobile: week start date (Monday-based)
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(now, { weekStartsOn: 1 })
  )
  const [records, setRecords] = useState<DailyAttendance[]>([])
  const [loading, setLoading] = useState(false)
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editHours, setEditHours] = useState('')
  const [saving, setSaving] = useState(false)
  const [paymentWorker, setPaymentWorker] = useState<Employee | null>(null)

  const daysInMonth = getDaysInMonth(new Date(year, month - 1))
  const today = format(new Date(), 'yyyy-MM-dd')

  // Week days for mobile view (7 days starting from weekStart)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekLabel = `${format(weekDays[0], 'MMM d')} – ${format(weekDays[6], 'MMM d, yyyy')}`

  // Sync month/year when week changes on mobile
  const syncMonthFromWeek = (ws: Date) => {
    const mid = addDays(ws, 3)
    setMonth(mid.getMonth() + 1)
    setYear(mid.getFullYear())
  }

  const prevWeek = () => {
    const ws = subWeeks(weekStart, 1)
    setWeekStart(ws)
    syncMonthFromWeek(ws)
  }
  const nextWeek = () => {
    const ws = addWeeks(weekStart, 1)
    setWeekStart(ws)
    syncMonthFromWeek(ws)
  }

  // Build lookup map
  const recordMap = new Map<string, DailyAttendance>()
  records.forEach(r => recordMap.set(`${r.employee_id}_${r.date}`, r))

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`
    const { data } = await supabase
      .from('daily_attendance')
      .select('*')
      .eq('company_id', companyId)
      .gte('date', firstDay)
      .lte('date', lastDay)
    setRecords(data || [])
    setLoading(false)
  }, [month, year, companyId, daysInMonth])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const getDateStr = (day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const handleCellClick = async (worker: Employee, dateStr: string) => {
    if (userRole !== 'admin') return
    const existing = recordMap.get(`${worker.id}_${dateStr}`)
    if (existing) {
      setEditingCell({ worker, date: dateStr, record: existing })
      setEditHours(String(existing.hours_worked))
      return
    }
    if (!worker.daily_rate || worker.standard_working_hours <= 0) {
      alert('This worker has no daily rate or invalid working hours set.')
      return
    }
    const hours_worked = worker.standard_working_hours
    const pay_amount = Number((worker.daily_rate).toFixed(2))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any
    const { data, error } = await supabase
      .from('daily_attendance')
      .upsert({ company_id: companyId, employee_id: worker.id, date: dateStr, hours_worked, pay_amount },
               { onConflict: 'employee_id,date' })
      .select().single()
    if (!error && data) {
      setRecords(prev => [...prev.filter(r => !(r.employee_id === worker.id && r.date === dateStr)), data])
    }
  }

  const handleEditSave = async () => {
    if (!editingCell) return
    const { worker, record } = editingCell
    const hours = parseFloat(editHours)
    if (isNaN(hours) || hours <= 0) return
    const pay_amount = Number((hours * ((worker.daily_rate ?? 0) / worker.standard_working_hours)).toFixed(2))
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any
    const { data, error } = await supabase
      .from('daily_attendance').update({ hours_worked: hours, pay_amount })
      .eq('id', record.id).select().single()
    setSaving(false)
    if (!error && data) {
      setRecords(prev => prev.map(r => r.id === record.id ? data : r))
      setEditingCell(null)
    }
  }

  const handleEditRemove = async () => {
    if (!editingCell) return
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any
    const { error } = await supabase.from('daily_attendance').delete().eq('id', editingCell.record.id)
    setSaving(false)
    if (!error) {
      setRecords(prev => prev.filter(r => r.id !== editingCell.record.id))
      setEditingCell(null)
    }
  }

  // Summary
  const summaryMap = new Map<string, { days: number; hours: number; pay: number }>()
  workers.forEach(w => summaryMap.set(w.id, { days: 0, hours: 0, pay: 0 }))
  records.forEach(r => {
    const s = summaryMap.get(r.employee_id)
    if (s) { s.days += 1; s.hours += r.hours_worked; s.pay += r.pay_amount }
  })
  const totalPay = Array.from(summaryMap.values()).reduce((sum, s) => sum + s.pay, 0)
  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy')

  // Get initials from name
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.substring(0, 2).toUpperCase()
  }

  // Shared cell renderer
  const renderCell = (worker: Employee, dateStr: string) => {
    const isFuture = dateStr > today
    const isToday = dateStr === today
    const record = recordMap.get(`${worker.id}_${dateStr}`)
    const isPresent = !!record
    return (
      <td
        key={dateStr}
        onClick={isFuture ? undefined : () => handleCellClick(worker, dateStr)}
        className={`text-center border border-[#7C3AED]/10 transition-colors align-middle
          md:h-14 md:w-12 h-16 w-full
          ${isFuture
            ? 'bg-white/2 cursor-not-allowed opacity-30'
            : isPresent
            ? 'bg-success/20 cursor-pointer'
            : isToday
            ? 'bg-primary/10 cursor-pointer'
            : 'cursor-pointer hover:bg-white/5'
          }`}
      >
        {isPresent ? (
          <div className="flex flex-col items-center justify-center h-full px-1">
            <span className="text-success text-base font-bold leading-none">✓</span>
            <span className="text-success text-xs font-mono font-semibold mt-0.5 leading-none">
              {Math.round(record!.pay_amount)}
            </span>
          </div>
        ) : !isFuture ? (
          <span className="text-text-muted text-xl">·</span>
        ) : null}
      </td>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 md:px-6 pt-6 pb-4 border-b border-[#7C3AED]/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Desktop month nav */}
          <div className="hidden md:flex items-center gap-2">
            <button onClick={prevMonth} className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-white/5 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-text font-semibold w-36 text-center">{monthLabel}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-white/5 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {/* Mobile week nav */}
          <div className="flex md:hidden items-center gap-1">
            <button onClick={prevWeek} className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-white/5 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-text text-sm font-medium w-36 text-center">{weekLabel}</span>
            <button onClick={nextWeek} className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-white/5 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {loading && <span className="text-text-muted text-xs">Loading...</span>}
        </div>

        <div className="flex items-center gap-2">
          <h1 className="hidden md:block text-text font-bold text-lg">Daily Labourers</h1>
          {userRole === 'admin' && (
            <button
              onClick={() => {
                workers.forEach(w => handleCellClick(w, today))
              }}
              className="border border-[#7C3AED]/30 text-text-muted hover:text-text text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              Mark All Present
            </button>
          )}
        </div>
      </div>

      {workers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <p className="text-text-muted font-medium text-lg">No daily workers yet</p>
          <p className="text-text-muted text-sm mt-1 opacity-60">Add employees with Worker Type = Daily</p>
        </div>
      ) : (
        <div className="p-4 md:p-6 space-y-4">

          {/* Mobile: week view */}
          <div className="block md:hidden mb-6 rounded-xl overflow-hidden border border-[#7C3AED]/20">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#7C3AED]/20 bg-surface">
                  <th className="text-left px-3 py-3 font-semibold text-text-muted w-[100px] text-xs uppercase tracking-wide">Worker</th>
                  {weekDays.map((d, i) => {
                    const dateStr = format(d, 'yyyy-MM-dd')
                    const isToday = dateStr === today
                    return (
                      <th key={i} className={`py-2 text-center ${isToday ? 'bg-primary/10' : ''}`}>
                        <div className={`text-[10px] font-medium uppercase ${isToday ? 'text-primary-light' : 'text-text-muted'}`}>{DAY_LABELS[i]}</div>
                        <div className={`text-sm font-bold ${isToday ? 'text-primary-light' : 'text-text'}`}>{format(d, 'd')}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {workers.map((worker) => (
                  <tr key={worker.id} className="border-b border-[#7C3AED]/10 last:border-0 bg-surface/50">
                    <td className="px-3 py-1 font-semibold text-text text-xs leading-tight">{worker.full_name}</td>
                    {weekDays.map(d => renderCell(worker, format(d, 'yyyy-MM-dd')))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Desktop: full month grid */}
          <div className="hidden md:block overflow-x-auto mb-8 rounded-xl border border-[#7C3AED]/20">
            <table className="border-collapse text-sm min-w-full">
              <thead>
                <tr className="border-b border-[#7C3AED]/20 bg-surface">
                  <th className="sticky left-0 bg-surface text-left px-4 py-3 font-semibold text-text-muted min-w-[180px] z-10 border-r border-[#7C3AED]/20 text-xs uppercase tracking-wide">
                    Worker
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const dateStr = getDateStr(day)
                    const isToday = dateStr === today
                    const dayOfWeek = new Date(dateStr).toLocaleDateString('en', { weekday: 'short' })
                    return (
                      <th key={day} className={`px-1 py-2 font-medium text-center w-12 min-w-[48px] ${isToday ? 'bg-primary/10' : ''}`}>
                        <div className={`text-sm font-bold ${isToday ? 'text-primary-light' : 'text-text'}`}>{day}</div>
                        <div className={`text-[10px] uppercase tracking-wide ${isToday ? 'text-primary-light' : 'text-text-muted'}`}>{dayOfWeek}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {workers.map((worker) => (
                  <tr key={worker.id} className="border-b border-[#7C3AED]/10 last:border-0 bg-surface/50 hover:bg-surface transition-colors">
                    <td className="sticky left-0 px-4 py-3 font-semibold text-text z-10 border-r border-[#7C3AED]/20 bg-surface">
                      {worker.full_name}
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day =>
                      renderCell(worker, getDateStr(day))
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Monthly Summary */}
          <div className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#7C3AED]/20 bg-surface">
              <h2 className="text-sm font-semibold text-text uppercase tracking-wide">Monthly Summary — {monthLabel}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#7C3AED]/10">
                    <th className="text-left px-4 py-3 text-text-muted font-medium text-xs uppercase tracking-wide">Worker</th>
                    <th className="text-right px-4 py-3 text-text-muted font-medium text-xs uppercase tracking-wide">Days</th>
                    <th className="text-right px-4 py-3 text-text-muted font-medium text-xs uppercase tracking-wide">Hours</th>
                    <th className="text-right px-4 py-3 text-text-muted font-medium text-xs uppercase tracking-wide">Total Pay</th>
                    <th className="text-right px-4 py-3 text-text-muted font-medium text-xs uppercase tracking-wide">Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map(worker => {
                    const s = summaryMap.get(worker.id)!
                    return (
                      <tr key={worker.id} className="border-b border-[#7C3AED]/10 last:border-0 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-medium text-text">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/20 text-primary-light text-xs font-semibold flex items-center justify-center flex-shrink-0">
                              {getInitials(worker.full_name)}
                            </div>
                            {worker.full_name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-text">{s.days}</td>
                        <td className="px-4 py-3 text-right font-mono text-text">{s.hours}h</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-rupee-gold">Rs. {s.pay.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          {s.pay > 0 && (
                            <button
                              onClick={() => setPaymentWorker(worker)}
                              className="rounded-lg px-3 py-1 text-xs font-semibold bg-primary text-white hover:bg-primary/80 transition-colors"
                            >
                              Pay
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="border-t-2 border-[#7C3AED]/20 bg-surface">
                    <td className="px-4 py-3 font-bold text-text">Total</td>
                    <td className="px-4 py-3 text-right text-text-muted font-mono">—</td>
                    <td className="px-4 py-3 text-right text-text-muted font-mono">—</td>
                    <td className="px-4 py-3 text-right font-bold font-mono text-rupee-gold">Rs. {totalPay.toLocaleString()}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {paymentWorker && (() => {
        const s = summaryMap.get(paymentWorker.id)!
        const monthStr = `${year}-${String(month).padStart(2, '0')}`
        return (
          <PaymentModal
            employee={{ id: paymentWorker.id, full_name: paymentWorker.full_name, employee_id: paymentWorker.employee_id }}
            month={monthStr}
            currentMonthPayable={s.pay}
            companyId={companyId}
            outstandingAdvances={{ totalOutstanding: 0, advances: [] }}
            onClose={() => setPaymentWorker(null)}
            onPaymentRecorded={() => {}}
          />
        )
      })()}

      {/* Edit popup */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="backdrop-blur-md bg-surface border border-[#7C3AED]/30 rounded-t-2xl md:rounded-2xl shadow-xl w-full md:w-96 p-6 pb-8 md:pb-6">
            <div className="w-10 h-1 bg-[#7C3AED]/30 rounded-full mx-auto mb-4 md:hidden" />
            <h3 className="font-bold text-text text-lg">{editingCell.worker.full_name}</h3>
            <p className="text-text-muted text-sm mb-5">
              {format(new Date(editingCell.date), 'EEEE, MMMM d yyyy')}
            </p>
            <label className="block text-sm font-medium text-text-muted mb-2">Hours Worked</label>
            <input
              type="number"
              value={editHours}
              onChange={e => setEditHours(e.target.value)}
              className="w-full bg-background border border-[#7C3AED]/30 rounded-xl px-4 py-3 text-lg font-mono text-text mb-5 focus:outline-none focus:border-primary/50"
              min="0.5"
              step="0.5"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/80 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleEditRemove}
                disabled={saving}
                className="bg-danger/20 text-danger border border-danger/30 py-3 rounded-xl font-semibold hover:bg-danger/30 disabled:opacity-50 transition-colors"
              >
                Remove
              </button>
            </div>
            <button
              onClick={() => setEditingCell(null)}
              disabled={saving}
              className="w-full py-3 rounded-xl border border-[#7C3AED]/20 text-text-muted font-medium hover:bg-white/5 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
