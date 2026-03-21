import { createClient } from '@/lib/supabase/server'
import { Employee } from '@/types'
import AttendanceManager from './components/AttendanceManager'
import PageShell from '@/components/PageShell'

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
    <PageShell title="Attendance" subtitle="Workforce">
      <AttendanceManager employees={employees} userRole={userRole} />
    </PageShell>
  )
}
