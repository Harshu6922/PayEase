'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useProfile, useExpenses } from '@/lib/hooks/useAppData'
import ExpensesManager from './components/ExpensesManager'

function ExpensesContent() {
  const searchParams = useSearchParams()
  const today = new Date()
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const month = searchParams.get('month') || defaultMonth

  const { data: profile } = useProfile()
  const { data } = useExpenses(month)

  if (!data || !profile) return null

  return (
    <ExpensesManager
      key={month}
      month={month}
      companyId={profile.company_id}
      initialExpenses={data.expenses}
      initialTemplates={data.templates}
      userRole={profile.role as any}
    />
  )
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={null}>
      <ExpensesContent />
    </Suspense>
  )
}
