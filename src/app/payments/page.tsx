'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { usePayments } from '@/lib/hooks/useAppData'
import PaymentHistoryClient from './components/PaymentHistoryClient'

function PaymentsContent() {
  const searchParams = useSearchParams()
  const today = new Date()
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const month = searchParams.get('month') || defaultMonth

  const { data } = usePayments(month)

  if (!data) return null

  return (
    <PaymentHistoryClient
      month={month}
      payments={data.payments}
      advances={data.advances}
      employees={data.employees}
    />
  )
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentsContent />
    </Suspense>
  )
}
