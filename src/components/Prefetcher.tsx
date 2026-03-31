'use client'

/**
 * Prefetcher — renders nothing, just fires SWR hooks for relatively static data.
 * Transactional pages (advances, repayments, reports, expenses, payments) are
 * intentionally excluded so they always fetch fresh data on each visit.
 */

import {
  useProfile,
  useEmployees,
  useAttendanceEmployees,
  useDashboard,
  useCommissionItems,
  useWorkEntries,
  useCharts,
} from '@/lib/hooks/useAppData'

export default function Prefetcher() {
  useProfile()
  useEmployees()
  useAttendanceEmployees()
  useDashboard()
  useCommissionItems()
  useWorkEntries()
  useCharts()
  return null
}
