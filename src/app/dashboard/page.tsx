import { createClient } from '@/lib/supabase/server'
import { Users, CalendarCheck, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Lightweight dashboard: Fetch essential counts only
  const [
    { count: employeeCount },
    { count: todaysAttendanceCount }
  ] = await Promise.all([
    supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    
    supabase
      .from('attendance_records')
      .select('*', { count: 'exact', head: true })
      .eq('date', new Date().toISOString().split('T')[0])
  ])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your payroll system.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-indigo-50">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Employees</p>
              <p className="text-2xl font-bold text-gray-900">{employeeCount ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-50">
              <CalendarCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Today's Attendance</p>
              <p className="text-2xl font-bold text-gray-900">{todaysAttendanceCount ?? 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
