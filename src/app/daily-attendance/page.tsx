import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Employee } from '@/types'
import DailyAttendanceManager from './components/DailyAttendanceManager'

export default async function DailyAttendancePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user!.id)
    .maybeSingle()

  const companyId = (profileData as { company_id: string | null } | null)?.company_id
  if (!companyId) redirect('/login')

  const { data: workers } = await supabase
    .from('employees')
    .select('*')
    .eq('company_id', companyId)
    .eq('worker_type', 'daily')
    .eq('is_active', true)
    .order('full_name')

  return (
    <DailyAttendanceManager
      workers={(workers || []) as Employee[]}
      companyId={companyId}
    />
  )
}
