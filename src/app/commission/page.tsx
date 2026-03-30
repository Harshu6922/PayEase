'use client'

import { useProfile, useCommissionItems } from '@/lib/hooks/useAppData'
import CommissionItemsManager from './components/CommissionItemsManager'
import { CommissionItem } from '@/types'

export default function CommissionPage() {
  const { data: profile } = useProfile()
  const { data: items } = useCommissionItems()

  if (!items || !profile) return null

  return (
    <CommissionItemsManager
      items={items as CommissionItem[]}
      companyId={profile.company_id}
      userRole={profile.role as any}
    />
  )
}
