import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardNew from './components/DashboardNew'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('company_id').eq('id', user.id).maybeSingle()
  const companyId = (profileData as { company_id: string | null } | null)?.company_id
  if (!companyId) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const currentMonth = today.slice(0, 7)

  const [
    { count: totalEmployees },
    { count: salaryEmployees },
    { count: commissionEmployees },
    { count: dailyEmployees },
    { count: todaysAttendance },
    { data: advancesData, count: advancesCount },
    { data: expensesData },
    { data: topEmployees },
  ] = await Promise.all([
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true).eq('worker_type', 'salaried'),
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true).eq('worker_type', 'commission'),
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true).eq('worker_type', 'daily'),
    supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('date', today),
    supabase.from('advances').select('amount', { count: 'exact' }).eq('company_id', companyId).eq('status', 'outstanding'),
    supabase.from('expenses').select('amount').eq('company_id', companyId).gte('date', `${currentMonth}-01`),
    supabase.from('employees').select('id, full_name, worker_type, monthly_salary').eq('company_id', companyId).eq('is_active', true).order('full_name').limit(5),
  ])

  const totalAdvances = advancesData?.reduce((sum, a) => sum + ((a as { amount: number }).amount ?? 0), 0) ?? 0
  const totalExpenses = expensesData?.reduce((sum, e) => sum + ((e as { amount: number }).amount ?? 0), 0) ?? 0
  const currentMonthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <DashboardNew
      month={currentMonthLabel}
      totalEmployees={totalEmployees ?? 0}
      salaryEmployees={salaryEmployees ?? 0}
      commissionEmployees={commissionEmployees ?? 0}
      dailyEmployees={dailyEmployees ?? 0}
      todaysAttendance={todaysAttendance ?? 0}
      totalAdvances={totalAdvances}
      advancesCount={advancesCount ?? 0}
      totalExpenses={totalExpenses}
      topEmployees={(topEmployees ?? []) as { id: string; full_name: string; worker_type: string; monthly_salary: number }[]}
    />
  )
}
