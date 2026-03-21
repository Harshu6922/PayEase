import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PaymentHistoryClient from './components/PaymentHistoryClient'

export default async function PaymentsPage({
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

  const [year, mon] = month.split('-').map(Number)
  const startDate = `${month}-01`
  const endDate = `${month}-${new Date(year, mon, 0).getDate()}`

  // Fetch salary payments for this month
  const { data: payments } = await supabase
    .from('payments')
    .select('id, employee_id, amount, payment_date, note, month')
    .eq('company_id', companyId)
    .eq('month', month)
    .order('payment_date', { ascending: false })

  // Fetch advances for this month
  const { data: advances } = await supabase
    .from('employee_advances')
    .select('id, employee_id, amount, advance_date, note')
    .eq('company_id', companyId)
    .gte('advance_date', startDate)
    .lte('advance_date', endDate)
    .order('advance_date', { ascending: false })

  // Fetch all active employees for name lookup
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, employee_id, worker_type')
    .eq('company_id', companyId)
    .eq('is_active', true)

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#F7F6F3' }}>
      <PaymentHistoryClient
        month={month}
        payments={(payments || []) as any[]}
        advances={(advances || []) as any[]}
        employees={(employees || []) as any[]}
      />
    </div>
  )
}
