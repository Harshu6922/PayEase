'use client'

import { useAdvanceRepayments } from '@/lib/hooks/useAppData'
import AdvanceRepaymentsClient from './components/AdvanceRepaymentsClient'

export default function AdvanceRepaymentsPage() {
  const { data: repayments } = useAdvanceRepayments()

  if (!repayments) return null

  return <AdvanceRepaymentsClient repayments={repayments as any} />
}
