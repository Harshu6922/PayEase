'use client'

import { useAttendanceEmployees, useProfile } from '@/lib/hooks/useAppData'
import { Employee } from '@/types'
import AttendanceManager from './components/AttendanceManager'

export default function AttendancePage() {
  const { data: profile } = useProfile()
  const { data: employees, isLoading } = useAttendanceEmployees()

  if (isLoading || !employees) {
    return (
      <div className="min-h-screen bg-[#0F0A1E] p-6 md:p-8 space-y-3">
        <div className="h-8 w-40 bg-white/5 rounded-xl animate-pulse mb-6" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  const userRole: 'admin' | 'viewer' = (profile as any)?.role ?? 'viewer'

  return <AttendanceManager employees={employees as Employee[]} userRole={userRole} />
}
