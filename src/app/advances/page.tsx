import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AddAdvanceModal from './components/AddAdvanceModal'
import AdvancesClient, { type AdvanceWithBalance } from './components/AdvancesClient'
import PageShell from '@/components/PageShell'

export default async function AdvancesPage() {
  const supabase = await createClient()

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

  return (
    <PageShell
      title="Advances"
      subtitle="Workforce"
      actions={userRole === 'admin' ? <AddAdvanceModal employees={employees || []} /> : undefined}
    >
      <AdvancesClient initialAdvances={advances} companyId={companyId} userRole={userRole} />
    </PageShell>
  )
}
