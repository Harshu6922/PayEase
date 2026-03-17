import { createClient } from '@/lib/supabase/server'
import { Employee } from '@/types'
import AttendanceManager from './components/AttendanceManager'

export default async function AttendancePage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  
  // This page fetches active employees so admin can enter attendance
  const { data } = await supabase
    .from('employees')
    .select('*')
    .eq('is_active', true)
    .order('full_name')

  // Explicit schema-aligned typing fixes never[] inference
  const employees: Employee[] = (data || []) as Employee[]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Daily Attendance</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage employee attendance efficiently using global defaults.
        </p>
      </div>

      <AttendanceManager employees={employees} />
    </div>
  )
}
