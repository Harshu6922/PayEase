'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, addMonths, subMonths, parse } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { downloadPdf } from '@/lib/pdf-utils'
import type { Employee, AgentItemRate, WorkEntry } from '@/types'
import LogDayModal from './LogDayModal'
import PaymentModal from '@/components/PaymentModal'

interface Props {
  employee: Employee
  agentRates: AgentItemRate[]
  initialEntries: WorkEntry[]
  month: string
  companyId: string
  companyName: string
}

export default function WorkEntryManager({ employee, agentRates, initialEntries, month, companyId, companyName }: Props) {
  const router = useRouter()
  const [entries, setEntries] = useState<WorkEntry[]>(initialEntries)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  // Total earnings for current month (currentMonthPayable for PaymentModal)
  const currentMonthPayable = useMemo(
    () => entries.reduce((sum, e) =>
      sum + (Number(e.total_amount) || Number(e.quantity) * Number(e.rate)), 0),
    [entries]
  )

  // Group entries by date, sorted descending
  const entriesByDate = useMemo(() => {
    const map: Record<string, WorkEntry[]> = {}
    entries.forEach(e => {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    })
    // Sort dates descending
    const sortedKeys = Object.keys(map).sort((a, b) => b.localeCompare(a))
    return sortedKeys.map(date => ({ date, dayEntries: map[date] }))
  }, [entries])

  const monthDate = parse(month + '-01', 'yyyy-MM-dd', new Date())
  const monthLabel = format(monthDate, 'MMMM yyyy')

  const prevMonth = () => {
    const prev = format(subMonths(monthDate, 1), 'yyyy-MM')
    router.push(`/work-entries/${employee.id}?month=${prev}`)
  }
  const nextMonth = () => {
    const next = format(addMonths(monthDate, 1), 'yyyy-MM')
    router.push(`/work-entries/${employee.id}?month=${next}`)
  }

  const handleDelete = async (date: string) => {
    if (!window.confirm(`Delete all entries for ${format(new Date(date + 'T00:00:00'), 'MMMM d, yyyy')}?`)) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any
    const { error } = await supabase
      .from('work_entries')
      .delete()
      .eq('employee_id', employee.id)
      .eq('date', date)
    if (!error) {
      setEntries(prev => prev.filter(e => e.date !== date))
    }
  }

  const handleSave = (date: string, newEntries: WorkEntry[]) => {
    setEntries(prev => {
      const withoutDate = prev.filter(e => e.date !== date)
      return [...withoutDate, ...newEntries].sort((a, b) => b.date.localeCompare(a.date))
    })
    setIsModalOpen(false)
    setEditingDate(null)
    router.refresh()
  }

  const openAdd = () => { setEditingDate(null); setIsModalOpen(true) }
  const openEdit = (date: string) => { setEditingDate(date); setIsModalOpen(true) }

  const handleDownloadPdf = async () => {
    if (entries.length === 0) { alert('No entries for this month.'); return }
    setIsDownloading(true)
    try {
      const [{ default: CommissionPayslipPDF }, { pdf }] = await Promise.all([
        import('@/components/pdf/CommissionPayslipPDF'),
        import('@react-pdf/renderer'),
      ])
      const blob = await pdf(
        <CommissionPayslipPDF
          month={month}
          companyName={companyName}
          employee={{ full_name: employee.full_name, employee_id: employee.employee_id }}
          entries={entries}
          agentRates={agentRates}
        />
      ).toBlob()
      downloadPdf(blob, `commission-${employee.employee_id}-${month}.pdf`)
    } catch {
      alert('Failed to generate PDF.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <a href="/work-entries" className="text-blue-600 hover:text-blue-800 text-sm">← Workers</a>
      </div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{employee.full_name}</h1>
          <p className="text-sm text-gray-400">{employee.employee_id} · Commission Worker</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Log Day
        </button>
      </div>

      {/* Month picker */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={prevMonth} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold">‹</button>
        <span className="text-base font-semibold text-gray-800 w-40 text-center">{monthLabel}</span>
        <button onClick={nextMonth} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold">›</button>
        <button
          onClick={handleDownloadPdf}
          disabled={isDownloading || entries.length === 0}
          className="px-4 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {isDownloading ? 'Generating...' : 'Download PDF'}
        </button>
        <button
          onClick={() => setIsPaymentModalOpen(true)}
          className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500"
        >
          Record Payment
        </button>
      </div>

      {/* Monthly earnings summary */}
      {entries.length > 0 && (
        <div className="mb-5 rounded-xl bg-indigo-50 border border-indigo-100 px-5 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-indigo-700">Total Earnings — {monthLabel}</span>
          <span className="text-lg font-bold text-indigo-900">
            Rs. {currentMonthPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* No items assigned warning */}
      {agentRates.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-yellow-800 text-sm">
          No commission items assigned. Go to the <a href={`/employees/${employee.id}`} className="underline">employee detail page</a> to assign items and rates.
        </div>
      )}

      {/* Entry list */}
      {entriesByDate.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium">No entries for {monthLabel}.</p>
          <p className="text-sm mt-1">Click + Log Day to start.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {entriesByDate.map(({ date, dayEntries }) => {
            const dayTotal = dayEntries.reduce((sum: number, e: WorkEntry) =>
              sum + (Number(e.total_amount) || Number(e.quantity) * Number(e.rate)), 0)
            const itemSummary = dayEntries
              .map((e: WorkEntry) => {
                const rate = agentRates.find(r => r.item_id === e.item_id)
                const name = rate?.commission_items?.name ?? 'Unknown'
                return `${name}: ${e.quantity}`
              })
              .join(' · ')

            return (
              <div key={date} className="flex items-center justify-between px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">
                    {format(new Date(date + 'T00:00:00'), 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm text-gray-400 truncate">{itemSummary}</p>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <span className="font-semibold text-gray-900 whitespace-nowrap">
                    Rs. {dayTotal.toLocaleString()}
                  </span>
                  <button
                    onClick={() => openEdit(date)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >Edit</button>
                  <button
                    onClick={() => handleDelete(date)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isPaymentModalOpen && (
        <PaymentModal
          employee={{ id: employee.id, full_name: employee.full_name, employee_id: employee.employee_id }}
          month={month}
          currentMonthPayable={currentMonthPayable}
          companyId={companyId}
          outstandingAdvances={{ totalOutstanding: 0, advances: [] }}
          onClose={() => setIsPaymentModalOpen(false)}
          onPaymentRecorded={() => { router.refresh() }}
        />
      )}

      {isModalOpen && (
        <LogDayModal
          agentRates={agentRates}
          existingEntries={editingDate ? (entriesByDate.find(g => g.date === editingDate)?.dayEntries ?? []) : []}
          companyId={companyId}
          employeeId={employee.id}
          editingDate={editingDate}
          onSave={handleSave}
          onClose={() => { setIsModalOpen(false); setEditingDate(null) }}
        />
      )}
    </div>
  )
}
