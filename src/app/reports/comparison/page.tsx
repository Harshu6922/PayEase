import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PayrollComparison from '../components/PayrollComparison'

export default async function ComparisonPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('company_id').eq('id', user.id).maybeSingle()
  const companyId = (profileData as any)?.company_id
  if (!companyId) redirect('/login')

  const today = new Date()
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const month = searchParams?.month || defaultMonth

  // Compute prev month
  const [y, m] = month.split('-').map(Number)
  const prevDate = new Date(y, m - 2, 1)
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  function monthBounds(mo: string) {
    const [yr, mn] = mo.split('-').map(Number)
    return {
      start: `${mo}-01`,
      end: `${mo}-${new Date(yr, mn, 0).getDate()}`,
      days: new Date(yr, mn, 0).getDate(),
    }
  }

  const cur = monthBounds(month)
  const prev = monthBounds(prevMonth)

  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_id, full_name, monthly_salary, worker_type, daily_rate, standard_working_hours')
    .eq('company_id', companyId)
    .eq('is_active', true)

  const [
    { data: curAttendance },
    { data: prevAttendance },
    { data: curWorkEntries },
    { data: prevWorkEntries },
    { data: curDailyAtt },
    { data: prevDailyAtt },
  ] = await Promise.all([
    supabase.from('attendance_records').select('employee_id, worked_hours, overtime_amount, deduction_amount').eq('company_id', companyId).gte('date', cur.start).lte('date', cur.end),
    supabase.from('attendance_records').select('employee_id, worked_hours, overtime_amount, deduction_amount').eq('company_id', companyId).gte('date', prev.start).lte('date', prev.end),
    supabase.from('work_entries').select('employee_id, total_amount').eq('company_id', companyId).gte('date', cur.start).lte('date', cur.end),
    supabase.from('work_entries').select('employee_id, total_amount').eq('company_id', companyId).gte('date', prev.start).lte('date', prev.end),
    supabase.from('daily_attendance').select('employee_id, pay_amount').eq('company_id', companyId).gte('date', cur.start).lte('date', cur.end),
    supabase.from('daily_attendance').select('employee_id, pay_amount').eq('company_id', companyId).gte('date', prev.start).lte('date', prev.end),
  ])

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PayrollComparison
        month={month}
        prevMonth={prevMonth}
        employees={(employees || []) as any[]}
        curAttendance={(curAttendance || []) as any[]}
        prevAttendance={(prevAttendance || []) as any[]}
        curWorkEntries={(curWorkEntries || []) as any[]}
        prevWorkEntries={(prevWorkEntries || []) as any[]}
        curDailyAtt={(curDailyAtt || []) as any[]}
        prevDailyAtt={(prevDailyAtt || []) as any[]}
        curDays={cur.days}
        prevDays={prev.days}
      />
    </div>
  )
}
