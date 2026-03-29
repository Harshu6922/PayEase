'use client'

import { useDashboard } from '@/lib/hooks/useAppData'
import DashboardNew from './components/DashboardNew'

export default function DashboardPage() {
  const { data, isLoading } = useDashboard()

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-[#0F0A1E] p-6 md:p-8">
        <div className="h-8 w-32 bg-white/5 rounded-xl mb-8 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const currentMonthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <DashboardNew
      month={currentMonthLabel}
      {...data}
    />
  )
}
