'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('Fetch failed')
  return r.json()
})

// SWR config for financial/operational data — always revalidate on mount
const revalidateConfig = {
  revalidateOnMount: true,
  revalidateOnFocus: false,
  dedupingInterval: 30_000, // 30 seconds
}

export interface DashboardStats {
  totalEmployees: number
  salaryEmployees: number
  commissionEmployees: number
  dailyEmployees: number
  todaysAttendance: number
  totalAdvances: number
  advancesCount: number
  totalExpenses: number
  topEmployees: { id: string; full_name: string; worker_type: string; monthly_salary: number }[]
}

export function useDashboardStats() {
  return useSWR<DashboardStats>('/api/dashboard', fetcher, revalidateConfig)
}

export interface EmployeesData {
  employees: any[]
  userRole: 'admin' | 'viewer'
  subscription: { plan: string; razorpay_subscription_id: string | null } | null
}

export function useEmployeesList() {
  return useSWR<EmployeesData>('/api/employees-list', fetcher, revalidateConfig)
}
