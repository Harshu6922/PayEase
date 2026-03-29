import { getServerSession } from '@/lib/supabase/session'
import { redirect } from 'next/navigation'
import PaymentHistoryClient from './components/PaymentHistoryClient'

export default async function PaymentsPage({ searchParams }: { searchParams: { month?: string } }) {
  const { companyId, supabase } = await getServerSession()
  if (!companyId) redirect('/login')

  const today = new Date()
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const month = searchParams?.month || defaultMonth
  const [year, mon] = month.split('-').map(Number)
  const startDate = `${month}-01`
  const endDate = `${month}-${new Date(year, mon, 0).getDate()}`

  const [{ data: payments }, { data: advances }, { data: employees }] = await Promise.all([
    supabase.from('payments')
      .select('id, employee_id, amount, payment_date, note, month')
      .eq('company_id', companyId).eq('month', month).order('payment_date', { ascending: false }),
    supabase.from('employee_advances')
      .select('id, employee_id, amount, advance_date, note')
      .eq('company_id', companyId).gte('advance_date', startDate).lte('advance_date', endDate)
      .order('advance_date', { ascending: false }),
    supabase.from('employees')
      .select('id, full_name, employee_id, worker_type')
      .eq('company_id', companyId).eq('is_active', true),
  ])

  return (
    <PaymentHistoryClient
      month={month}
      payments={(payments || []) as any[]}
      advances={(advances || []) as any[]}
      employees={(employees || []) as any[]}
    />
  )
}
