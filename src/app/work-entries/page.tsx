import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WorkerListClient from './components/WorkerListClient'

export default async function WorkEntriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('company_id').eq('id', user.id).maybeSingle()
  const companyId = (profileData as { company_id: string | null } | null)?.company_id
  if (!companyId) redirect('/login')

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
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Work Entries</h1>
      <WorkerListClient workers={commissionWorkers} companyName={companyName} companyId={companyId} />
    </div>
  )
}
