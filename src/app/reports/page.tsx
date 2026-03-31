'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useProfile, useReports } from '@/lib/hooks/useAppData'
import PayrollDashboard from '@/components/PayrollDashboard'

async function generatePayrollAction(payload: { month: number; year: number; computedRows: any[] }) {
  const res = await fetch('/api/payroll/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to generate payroll')
}

function ReportsContent() {
  const searchParams = useSearchParams()
  const today = new Date()
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const month = searchParams.get('month') || defaultMonth

  const { data: profile } = useProfile()
  const { data } = useReports(month)

  if (!data || !profile) return null

  return (
    <div className="flex flex-col min-h-screen bg-[#0F0A1E]">
      <PayrollDashboard
        initialMonth={month}
        employees={data.employees}
        attendance={data.attendance}
        workEntries={data.workEntries}
        agentRates={data.agentRates}
        outstandingByEmployee={data.outstandingByEmployee}
        companyName={data.companyName}
        companyId={data.companyId}
        monthPayments={data.monthPayments}
        advanceRepaidThisMonth={data.advanceRepaidThisMonth}
        generateAction={generatePayrollAction}
        userRole={profile.role as any}
      />
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsContent />
    </Suspense>
  )
}
