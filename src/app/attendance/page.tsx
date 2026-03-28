import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Employee } from '@/types'
import AttendanceManager from './components/AttendanceManager'

export default async function AttendancePage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('company_id, role').eq('id', user.id).maybeSingle()

  const userRole: 'admin' | 'viewer' = (profileData as any)?.role ?? 'viewer'
  const companyId = (profileData as any)?.company_id

  const { data } = await supabase
    .from('employees')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('full_name')

  const employees: Employee[] = (data || []) as Employee[]

  return <AttendanceManager employees={employees} userRole={userRole} />
}
