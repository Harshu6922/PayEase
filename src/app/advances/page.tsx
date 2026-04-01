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
      advance_repayments(amount, repayment_date)
    `)
    .eq('company_id', companyId)
    .order('advance_date', { ascending: false })

  const advances: AdvanceWithBalance[] = (advancesRaw || []).map((a: any) => {
    const repayments: { amount: number; repayment_date: string }[] =
      (a.advance_repayments || []).map((r: any) => ({ amount: Number(r.amount), repayment_date: r.repayment_date }))
    const repaid_total = repayments.reduce((s, r) => s + r.amount, 0)
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
      repayments,
    }
  })

  const totalOutstanding = advances.reduce((s, a) => s + (a.remaining > 0 ? a.remaining : 0), 0)

  return (
    <AdvancesClient
      initialAdvances={advances}
      companyId={companyId}
      employees={employees || []}
      totalOutstanding={totalOutstanding}
      userRole={userRole}
    />
  )
}
