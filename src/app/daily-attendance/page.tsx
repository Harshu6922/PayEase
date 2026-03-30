'use client'

import { useProfile, useDailyWorkers } from '@/lib/hooks/useAppData'
import DailyAttendanceManager from './components/DailyAttendanceManager'
import type { Employee } from '@/types'

export default function DailyAttendancePage() {
  const { data: profile } = useProfile()
  const { data: workers } = useDailyWorkers()

  if (!workers || !profile) return null

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#F7F6F3' }}>
      <DailyAttendanceManager
        workers={workers as Employee[]}
        companyId={profile.company_id}
        userRole={profile.role as any}
      />
    </div>
  )
}
