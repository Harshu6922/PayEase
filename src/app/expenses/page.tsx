import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExpensesManager from './components/ExpensesManager'

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('company_id, role').eq('id', user.id).maybeSingle()
  const companyId = (profileData as any)?.company_id
  if (!companyId) redirect('/login')
  const userRole: 'admin' | 'viewer' = (profileData as any)?.role ?? 'viewer'

  const today = new Date()
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const month = searchParams?.month || defaultMonth

  const [year, mon] = month.split('-').map(Number)
  const startDate = `${month}-01`
  const endDate   = `${month}-${new Date(year, mon, 0).getDate()}`

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  const { data: templates } = await supabase
    .from('expense_templates')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <ExpensesManager
        key={month}
        month={month}
        companyId={companyId}
        initialExpenses={(expenses || []) as any[]}
        initialTemplates={(templates || []) as any[]}
        userRole={userRole}
      />
    </div>
  )
}
