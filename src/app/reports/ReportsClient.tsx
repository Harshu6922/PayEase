'use client'

import { useState } from 'react'
import { FileText, Table2, Loader2 } from 'lucide-react'
import { downloadPdf } from '@/lib/pdf-utils'
import type { PayrollRow } from '@/types'

interface Employee {
  id: string
  employee_id: string
  full_name: string
  company_id: string
  monthly_salary: number
  worker_type: 'salaried' | 'commission' | 'daily'
  daily_rate: number | null
  standard_working_hours: number | null
}

interface Props {
  employees: Employee[]
  companyName: string
  companyId: string
  computedRows: PayrollRow[]
  prevBalances: Record<string, number>
  paidByEmployee: Record<string, number>
  remainingNet: number
  defaultMonth: string
}

const glassCard = 'backdrop-blur-md bg-white/5 border border-[#7C3AED]/20 rounded-xl p-6'
const inputCls = 'bg-[#0F0A1E] border border-[#7C3AED]/30 rounded-xl px-4 py-3 text-[#F1F0F5] placeholder:text-[#7B7A8E]/50 focus:outline-none focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/50 w-full text-sm'
const btnCls = 'bg-[#7C3AED] text-white font-bold py-3 rounded-xl w-full flex items-center justify-center gap-2 hover:bg-[#6D28D9] transition-colors disabled:opacity-50 text-sm'

export default function ReportsClient({
  employees,
  companyName,
  companyId,
  computedRows,
  prevBalances,
  paidByEmployee,
  remainingNet,
  defaultMonth,
}: Props) {
  const [pdfMonth, setPdfMonth] = useState(defaultMonth)
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([])
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  const [csvMonth, setCsvMonth] = useState(defaultMonth)
  const [isExportingCsv, setIsExportingCsv] = useState(false)

  const toggleEmp = (id: string) => {
    setSelectedEmpIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selectedEmpIds.length === employees.length) {
      setSelectedEmpIds([])
    } else {
      setSelectedEmpIds(employees.map(e => e.id))
    }
  }

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true)
    try {
      const targetRows = computedRows.filter(r =>
        selectedEmpIds.length === 0 || selectedEmpIds.includes(r.employee_id)
      )
      const [{ default: PayrollSummaryPDF }, { pdf }] = await Promise.all([
        import('@/components/pdf/PayrollSummaryPDF'),
        import('@react-pdf/renderer'),
      ])
      const blob = await pdf(
        <PayrollSummaryPDF
          month={pdfMonth}
          companyName={companyName}
          rows={targetRows}
          prevBalances={prevBalances}
          totalNetPayout={remainingNet}
          paidByEmployee={paidByEmployee}
        />
      ).toBlob()
      downloadPdf(blob, `payslips-${pdfMonth}.pdf`)
    } catch {
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  const handleExportCsv = async () => {
    setIsExportingCsv(true)
    try {
      const rows = computedRows
      const headers = ['Employee ID', 'Name', 'Worker Type', 'Gross', 'Deductions', 'Overtime', 'Net Payable']
      const csvRows = rows.map(r => {
        const emp = employees.find(e => e.id === r.employee_id)
        return [
          emp?.employee_id ?? r.employee_id,
          r.full_name ?? '',
          emp?.worker_type ?? '',
          r.gross_salary ?? '',
          r.total_deduction_amount ?? '',
          r.total_overtime_amount ?? '',
          r.final_payable_salary ?? '',
        ].join(',')
      })
      const csv = [headers.join(','), ...csvRows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payroll-${csvMonth}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to export CSV. Please try again.')
    } finally {
      setIsExportingCsv(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0A1E]">
      {/* Header */}
      <div className="px-6 md:px-8 pt-8 pb-7 border-b border-[#7C3AED]/10">
        <p className="text-xs font-semibold uppercase mb-1.5 text-[#7B7A8E] tracking-widest">Finance</p>
        <h1 className="text-2xl font-bold text-[#F1F0F5]">Reports</h1>
        <p className="mt-1 text-sm text-[#7B7A8E]">{companyName}</p>
      </div>

      <div className="px-6 md:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">

          {/* Payslip PDFs Card */}
          <div className={glassCard}>
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#7C3AED]/10">
              <FileText className="text-[#A855F7] h-6 w-6 flex-shrink-0" />
              <h2 className="text-[#F1F0F5] font-semibold text-base">Payslip PDFs</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#7B7A8E] mb-1.5 uppercase tracking-wider">Month</label>
                <input
                  type="month"
                  value={pdfMonth}
                  onChange={e => setPdfMonth(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-[#7B7A8E] uppercase tracking-wider">Employees</label>
                  <button
                    onClick={toggleAll}
                    className="text-xs text-[#A855F7] hover:text-[#7C3AED] transition-colors"
                  >
                    {selectedEmpIds.length === employees.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl bg-[#0F0A1E]/50 border border-[#7C3AED]/20 p-2">
                  {employees.length === 0 ? (
                    <p className="text-xs text-[#7B7A8E] text-center py-2">No employees found</p>
                  ) : (
                    employees.map(emp => (
                      <label
                        key={emp.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#7C3AED]/10 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmpIds.includes(emp.id)}
                          onChange={() => toggleEmp(emp.id)}
                          className="accent-[#7C3AED] w-3.5 h-3.5"
                        />
                        <span className="text-sm text-[#F1F0F5]">{emp.full_name}</span>
                        <span className="text-xs text-[#7B7A8E] ml-auto">{emp.employee_id}</span>
                      </label>
                    ))
                  )}
                </div>
                {selectedEmpIds.length === 0 && (
                  <p className="text-xs text-[#7B7A8E] mt-1.5">No selection = all employees</p>
                )}
              </div>

              <button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf || computedRows.length === 0}
                className={btnCls}
              >
                {isDownloadingPdf ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Export Payroll CSV Card */}
          <div className={glassCard}>
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#7C3AED]/10">
              <Table2 className="text-[#A855F7] h-6 w-6 flex-shrink-0" />
              <h2 className="text-[#F1F0F5] font-semibold text-base">Export Payroll</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#7B7A8E] mb-1.5 uppercase tracking-wider">Month</label>
                <input
                  type="month"
                  value={csvMonth}
                  onChange={e => setCsvMonth(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="rounded-xl bg-[#0F0A1E]/50 border border-[#7C3AED]/20 p-4">
                <p className="text-xs text-[#7B7A8E] mb-2 font-medium uppercase tracking-wider">Includes</p>
                <ul className="space-y-1.5">
                  {['Employee ID & Name', 'Worker Type', 'Gross Salary', 'Deductions', 'Overtime', 'Net Payable'].map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-[#F1F0F5]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleExportCsv}
                disabled={isExportingCsv || computedRows.length === 0}
                className={btnCls}
              >
                {isExportingCsv ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Table2 className="h-4 w-4" />
                    Export CSV
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
