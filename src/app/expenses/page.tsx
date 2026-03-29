import { getServerSession } from '@/lib/supabase/session'
import { redirect } from 'next/navigation'
import ExpensesManager from './components/ExpensesManager'

export default async function ExpensesPage({ searchParams }: { searchParams: { month?: string } }) {
  const { companyId, userRole, supabase } = await getServerSession()
  if (!companyId) redirect('/login')

  const today = new Date()
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const month = searchParams?.month || defaultMonth
  const [year, mon] = month.split('-').map(Number)
  const startDate = `${month}-01`
  const endDate = `${month}-${new Date(year, mon, 0).getDate()}`

  const [{ data: expenses }, { data: templates }] = await Promise.all([
    supabase.from('expenses').select('*')
      .eq('company_id', companyId).gte('date', startDate).lte('date', endDate)
      .order('date', { ascending: false }),
    supabase.from('expense_templates').select('*')
      .eq('company_id', companyId).order('created_at', { ascending: true }),
  ])

  return (
    <ExpensesManager
      key={month}
      month={month}
      companyId={companyId}
      initialExpenses={(expenses || []) as any[]}
      initialTemplates={(templates || []) as any[]}
      userRole={userRole}
    />
  )
}
