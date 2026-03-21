import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AttendanceSummaryClient from './components/AttendanceSummaryClient'

export default async function AttendanceSummaryPage({
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
  const [y, m] = month.split('-').map(Number)
  const start = `${month}-01`
  const end   = `${month}-${new Date(y, m, 0).getDate()}`

  const [{ data: employees }, { data: records }] = await Promise.all([
    supabase.from('employees').select('id, employee_id, full_name, worker_type').eq('company_id', companyId).eq('is_active', true).eq('worker_type', 'salaried').order('full_name'),
    supabase.from('attendance_records').select('employee_id, date, status, worked_hours').eq('company_id', companyId).gte('date', start).lte('date', end),
  ])

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#F7F6F3' }}>
      <AttendanceSummaryClient
        month={month}
        employees={(employees || []) as any[]}
        records={(records || []) as any[]}
      />
    </div>
  )
}
