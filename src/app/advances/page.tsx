import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdvancesClient, { type AdvanceWithBalance } from './components/AdvancesClient'

export default async function AdvancesPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('company_id, role').eq('id', user.id).maybeSingle()
  const companyId = (profileData as any)?.company_id
  if (!companyId) redirect('/login')
  const userRole: 'admin' | 'viewer' = (profileData as any)?.role ?? 'viewer'

  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, employee_id')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('full_name')

  const { data: advancesRaw } = await supabase
    .from('employee_advances')
    .select(`
      id, employee_id, company_id, amount, advance_date, note,
      employees(full_name, employee_id),
      advance_repayments(amount)
    `)
    .eq('company_id', companyId)
    .order('advance_date', { ascending: false })

  const advances: AdvanceWithBalance[] = (advancesRaw || []).map((a: any) => {
    const repaid_total = (a.advance_repayments || []).reduce(
      (s: number, r: any) => s + Number(r.amount), 0
    )
    return {
      id: a.id,
      employee_id: a.employee_id,
      company_id: a.company_id,
      amount: Number(a.amount),
      advance_date: a.advance_date,
      note: a.note,
      repaid_total,
      remaining: Number(a.amount) - repaid_total,
      employee_name: a.employees?.full_name ?? '—',
      employee_display_id: a.employees?.employee_id ?? '—',
    }
  })

  // Stat computations
  const totalOutstanding = advances.reduce((s, a) => s + (a.remaining > 0 ? a.remaining : 0), 0)

  const now = new Date()
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const givenThisMonth = advances
    .filter(a => a.advance_date.startsWith(monthPrefix))
    .reduce((s, a) => s + a.amount, 0)

  // Fetch repayments made this month
  const startOfMonth = `${monthPrefix}-01`
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const { data: monthRepayments } = await supabase
    .from('advance_repayments')
    .select('amount')
    .eq('company_id', companyId)
    .gte('repayment_date', startOfMonth)
    .lte('repayment_date', endOfMonth)

  const recoveredThisMonth = (monthRepayments || []).reduce((s: number, r: any) => s + Number(r.amount), 0)

  return (
    <AdvancesClient
      initialAdvances={advances}
      companyId={companyId}
      employees={employees || []}
      totalOutstanding={totalOutstanding}
      givenThisMonth={givenThisMonth}
      recoveredThisMonth={recoveredThisMonth}
      userRole={userRole}
    />
  )
}
