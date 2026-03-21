import { createClient } from '@/lib/supabase/server'
import { Employee } from '@/types'
import AttendanceManager from './components/AttendanceManager'

export default async function AttendancePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = user
    ? await supabase.from('profiles').select('company_id, role').eq('id', user.id).maybeSingle()
    : { data: null }
  const userRole: 'admin' | 'viewer' = (profileData as any)?.role ?? 'viewer'

  const { data } = await supabase
    .from('employees')
    .select('*')
    .eq('is_active', true)
    .order('full_name')

  const employees: Employee[] = (data || []) as Employee[]

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Daily Attendance</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage employee attendance efficiently using global defaults.
        </p>
      </div>

      <AttendanceManager employees={employees} userRole={userRole} />
    </div>
  )
}
