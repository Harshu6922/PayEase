'use client'

import { useEmployees, useProfile } from '@/lib/hooks/useAppData'
import { PLANS, type PlanId } from '@/lib/plans'
import EmployeeListClient from './components/EmployeeListClient'

export default function EmployeesPage() {
  const { data: profile } = useProfile()
  const { data: employees, isLoading } = useEmployees()

  if (isLoading || !employees) {
    return (
      <div className="min-h-screen bg-[#0F0A1E] p-6 md:p-8 space-y-3">
        <div className="h-8 w-40 bg-white/5 rounded-xl animate-pulse mb-6" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  const userRole: 'admin' | 'viewer' = (profile as any)?.role ?? 'viewer'
  const activeCount = employees.filter((e: any) => e.is_active).length

  return (
    <EmployeeListClient
      employees={employees as any}
      userRole={userRole}
      atSeatLimit={false}
      employeeLimit={500}
      isSubscribed={true}
    />
  )
}
