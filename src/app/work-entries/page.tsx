import { getServerSession } from '@/lib/supabase/session'
import { redirect } from 'next/navigation'
import WorkerListClient from './components/WorkerListClient'

export default async function WorkEntriesPage() {
  const { companyId, userRole, supabase } = await getServerSession()
  if (!companyId) redirect('/login')

  const [{ data: companyData }, { data: workers }] = await Promise.all([
    supabase.from('companies').select('name').eq('id', companyId).maybeSingle(),
    supabase.from('employees')
      .select('id, full_name, employee_id')
      .eq('company_id', companyId).eq('worker_type', 'commission').eq('is_active', true).order('full_name'),
  ])

  return (
    <WorkerListClient
      workers={(workers || []) as { id: string; full_name: string; employee_id: string }[]}
      companyName={(companyData as any)?.name ?? 'My Company'}
      companyId={companyId}
      userRole={userRole}
    />
  )
}
