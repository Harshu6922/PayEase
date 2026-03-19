import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export default async function WorkEntriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('company_id').eq('id', user.id).maybeSingle()
  const companyId = (profileData as { company_id: string | null } | null)?.company_id
  if (!companyId) redirect('/login')

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

      {commissionWorkers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No commission workers yet.</p>
          <p className="text-sm mt-1">Add employees with Worker Type = Commission to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {commissionWorkers.map(worker => (
            <Link
              key={worker.id}
              href={`/work-entries/${worker.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-semibold text-gray-900">{worker.full_name}</p>
                <p className="text-sm text-gray-400">{worker.employee_id}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
