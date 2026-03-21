'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format, getDaysInMonth } from 'date-fns'
import { ChevronRight, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { downloadPdf } from '@/lib/pdf-utils'
import type { AgentItemRate, WorkEntry } from '@/types'

interface Worker { id: string; full_name: string; employee_id: string }

interface Props {
  workers: Worker[]
  companyName: string
  companyId: string
  userRole?: 'admin' | 'viewer'
}

export default function WorkerListClient({ workers, companyName, companyId, userRole = 'admin' }: Props) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleDownload = async (worker: Worker) => {
    setDownloadingId(worker.id)
    try {
      const currentMonth = format(new Date(), 'yyyy-MM')
      const [yearStr, monthStr] = currentMonth.split('-')
      const year = parseInt(yearStr, 10)
      const monthNum = parseInt(monthStr, 10)
      const days = getDaysInMonth(new Date(year, monthNum - 1))
      const firstDay = `${currentMonth}-01`
      const lastDay = `${currentMonth}-${String(days).padStart(2, '0')}`

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as unknown as any

      const { data: entriesData } = await supabase
        .from('work_entries').select('*')
        .eq('employee_id', worker.id)
        .eq('company_id', companyId)
        .gte('date', firstDay).lte('date', lastDay)
      const entries: WorkEntry[] = entriesData || []

      if (entries.length === 0) { alert('No entries for this month.'); return }

      const { data: ratesData } = await supabase
        .from('agent_item_rates')
        .select('*, commission_items(id, name, default_rate)')
        .eq('employee_id', worker.id)
      const agentRates: AgentItemRate[] = ratesData || []

      const [{ default: CommissionPayslipPDF }, { pdf }] = await Promise.all([
        import('@/components/pdf/CommissionPayslipPDF'),
        import('@react-pdf/renderer'),
      ])
      const blob = await pdf(
        <CommissionPayslipPDF
          month={currentMonth}
          companyName={companyName}
          employee={{ full_name: worker.full_name, employee_id: worker.employee_id }}
          entries={entries}
          agentRates={agentRates}
        />
      ).toBlob()
      downloadPdf(blob, `commission-${worker.employee_id}-${currentMonth}.pdf`)
    } catch {
      alert('Failed to generate PDF.')
    } finally {
      setDownloadingId(null)
    }
  }

  if (workers.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg font-medium">No commission workers yet.</p>
        <p className="text-sm mt-1">Add employees with Worker Type = Commission to get started.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm divide-y divide-gray-100">
      {workers.map(worker => (
        <div key={worker.id} className="flex items-center px-5 py-4">
          <Link href={`/work-entries/${worker.id}`} className="flex-1 flex items-center justify-between hover:opacity-70 transition-opacity">
            <div>
              <p className="font-semibold text-gray-900">{worker.full_name}</p>
              <p className="text-sm text-gray-400">{worker.employee_id}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
          </Link>
          <button
            onClick={() => handleDownload(worker)}
            disabled={downloadingId === worker.id}
            title="Download this month's payslip"
            className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40 transition-colors"
          >
            {downloadingId === worker.id
              ? <span className="text-xs">...</span>
              : <Download className="h-4 w-4" />
            }
          </button>
        </div>
      ))}
    </div>
  )
}
