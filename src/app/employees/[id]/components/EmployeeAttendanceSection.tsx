'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, parse, getDaysInMonth } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
  exists: boolean
  dirty: boolean
}

function calcHours(start: string, end: string) {
  const [sH, sM] = start.split(':').map(Number)
  const [eH, eM] = end.split(':').map(Number)
  return Math.max(0, (eH + eM / 60) - (sH + sM / 60))
}

const glassCard: React.CSSProperties = {
  background: 'rgba(28,22,46,0.6)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(189,157,255,0.1)',
}

const timeInputCls = `rounded-lg px-2 py-1.5 text-xs text-[#ebe1fe] w-[82px]
  bg-[rgba(189,157,255,0.05)] border border-[rgba(189,157,255,0.1)]
  focus:outline-none focus:border-[#bd9dff]/40 transition-colors
  disabled:opacity-30 disabled:cursor-not-allowed`

function statusStyle(s: AttendanceStatus): React.CSSProperties {
  if (s === 'Present') return { background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }
  if (s === 'Absent')  return { background: 'rgba(255,110,132,0.12)', color: '#ff6e84', border: '1px solid rgba(255,110,132,0.2)' }
  return { background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }
}

export default function EmployeeAttendanceSection({ employee, companyId }: { employee: Employee; companyId: string }) {
  const supabase = createClient() as any

  const today = new Date()
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
  const [days, setDays] = useState<DayRecord[]>([])
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedDates, setSavedDates] = useState<Set<string>>(new Set())

  const defaultStart = employee.default_start_time?.substring(0, 5) || '09:00'
  const defaultEnd = employee.default_end_time?.substring(0, 5) || '17:00'

  const buildDays = useCallback((existing: any[]) => {
    const [yr, mo] = month.split('-').map(Number)
    const daysInMonth = getDaysInMonth(new Date(yr, mo - 1))
    const dailyWage = Number(employee.monthly_salary) / daysInMonth
    const result: DayRecord[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${month}-${String(d).padStart(2, '0')}`
      const rec = existing.find((r: any) => r.date === dateStr)
      if (rec) {
        result.push({
          date: dateStr, status: rec.status as AttendanceStatus,
          start_time: rec.start_time?.substring(0, 5) || defaultStart,
          end_time: rec.end_time?.substring(0, 5) || defaultEnd,
          worked_hours: Number(rec.worked_hours), overtime_hours: Number(rec.overtime_hours || 0),
          overtime_amount: Number(rec.overtime_amount || 0), deduction_amount: Number(rec.deduction_amount || 0),
          exists: true, dirty: false,
        })
      } else {
        result.push({
          date: dateStr, status: 'Absent', start_time: defaultStart, end_time: defaultEnd,
          worked_hours: 0, overtime_hours: 0, overtime_amount: 0, deduction_amount: dailyWage,
          exists: false, dirty: false,
        })
      }
    }
    return result
  }, [month, employee, defaultStart, defaultEnd])

  const fetchRecords = useCallback(async () => {
    setFetching(true); setError(null)
    const [yr, mo] = month.split('-').map(Number)
    const daysInMonth = getDaysInMonth(new Date(yr, mo - 1))
    const { data, error: fetchErr } = await supabase
      .from('attendance_records').select('*')
      .eq('employee_id', employee.id)
      .gte('date', `${month}-01`).lte('date', `${month}-${String(daysInMonth).padStart(2, '0')}`)
      .order('date', { ascending: true })
    if (fetchErr) { setError(fetchErr.message); setFetching(false); return }
    setDays(buildDays(data || [])); setSavedDates(new Set()); setFetching(false)
  }, [month, employee.id, supabase, buildDays])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const updateDay = (date: string, patch: Partial<DayRecord>) =>
    setDays(prev => prev.map(d => d.date === date ? { ...d, ...patch, dirty: true } : d))

  const saveDay = async (day: DayRecord) => {
    setSaving(day.date); setError(null)
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
    let workedHours = 0, dailyPay = dailyWage
    if (day.status === 'Absent') { workedHours = 0; dailyPay = 0 }
    else if (day.status === 'Half Day') { workedHours = standardHours / 2; dailyPay = dailyWage / 2 }
    else {
      workedHours = calcHours(startTime, endTime)
      const short = standardHours - workedHours
      if (short > 0) dailyPay = dailyWage - short * hourlyRate
    }
    const deductionHours = day.status === 'Absent' ? standardHours : day.status === 'Half Day' ? standardHours / 2 : Math.max(0, standardHours - workedHours)
    const deductionAmount = dailyWage - Math.min(dailyPay, dailyWage)

    const { error: upsertErr } = await supabase.from('attendance_records').upsert({
      company_id: companyId, employee_id: employee.id, date: day.date,
      status: day.status, start_time: startTime, end_time: endTime,
      daily_wage: dailyWage, hourly_rate: hourlyRate, worked_hours: workedHours,
      daily_pay: dailyPay, overtime_hours: 0, overtime_amount: 0,
      deduction_hours: deductionHours, deduction_amount: deductionAmount,
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
  const saveAll = async () => { for (const day of days.filter(d => d.dirty)) await saveDay(day) }

  // Month navigation
  const changeMonth = (delta: number) => {
    const [yr, mo] = month.split('-').map(Number)
    const d = new Date(yr, mo - 1 + delta, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const monthLabel = format(parse(month + '-01', 'yyyy-MM-dd', new Date()), 'MMMM yyyy')

  return (
    <section className="rounded-[20px] overflow-hidden" style={glassCard}>
      {/* Section header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-8 py-6"
        style={{ borderBottom: '1px solid rgba(189,157,255,0.08)' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl" style={{ background: 'rgba(189,157,255,0.1)' }}>
            <svg className="w-5 h-5" fill="none" stroke="#bd9dff" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-xl" style={{ color: '#ebe1fe' }}>Attendance</h3>
            <p className="text-sm" style={{ color: '#afa7c2' }}>{monthLabel} logs</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Month nav */}
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(189,157,255,0.05)', border: '1px solid rgba(189,157,255,0.1)' }}>
            <button onClick={() => changeMonth(-1)} className="p-1 rounded transition-colors hover:opacity-70" style={{ color: '#ebe1fe' }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold min-w-[120px] text-center" style={{ color: '#ebe1fe' }}>{monthLabel}</span>
            <button onClick={() => changeMonth(1)} className="p-1 rounded transition-colors hover:opacity-70" style={{ color: '#ebe1fe' }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {dirtyCount > 0 && (
            <button
              onClick={saveAll}
              disabled={!!saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: 'rgba(189,157,255,0.2)', border: '1px solid rgba(189,157,255,0.35)', color: '#bd9dff' }}
            >
              Save {dirtyCount} change{dirtyCount > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-8 mt-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(255,110,132,0.1)', border: '1px solid rgba(255,110,132,0.2)', color: '#ff6e84' }}>
          {error}
        </div>
      )}

      {fetching ? (
        <p className="text-sm text-center py-12" style={{ color: '#afa7c2' }}>Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ background: 'rgba(189,157,255,0.04)' }}>
                {['Date','Status','Start','End','Worked Hrs',''].map((h, i) => (
                  <th key={i} className={`px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] ${i === 4 ? 'text-right' : ''}`}
                    style={{ color: '#afa7c2' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(day => {
                const dayLabel = format(parse(day.date, 'yyyy-MM-dd', new Date()), 'd MMM')
                const dayName  = format(parse(day.date, 'yyyy-MM-dd', new Date()), 'EEE')
                const isAbsent = day.status === 'Absent'
                const isSaving = saving === day.date
                const isSaved  = savedDates.has(day.date)
                const workedStr = isAbsent ? '—'
                  : day.status === 'Half Day' ? `${(Number(employee.standard_working_hours) / 2).toFixed(1)}h`
                  : `${calcHours(day.start_time, day.end_time).toFixed(1)}h`

                return (
                  <tr key={day.date} style={{
                    borderBottom: '1px solid rgba(189,157,255,0.06)',
                    borderLeft: day.dirty ? '2px solid rgba(189,157,255,0.35)' : '2px solid transparent',
                    background: day.dirty ? 'rgba(189,157,255,0.03)' : 'transparent',
                  }}>
                    {/* Date */}
                    <td className="px-6 py-4">
                      <span className="font-medium" style={{ color: '#ebe1fe' }}>{dayLabel}</span>
                      <span className="text-xs ml-1.5" style={{ color: '#afa7c2' }}>{dayName}</span>
                    </td>

                    {/* Status dropdown */}
                    <td className="px-6 py-4">
                      <div className="relative inline-block">
                        <select
                          value={day.status}
                          onChange={e => updateDay(day.date, { status: e.target.value as AttendanceStatus })}
                          className="appearance-none rounded-full px-3 pr-6 py-1 text-xs font-bold focus:outline-none cursor-pointer"
                          style={statusStyle(day.status)}
                        >
                          <option value="Present">Present</option>
                          <option value="Half Day">Half Day</option>
                          <option value="Absent">Absent</option>
                        </select>
                        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px]" style={{ color: 'currentColor' }}>▼</span>
                      </div>
                    </td>

                    {/* Start */}
                    <td className="px-6 py-4">
                      <input type="time" value={day.start_time} disabled={isAbsent}
                        onChange={e => updateDay(day.date, { start_time: e.target.value })}
                        className={timeInputCls} />
                    </td>

                    {/* End */}
                    <td className="px-6 py-4">
                      <input type="time" value={day.end_time} disabled={isAbsent || day.status === 'Half Day'}
                        onChange={e => updateDay(day.date, { end_time: e.target.value })}
                        className={timeInputCls} />
                    </td>

                    {/* Worked hrs */}
                    <td className="px-6 py-4 text-right text-sm" style={{ color: isAbsent ? '#afa7c2' : '#ebe1fe' }}>
                      {workedStr}
                    </td>

                    {/* Save / saved */}
                    <td className="px-6 py-4 text-right w-24">
                      {isSaved ? (
                        <span className="text-xs font-medium" style={{ color: '#34d399' }}>✓ Saved</span>
                      ) : day.dirty ? (
                        <button onClick={() => saveDay(day)} disabled={isSaving}
                          className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all disabled:opacity-50"
                          style={{ background: 'rgba(189,157,255,0.15)', color: '#bd9dff' }}>
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
    </section>
  )
}
