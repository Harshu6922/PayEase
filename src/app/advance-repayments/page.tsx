import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageShell from '@/components/PageShell'
import AdvanceRepaymentsClient, { type RepaymentRow } from './components/AdvanceRepaymentsClient'

export default async function AdvanceRepaymentsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('company_id, role').eq('id', user.id).maybeSingle()
  const companyId = (profileData as any)?.company_id
  if (!companyId) redirect('/login')
  const userRole: 'admin' | 'viewer' = (profileData as any)?.role ?? 'viewer'

  const { data: raw } = await supabase
    .from('advance_repayments')
    .select(`
      id, amount, repayment_date, method, note,
      employee_advances(amount, advance_date),
      employees(full_name, employee_id)
    `)
    .eq('company_id', companyId)
    .order('repayment_date', { ascending: false })

  const repayments: RepaymentRow[] = (raw || []).map((r: any) => ({
    id: r.id,
    amount: Number(r.amount),
    repayment_date: r.repayment_date,
    method: r.method,
    note: r.note ?? null,
    advance_amount: Number(r.employee_advances?.amount ?? 0),
    advance_date: r.employee_advances?.advance_date ?? null,
    employee_name: r.employees?.full_name ?? '—',
    employee_display_id: r.employees?.employee_id ?? '—',
  }))

  return (
    <PageShell title="Advance Repayments" subtitle="Workforce">
      <AdvanceRepaymentsClient repayments={repayments} />
    </PageShell>
  )
}
