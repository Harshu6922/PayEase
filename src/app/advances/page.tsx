import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AddAdvanceModal from './components/AddAdvanceModal'
import AdvancesClient, { type AdvanceWithBalance } from './components/AdvancesClient'

export default async function AdvancesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('company_id').eq('id', user.id).maybeSingle()
  const companyId = (profileData as any)?.company_id
  if (!companyId) redirect('/login')

  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, employee_id')
    .eq('is_active', true)
    .order('full_name')

  // Fetch advances with their repayment totals
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
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Advances</h1>
          <p className="mt-1 text-sm text-gray-500">Record and track salary advances given to employees.</p>
        </div>
        <AddAdvanceModal employees={employees || []} />
      </div>
      <AdvancesClient initialAdvances={advances} companyId={companyId} />
    </div>
  )
}
