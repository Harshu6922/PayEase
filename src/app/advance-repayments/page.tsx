import { getServerSession } from '@/lib/supabase/session'
import { redirect } from 'next/navigation'
import AdvanceRepaymentsClient, { type RepaymentRow } from './components/AdvanceRepaymentsClient'

export default async function AdvanceRepaymentsPage() {
  const { companyId, supabase } = await getServerSession()
  if (!companyId) redirect('/login')

  const { data: raw } = await supabase
    .from('advance_repayments')
    .select('id, amount, repayment_date, method, note, employee_advances(amount, advance_date), employees(full_name, employee_id)')
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

  return <AdvanceRepaymentsClient repayments={repayments} />
}
