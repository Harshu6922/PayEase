'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, getDaysInMonth } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { Employee, DailyAttendance } from '@/types'

interface Props {
  workers: Employee[]
  companyId: string
}

interface EditingCell {
  worker: Employee
  date: string
  record: DailyAttendance
}

export default function DailyAttendanceManager({ workers, companyId }: Props) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-indexed
  const [year, setYear] = useState(now.getFullYear())
  const [records, setRecords] = useState<DailyAttendance[]>([])
  const [loading, setLoading] = useState(false)
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editHours, setEditHours] = useState('')
  const [saving, setSaving] = useState(false)

  const daysInMonth = getDaysInMonth(new Date(year, month - 1))
  const today = format(new Date(), 'yyyy-MM-dd')

  // Build lookup map: "employeeId_date" -> record
  const recordMap = new Map<string, DailyAttendance>()
  records.forEach(r => recordMap.set(`${r.employee_id}_${r.date}`, r))

  // Fetch records for selected month
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

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

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

    // Guard
    if (!worker.daily_rate || worker.standard_working_hours <= 0) {
      alert('This worker has no daily rate or invalid working hours set.')
      return
    }

    // Mark present at full day
    const hours_worked = worker.standard_working_hours
    const pay_amount = Number((hours_worked * (worker.daily_rate / worker.standard_working_hours)).toFixed(2))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any
    const { data, error } = await supabase
      .from('daily_attendance')
      .upsert({ company_id: companyId, employee_id: worker.id, date: dateStr, hours_worked, pay_amount },
               { onConflict: 'employee_id,date' })
      .select()
      .single()

    if (!error && data) {
      setRecords(prev => [...prev.filter(r => !(r.employee_id === worker.id && r.date === dateStr)), data])
    }
  }

  const handleEditSave = async () => {
    if (!editingCell) return
    const { worker, date, record } = editingCell
    const hours = parseFloat(editHours)
    if (isNaN(hours) || hours <= 0) return

    const pay_amount = Number((hours * ((worker.daily_rate ?? 0) / worker.standard_working_hours)).toFixed(2))
    setSaving(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any
    const { data, error } = await supabase
      .from('daily_attendance')
      .update({ hours_worked: hours, pay_amount })
      .eq('id', record.id)
      .select()
      .single()

    setSaving(false)
    if (!error && data) {
      setRecords(prev => prev.map(r => r.id === record.id ? data : r))
      setEditingCell(null)
    }
  }

  const handleEditRemove = async () => {
    if (!editingCell) return
    const { record } = editingCell
    setSaving(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any
    const { error } = await supabase.from('daily_attendance').delete().eq('id', record.id)

    setSaving(false)
    if (!error) {
      setRecords(prev => prev.filter(r => r.id !== record.id))
      setEditingCell(null)
    }
  }

  // Summary totals per worker
  const summaryMap = new Map<string, { days: number; hours: number; pay: number }>()
  workers.forEach(w => summaryMap.set(w.id, { days: 0, hours: 0, pay: 0 }))
  records.forEach(r => {
    const s = summaryMap.get(r.employee_id)
    if (s) { s.days += 1; s.hours += r.hours_worked; s.pay += r.pay_amount }
  })
  const totalPay = Array.from(summaryMap.values()).reduce((sum, s) => sum + s.pay, 0)

  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy')

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Daily Attendance</h1>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-lg leading-none">‹</button>
          <span className="text-lg font-semibold text-gray-800 w-44 text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-lg leading-none">›</button>
        </div>
      </div>

      {workers.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No daily workers found. Add employees with Worker Type = Daily.</p>
      ) : (
        <>
          {/* Grid */}
          <div className="overflow-x-auto mb-8 rounded-lg shadow">
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
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const dateStr = getDateStr(day)
                      const isFuture = dateStr > today
                      const isToday = dateStr === today
                      const record = recordMap.get(`${worker.id}_${dateStr}`)
                      const isPresent = !!record

                      return (
                        <td
                          key={day}
                          onClick={isFuture ? undefined : () => handleCellClick(worker, dateStr)}
                          className={`text-center border border-gray-100 transition-colors h-14 w-12 align-middle ${
                            isFuture
                              ? 'bg-gray-100 cursor-not-allowed'
                              : isPresent
                              ? 'bg-green-500 cursor-pointer hover:bg-green-600'
                              : isToday
                              ? 'bg-blue-50 cursor-pointer hover:bg-blue-100'
                              : 'cursor-pointer hover:bg-green-50'
                          }`}
                        >
                          {isPresent ? (
                            <div className="flex flex-col items-center justify-center h-full px-1">
                              <span className="text-white text-base font-bold leading-none">✓</span>
                              <span className="text-white text-[11px] font-semibold mt-0.5 leading-none">
                                {Math.round(record!.pay_amount)}
                              </span>
                            </div>
                          ) : !isFuture ? (
                            <span className="text-gray-300 text-lg">·</span>
                          ) : null}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && (
              <div className="text-center py-4 text-gray-500 text-sm">Loading attendance data...</div>
            )}
          </div>

          {/* Monthly Summary */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Monthly Summary — {monthLabel}</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4 text-gray-600 font-medium">Worker</th>
                  <th className="text-right p-4 text-gray-600 font-medium">Days Present</th>
                  <th className="text-right p-4 text-gray-600 font-medium">Total Hours</th>
                  <th className="text-right p-4 text-gray-600 font-medium">Total Pay</th>
                </tr>
              </thead>
              <tbody>
                {workers.map(worker => {
                  const s = summaryMap.get(worker.id)!
                  return (
                    <tr key={worker.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="p-4 font-medium">{worker.full_name}</td>
                      <td className="p-4 text-right">{s.days}</td>
                      <td className="p-4 text-right">{s.hours}h</td>
                      <td className="p-4 text-right">Rs. {s.pay.toLocaleString()}</td>
                    </tr>
                  )
                })}
                <tr className="border-t-2 bg-gray-50 font-semibold">
                  <td className="p-4">Total</td>
                  <td className="p-4 text-right">—</td>
                  <td className="p-4 text-right">—</td>
                  <td className="p-4 text-right">Rs. {totalPay.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Edit popup */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80">
            <h3 className="font-semibold text-gray-900 mb-1">{editingCell.worker.full_name}</h3>
            <p className="text-gray-500 text-sm mb-4">{editingCell.date}</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hours Worked</label>
            <input
              type="number"
              value={editHours}
              onChange={e => setEditHours(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
              min="0.5"
              step="0.5"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleEditRemove}
                disabled={saving}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Remove
              </button>
              <button
                onClick={() => setEditingCell(null)}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
