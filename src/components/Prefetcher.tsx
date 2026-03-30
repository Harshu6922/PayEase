'use client'

/**
 * Prefetcher — renders nothing, just fires all SWR hooks on app load.
 * By the time the user navigates anywhere, data is already in cache.
 */

import {
  useProfile,
  useEmployees,
  useAttendanceEmployees,
  useDashboard,
  useAdvances,
  useExpenses,
  usePayments,
  useCommissionItems,
  useWorkEntries,
  useDailyWorkers,
  useAdvanceRepayments,
  useCharts,
  useReports,
} from '@/lib/hooks/useAppData'

const today = new Date()
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

export default function Prefetcher() {
  useProfile()
  useEmployees()
  useAttendanceEmployees()
  useDashboard()
  useAdvances()
  useExpenses(currentMonth)
  usePayments(currentMonth)
  useCommissionItems()
  useWorkEntries()
  useDailyWorkers()
  useAdvanceRepayments()
  useCharts()
  useReports(currentMonth)
  return null
}
