'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, getDaysInMonth, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { Employee, DailyAttendance } from '@/types'
import PaymentModal from '@/components/PaymentModal'

interface Props {
  workers: Employee[]
  companyId: string
}

interface EditingCell {
  worker: Employee
  date: string
  record: DailyAttendance
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function DailyAttendanceManager({ workers, companyId }: Props) {
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
        className={`text-center border border-gray-100 transition-colors align-middle
          md:h-14 md:w-12 h-16 w-full
          ${isFuture
            ? 'bg-gray-100 cursor-not-allowed'
            : isPresent
            ? 'bg-green-500 cursor-pointer active:bg-green-700'
            : isToday
            ? 'bg-blue-50 cursor-pointer active:bg-blue-100'
            : 'cursor-pointer active:bg-green-50'
          }`}
      >
        {isPresent ? (
          <div className="flex flex-col items-center justify-center h-full px-1">
            <span className="text-white text-lg font-bold leading-none">✓</span>
            <span className="text-white text-xs font-semibold mt-1 leading-none">
              {Math.round(record!.pay_amount)}
            </span>
          </div>
        ) : !isFuture ? (
          <span className="text-gray-300 text-xl">·</span>
        ) : null}
      </td>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 md:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Daily Attendance</h1>
          {/* Desktop month picker */}
          <div className="hidden md:flex items-center gap-2">
            <button onClick={prevMonth} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-lg">‹</button>
            <span className="text-lg font-semibold text-gray-800 w-44 text-center">{monthLabel}</span>
            <button onClick={nextMonth} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-lg">›</button>
          </div>
          {/* Mobile week picker */}
          <div className="flex md:hidden items-center gap-1">
            <button onClick={prevWeek} className="p-2 rounded-lg border border-gray-300 active:bg-gray-100 text-gray-700 font-bold text-lg">‹</button>
            <span className="text-sm font-medium text-gray-700 w-36 text-center">{weekLabel}</span>
            <button onClick={nextWeek} className="p-2 rounded-lg border border-gray-300 active:bg-gray-100 text-gray-700 font-bold text-lg">›</button>
          </div>
        </div>
        {loading && <div className="text-xs text-gray-400 mt-1">Loading...</div>}
      </div>

      {workers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="text-5xl mb-4">👷</div>
          <p className="text-gray-600 font-medium">No daily workers yet</p>
          <p className="text-gray-400 text-sm mt-1">Add employees with Worker Type = Daily</p>
        </div>
      ) : (
        <div className="p-4 md:p-6">

          {/* ── MOBILE: week view ── */}
          <div className="block md:hidden mb-6 rounded-xl overflow-hidden shadow-sm border border-gray-200">
            <table className="w-full border-collapse bg-white text-sm">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-left px-3 py-3 font-semibold text-gray-600 w-[110px]">Worker</th>
                  {weekDays.map((d, i) => {
                    const dateStr = format(d, 'yyyy-MM-dd')
                    const isToday = dateStr === today
                    return (
                      <th key={i} className={`py-2 text-center ${isToday ? 'bg-blue-50' : ''}`}>
                        <div className={`text-[11px] font-medium uppercase ${isToday ? 'text-blue-500' : 'text-gray-400'}`}>{DAY_LABELS[i]}</div>
                        <div className={`text-base font-bold ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>{format(d, 'd')}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {workers.map((worker, idx) => (
                  <tr key={worker.id} className={`border-b last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-3 py-1 font-semibold text-gray-900 text-xs leading-tight">{worker.full_name}</td>
                    {weekDays.map(d => renderCell(worker, format(d, 'yyyy-MM-dd')))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── DESKTOP: full month grid ── */}
          <div className="hidden md:block overflow-x-auto mb-8 rounded-xl shadow-sm border border-gray-200">
            <table className="border-collapse bg-white text-sm min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="sticky left-0 bg-gray-50 text-left px-4 py-3 font-semibold text-gray-700 min-w-[180px] z-10 border-r border-gray-200">
                    Worker
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const dateStr = getDateStr(day)
                    const isToday = dateStr === today
                    const dayOfWeek = new Date(dateStr).toLocaleDateString('en', { weekday: 'short' })
                    return (
                      <th key={day} className={`px-1 py-2 font-medium text-center w-12 min-w-[48px] ${isToday ? 'bg-blue-50' : ''}`}>
                        <div className={`text-base font-bold ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>{day}</div>
                        <div className={`text-[10px] uppercase tracking-wide ${isToday ? 'text-blue-400' : 'text-gray-400'}`}>{dayOfWeek}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {workers.map((worker, idx) => (
                  <tr key={worker.id} className={`border-b last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="sticky left-0 px-4 py-3 font-semibold text-gray-900 z-10 border-r border-gray-200 bg-inherit">
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="text-base font-semibold text-gray-900">Monthly Summary — {monthLabel}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Worker</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Days</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Hours</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Total Pay</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map(worker => {
                    const s = summaryMap.get(worker.id)!
                    return (
                      <tr key={worker.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium text-gray-900">{worker.full_name}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{s.days}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{s.hours}h</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">Rs. {s.pay.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          {s.pay > 0 && (
                            <button
                              onClick={() => setPaymentWorker(worker)}
                              className="rounded px-2 py-1 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                            >
                              Pay
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="px-4 py-3 font-bold text-gray-900">Total</td>
                    <td className="px-4 py-3 text-right text-gray-400">—</td>
                    <td className="px-4 py-3 text-right text-gray-400">—</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">Rs. {totalPay.toLocaleString()}</td>
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
            onClose={() => setPaymentWorker(null)}
            onPaymentRecorded={() => {}}
          />
        )
      })()}

      {/* Edit popup */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:w-96 p-6 pb-8 md:pb-6">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 md:hidden" />
            <h3 className="font-bold text-gray-900 text-lg">{editingCell.worker.full_name}</h3>
            <p className="text-gray-400 text-sm mb-5">
              {format(new Date(editingCell.date), 'EEEE, MMMM d yyyy')}
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hours Worked</label>
            <input
              type="number"
              value={editHours}
              onChange={e => setEditHours(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg mb-5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0.5"
              step="0.5"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleEditRemove}
                disabled={saving}
                className="bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 active:bg-red-700 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
            <button
              onClick={() => setEditingCell(null)}
              disabled={saving}
              className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
