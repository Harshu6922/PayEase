import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WorkerListClient from './components/WorkerListClient'

export default async function WorkEntriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('company_id, role').eq('id', user.id).maybeSingle()
  const companyId = (profileData as any)?.company_id
  if (!companyId) redirect('/login')
  const userRole: 'admin' | 'viewer' = (profileData as any)?.role ?? 'viewer'

  const { data: companyData } = await supabase
    .from('companies').select('name').eq('id', companyId).maybeSingle()
  const companyName = (companyData as { name: string } | null)?.name ?? 'My Company'

  const { data: workers } = await supabase
    .from('employees')
    .select('id, full_name, employee_id')
    .eq('company_id', companyId)
    .eq('worker_type', 'commission')
    .eq('is_active', true)
    .order('full_name')

  const commissionWorkers = (workers || []) as { id: string; full_name: string; employee_id: string }[]

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Work Entries</h1>
      <WorkerListClient workers={commissionWorkers} companyName={companyName} companyId={companyId} userRole={userRole} />
    </div>
  )
}
