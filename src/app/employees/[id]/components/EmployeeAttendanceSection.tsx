'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, parse, getDaysInMonth, startOfMonth } from 'date-fns'
import type { Employee } from '@/types'

type AttendanceStatus = 'Present' | 'Absent' | 'Half Day'

interface DayRecord {
  date: string
  status: AttendanceStatus
  start_time: string
  end_time: string
  worked_hours: number
  overtime_hours: number
  overtime_amount: number
  deduction_amount: number
  exists: boolean   // whether a DB row exists for this date
  dirty: boolean    // whether user has made unsaved changes
}

function calcHours(start: string, end: string) {
  const [sH, sM] = start.split(':').map(Number)
  const [eH, eM] = end.split(':').map(Number)
  return Math.max(0, (eH + eM / 60) - (sH + sM / 60))
}

export default function EmployeeAttendanceSection({
  employee,
  companyId,
}: {
  employee: Employee
  companyId: string
}) {
  const supabase = createClient() as any

  const today = new Date()
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
  const [days, setDays] = useState<DayRecord[]>([])
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)  // date being saved
  const [error, setError] = useState<string | null>(null)
  const [savedDates, setSavedDates] = useState<Set<string>>(new Set())

  const defaultStart = employee.default_start_time?.substring(0, 5) || '09:00'
  const defaultEnd = employee.default_end_time?.substring(0, 5) || '17:00'

  const buildDays = useCallback((existing: any[]) => {
    const [yr, mo] = month.split('-').map(Number)
    const daysInMonth = getDaysInMonth(new Date(yr, mo - 1))
    const standardHours = Number(employee.standard_working_hours) || 8
    const daysInMonthCount = getDaysInMonth(new Date(yr, mo - 1))
    const dailyWage = Number(employee.monthly_salary) / daysInMonthCount

    const result: DayRecord[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${month}-${String(d).padStart(2, '0')}`
      const rec = existing.find((r: any) => r.date === dateStr)
      if (rec) {
        result.push({
          date: dateStr,
          status: rec.status as AttendanceStatus,
          start_time: rec.start_time?.substring(0, 5) || defaultStart,
          end_time: rec.end_time?.substring(0, 5) || defaultEnd,
          worked_hours: Number(rec.worked_hours),
          overtime_hours: Number(rec.overtime_hours || 0),
          overtime_amount: Number(rec.overtime_amount || 0),
          deduction_amount: Number(rec.deduction_amount || 0),
          exists: true,
          dirty: false,
        })
      } else {
        result.push({
          date: dateStr,
          status: 'Absent',
          start_time: defaultStart,
          end_time: defaultEnd,
          worked_hours: 0,
          overtime_hours: 0,
          overtime_amount: 0,
          deduction_amount: dailyWage,
          exists: false,
          dirty: false,
        })
      }
    }
    return result
  }, [month, employee, defaultStart, defaultEnd])

  const fetchRecords = useCallback(async () => {
    setFetching(true)
    setError(null)
    const [yr, mo] = month.split('-').map(Number)
    const daysInMonth = getDaysInMonth(new Date(yr, mo - 1))
    const startDate = `${month}-01`
    const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`

    const { data, error: fetchErr } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employee.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (fetchErr) {
      setError(fetchErr.message)
      setFetching(false)
      return
    }
    setDays(buildDays(data || []))
    setSavedDates(new Set())
    setFetching(false)
  }, [month, employee.id, supabase, buildDays])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const updateDay = (date: string, patch: Partial<DayRecord>) => {
    setDays(prev => prev.map(d => d.date === date ? { ...d, ...patch, dirty: true } : d))
  }

  const saveDay = async (day: DayRecord) => {
    setSaving(day.date)
    setError(null)

    const [yr, mo] = month.split('-').map(Number)
    const daysInMonthCount = getDaysInMonth(new Date(yr, mo - 1))
    const standardHours = Number(employee.standard_working_hours) || 8
    const dailyWage = Number(employee.monthly_salary) / daysInMonthCount
    const hourlyRate = dailyWage / standardHours

    let startTime = day.status === 'Absent' ? '00:00' : day.start_time
    let endTime = day.status === 'Absent' ? '00:00' : day.end_time
    if (day.status === 'Half Day') {
      const [sH] = startTime.split(':').map(Number)
      endTime = `${String(sH + Math.floor(standardHours / 2)).padStart(2, '0')}:00`
    }

    let workedHours = 0
    let dailyPay = dailyWage
    if (day.status === 'Absent') {
      workedHours = 0; dailyPay = 0
    } else if (day.status === 'Half Day') {
      workedHours = standardHours / 2; dailyPay = dailyWage / 2
    } else {
      workedHours = calcHours(startTime, endTime)
      const short = standardHours - workedHours
      if (short > 0) dailyPay = dailyWage - short * hourlyRate
    }

    const deductionHours = day.status === 'Absent' ? standardHours
      : day.status === 'Half Day' ? standardHours / 2
      : Math.max(0, standardHours - workedHours)
    const deductionAmount = dailyWage - Math.min(dailyPay, dailyWage)

    const { error: upsertErr } = await supabase
      .from('attendance_records')
      .upsert({
        company_id: companyId,
        employee_id: employee.id,
        date: day.date,
        status: day.status,
        start_time: startTime,
        end_time: endTime,
        daily_wage: dailyWage,
        hourly_rate: hourlyRate,
        worked_hours: workedHours,
        daily_pay: dailyPay,
        overtime_hours: 0,
        overtime_amount: 0,
        deduction_hours: deductionHours,
        deduction_amount: deductionAmount,
      }, { onConflict: 'employee_id,date' })

    if (upsertErr) {
      setError(upsertErr.message)
    } else {
      setDays(prev => prev.map(d => d.date === day.date ? { ...d, dirty: false, exists: true, worked_hours: workedHours, deduction_amount: deductionAmount } : d))
      setSavedDates(prev => new Set(prev).add(day.date))
      setTimeout(() => setSavedDates(prev => { const s = new Set(prev); s.delete(day.date); return s }), 2000)
    }
    setSaving(null)
  }

  const dirtyCount = days.filter(d => d.dirty).length

  const saveAll = async () => {
    for (const day of days.filter(d => d.dirty)) {
      await saveDay(day)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Attendance</h2>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {dirtyCount > 0 && (
            <button
              onClick={saveAll}
              disabled={!!saving}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? 'Saving…' : `Save ${dirtyCount} change${dirtyCount > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {fetching ? (
        <p className="text-sm text-gray-400 py-4 text-center">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-2 pr-4 text-left text-xs font-semibold text-gray-500 uppercase w-28">Date</th>
                <th className="py-2 pr-4 text-left text-xs font-semibold text-gray-500 uppercase w-36">Status</th>
                <th className="py-2 pr-4 text-left text-xs font-semibold text-gray-500 uppercase">Start</th>
                <th className="py-2 pr-4 text-left text-xs font-semibold text-gray-500 uppercase">End</th>
                <th className="py-2 pr-4 text-right text-xs font-semibold text-gray-500 uppercase">Worked hrs</th>
                <th className="py-2 text-right text-xs font-semibold text-gray-500 uppercase w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {days.map(day => {
                const dayName = format(parse(day.date, 'yyyy-MM-dd', new Date()), 'EEE')
                const dayNum = format(parse(day.date, 'yyyy-MM-dd', new Date()), 'd MMM')
                const isAbsent = day.status === 'Absent'
                const isSaving = saving === day.date
                const isSaved = savedDates.has(day.date)
                return (
                  <tr key={day.date} className={`${day.dirty ? 'bg-yellow-50' : ''} hover:bg-gray-50 transition-colors`}>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{dayNum}</span>
                      <span className="text-gray-400 text-xs ml-1">{dayName}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <select
                        value={day.status}
                        onChange={e => updateDay(day.date, { status: e.target.value as AttendanceStatus })}
                        className={`rounded-md border px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                          day.status === 'Present' ? 'bg-green-50 border-green-200 text-green-700' :
                          day.status === 'Absent' ? 'bg-red-50 border-red-200 text-red-700' :
                          'bg-orange-50 border-orange-200 text-orange-700'
                        }`}
                      >
                        <option value="Present">Present</option>
                        <option value="Half Day">Half Day</option>
                        <option value="Absent">Absent</option>
                      </select>
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="time"
                        value={day.start_time}
                        disabled={isAbsent}
                        onChange={e => updateDay(day.date, { start_time: e.target.value })}
                        className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-900 disabled:opacity-40 disabled:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="time"
                        value={day.end_time}
                        disabled={isAbsent || day.status === 'Half Day'}
                        onChange={e => updateDay(day.date, { end_time: e.target.value })}
                        className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-900 disabled:opacity-40 disabled:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-500">
                      {isAbsent ? '—' : day.status === 'Half Day' ? `${(Number(employee.standard_working_hours) / 2).toFixed(1)}h` : `${calcHours(day.start_time, day.end_time).toFixed(1)}h`}
                    </td>
                    <td className="py-2 text-right">
                      {isSaved ? (
                        <span className="text-xs text-green-600 font-medium">Saved ✓</span>
                      ) : day.dirty ? (
                        <button
                          onClick={() => saveDay(day)}
                          disabled={isSaving}
                          className="rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                        >
                          {isSaving ? '…' : 'Save'}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
