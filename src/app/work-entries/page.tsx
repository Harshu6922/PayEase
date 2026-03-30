'use client'

import { useProfile, useWorkEntries } from '@/lib/hooks/useAppData'
import WorkerListClient from './components/WorkerListClient'

export default function WorkEntriesPage() {
  const { data: profile } = useProfile()
  const { data } = useWorkEntries()

  if (!data || !profile) return null

  return (
    <WorkerListClient
      workers={data.workers}
      companyName={data.companyName}
      companyId={profile.company_id}
      userRole={profile.role as any}
    />
  )
}
