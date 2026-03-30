'use client'

import { useProfile, useAdvances } from '@/lib/hooks/useAppData'
import AdvancesClient from './components/AdvancesClient'

export default function AdvancesPage() {
  const { data: profile } = useProfile()
  const { data } = useAdvances()

  if (!data || !profile) return null

  return (
    <AdvancesClient
      initialAdvances={data.advances as any}
      companyId={profile.company_id}
      employees={data.employees as any}
      totalOutstanding={data.totalOutstanding}
      givenThisMonth={data.givenThisMonth}
      recoveredThisMonth={data.recoveredThisMonth}
      userRole={profile.role as any}
    />
  )
}
