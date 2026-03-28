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

  // Get initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.substring(0, 2).toUpperCase()
  }

  if (workers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <p className="text-text-muted font-medium text-lg">No commission workers yet.</p>
        <p className="text-text-muted text-sm mt-1 opacity-60">Add employees with Worker Type = Commission to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 px-4 md:px-6 py-4">
      {workers.map(worker => (
        <div
          key={worker.id}
          className="backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl px-4 py-3 flex items-center gap-3"
        >
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-primary/20 text-primary-light text-sm font-semibold flex items-center justify-center flex-shrink-0">
            {getInitials(worker.full_name)}
          </div>

          {/* Name link */}
          <Link
            href={`/work-entries/${worker.id}`}
            className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            <p className="text-text font-semibold text-sm truncate">{worker.full_name}</p>
            <p className="text-text-muted text-xs">{worker.employee_id}</p>
          </Link>

          {/* Chevron link */}
          <Link href={`/work-entries/${worker.id}`} className="text-text-muted hover:text-text transition-colors">
            <ChevronRight className="h-4 w-4" />
          </Link>

          {/* Download button */}
          <button
            onClick={() => handleDownload(worker)}
            disabled={downloadingId === worker.id}
            title="Download this month's payslip"
            className="p-2 rounded-lg text-text-muted hover:text-primary-light hover:bg-primary/10 disabled:opacity-40 transition-colors"
          >
            {downloadingId === worker.id
              ? <span className="text-xs font-mono">...</span>
              : <Download className="h-4 w-4" />
            }
          </button>
        </div>
      ))}
    </div>
  )
}
