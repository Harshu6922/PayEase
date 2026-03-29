import { getServerSession } from '@/lib/supabase/session'
import { redirect } from 'next/navigation'
import type { Employee } from '@/types'
import DailyAttendanceManager from './components/DailyAttendanceManager'

export default async function DailyAttendancePage() {
  const { companyId, userRole, supabase } = await getServerSession()
  if (!companyId) redirect('/login')

  const { data: workers } = await supabase
    .from('employees').select('*')
    .eq('company_id', companyId).eq('worker_type', 'daily').eq('is_active', true).order('full_name')

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#F7F6F3' }}>
      <DailyAttendanceManager
        workers={(workers || []) as Employee[]}
        companyId={companyId}
        userRole={userRole}
      />
    </div>
  )
}
