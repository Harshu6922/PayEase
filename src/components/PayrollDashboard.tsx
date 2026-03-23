'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatINR } from '@/lib/payroll-utils'
import { format } from 'date-fns'
import { getPrevMonth, calcPrevBalance, downloadPdf } from '@/lib/pdf-utils'
import type { PayrollRow, Payment } from '@/types'
import PaymentModal from '@/components/PaymentModal'
import Link from 'next/link'

// Data types passed from Server
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

interface AttendanceRecord {
  employee_id: string
  date: string
  worked_hours: number
  overtime_hours: number | null
  overtime_amount: number | null
  deduction_amount: number | null
}

interface WorkEntry {
  employee_id: string
  item_id: string
  quantity: number
  date?: string
  total_amount?: number
}

interface AgentRate {
  employee_id: string
  item_id: string
  rate: number
}

interface DailyAttendanceRecord {
  employee_id: string
  date: string
  hours_worked: number
  pay_amount: number
}

interface PayrollDashboardProps {
  initialMonth: string // YYYY-MM
  employees: Employee[]
  attendance: AttendanceRecord[]
  workEntries: WorkEntry[]
  agentRates: AgentRate[]
  dailyAttendance: DailyAttendanceRecord[]
  outstandingByEmployee: Record<string, { totalOutstanding: number; advances: { id: string; remaining: number; advance_date: string }[] }>
  generateAction: (data: any) => Promise<void>
  companyName: string
  companyId: string
  monthPayments: Payment[]
  userRole?: 'admin' | 'viewer'
}

// Calculation Engine pure function
function calculatePayroll(
  employees: Employee[],
  attendance: AttendanceRecord[],
  workEntries: WorkEntry[],
  agentRates: AgentRate[],
  dailyAttendance: DailyAttendanceRecord[],
  workingDays: number,
  outstandingByEmployee: Record<string, { totalOutstanding: number; advances: { id: string; remaining: number; advance_date: string }[] }> = {}
) {
  let totalPayable = 0
  let totalRecoverable = 0

  const rows = employees.map(emp => {
    let total_worked_days = 0
    let earned_salary = 0
    let total_overtime_amount = 0
    let total_deduction_amount = 0

    if (emp.worker_type === 'commission') {
      // Commission: use pre-calculated total_amount stored at log time
      const empEntries = workEntries.filter(e => e.employee_id === emp.id)
      earned_salary = empEntries.reduce((sum, e) => sum + Number(e.total_amount ?? 0), 0)
      // Count unique dates worked
      const uniqueDates = new Set(empEntries.map(e => e.date).filter(Boolean))
      total_worked_days = uniqueDates.size

    } else if (emp.worker_type === 'daily') {
      // Daily: use pre-calculated pay_amount stored at attendance time
      const empDailyAtt = dailyAttendance.filter(a => a.employee_id === emp.id)
      earned_salary = empDailyAtt.reduce((sum, a) => sum + Number(a.pay_amount ?? 0), 0)
      total_worked_days = empDailyAtt.length

    } else {
      // Salaried: attendance-based with overtime/deductions
      const empAttendance = attendance.filter(a => a.employee_id === emp.id)
      empAttendance.forEach(record => {
        if (Number(record.worked_hours) > 0) total_worked_days += 1
        total_overtime_amount += Number(record.overtime_amount || 0)
        total_deduction_amount += Number(record.deduction_amount || 0)
      })
      const per_day_salary = workingDays > 0 ? Number(emp.monthly_salary) / workingDays : 0
      earned_salary = total_worked_days > 0 ? per_day_salary * total_worked_days : 0
    }

    const total_advances = outstandingByEmployee[emp.id]?.totalOutstanding ?? 0
    const advance_deduction = total_advances
    const final_payable_salary = earned_salary + total_overtime_amount - total_deduction_amount - advance_deduction

    // Aggregate totals based on positive/negative
    if (final_payable_salary >= 0) {
      totalPayable += final_payable_salary
    } else {
      totalRecoverable += Math.abs(final_payable_salary)
    }

    return {
      employee_id: emp.id,
      display_id: emp.employee_id,
      full_name: emp.full_name,
      worker_type: emp.worker_type,
      total_worked_days,
      earned_salary,
      total_overtime_amount,
      total_deduction_amount,
      total_advances,
      final_payable_salary
    }
  })
  
  // Sort alphabetically or by net payable mostly for consistancy, let's just sort by payable descending
  rows.sort((a,b) => b.final_payable_salary - a.final_payable_salary)

  const netPayout = totalPayable - totalRecoverable

  return {
    rows,
    totalPayable,
    totalRecoverable,
    netPayout
  }
}

function getDaysInMonth(monthStr: string) {
  // monthStr is YYYY-MM
  const parts = monthStr.split('-')
  if (parts.length !== 2) return 30
  
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  
  if (isNaN(year) || isNaN(month)) return 30
  
  return new Date(year, month, 0).getDate()
}

export default function PayrollDashboard({
  initialMonth,
  employees,
  attendance,
  workEntries,
  agentRates,
  dailyAttendance,
  outstandingByEmployee,
  generateAction,
  companyName,
  companyId,
  monthPayments,
  userRole = 'admin',
}: PayrollDashboardProps) {
  const router = useRouter()
  
  const [selectedMonth, setSelectedMonth] = useState(initialMonth)
  const [isGenerating, setIsGenerating] = useState(false)
  const [paidUpToDay, setPaidUpToDay] = useState<number | null>(null)
  const [isExportingBulk, setIsExportingBulk] = useState(false)
  const [exportingEmployeeId, setExportingEmployeeId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc'>('default')
  const [paymentModal, setPaymentModal] = useState<{ row: PayrollRow; payable: number } | null>(null)
  const [localPayments, setLocalPayments] = useState<Payment[]>(monthPayments)

  useEffect(() => {
    setPaidUpToDay(null)
    setLocalPayments(monthPayments)
  }, [selectedMonth])

  // When month changes externally (e.g. navigate), sync monthPayments
  useEffect(() => {
    setLocalPayments(monthPayments)
  }, [monthPayments])

  // Use actual days in month for consistent daily wage calculation
  const actualDaysInMonth = getDaysInMonth(selectedMonth)

  const prevMonth = useMemo(() => getPrevMonth(selectedMonth), [selectedMonth])

  const daysInPrevMonth = useMemo(() => getDaysInMonth(prevMonth), [prevMonth])

  // Memoize calculation so it ONLY runs when these specific variables change
  const computedPayroll = useMemo(() => {
    return calculatePayroll(employees, attendance, workEntries, agentRates, dailyAttendance, actualDaysInMonth, outstandingByEmployee)
  }, [employees, attendance, workEntries, agentRates, dailyAttendance, actualDaysInMonth, outstandingByEmployee])

  const prevBalances = useMemo((): Record<string, number> => {
    if (!paidUpToDay) return {}
    return Object.fromEntries(
      employees.map(emp => [
        emp.id,
        calcPrevBalance(emp.monthly_salary, prevMonth, paidUpToDay)
      ])
    )
  }, [paidUpToDay, prevMonth, employees])

  const pdfTotalNetPayout = useMemo(() => {
    return computedPayroll.rows.reduce((sum, row) => {
      return sum + row.final_payable_salary + (prevBalances[row.employee_id] ?? 0)
    }, 0)
  }, [computedPayroll.rows, prevBalances])

  // Compute paid-this-month per employee from localPayments
  const paidByEmployee = useMemo(() => {
    const map: Record<string, number> = {}
    localPayments.forEach(p => {
      map[p.employee_id] = (map[p.employee_id] ?? 0) + Number(p.amount)
    })
    return map
  }, [localPayments])

  // Summary totals after subtracting recorded payments
  const remainingTotals = useMemo(() => {
    let totalRemaining = 0
    let totalRecoverable = 0
    computedPayroll.rows.forEach(row => {
      if (row.final_payable_salary < 0) {
        totalRecoverable += Math.abs(row.final_payable_salary)
      } else {
        const paid = paidByEmployee[row.employee_id] ?? 0
        const remaining = row.final_payable_salary - paid
        if (remaining > 0) totalRemaining += remaining
      }
    })
    return { totalRemaining, totalRecoverable, net: totalRemaining - totalRecoverable }
  }, [computedPayroll.rows, paidByEmployee])

  const filteredRows = useMemo(() => {
    let rows = computedPayroll.rows

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      rows = rows.filter(
        r =>
          r.full_name.toLowerCase().includes(q) ||
          r.display_id.toLowerCase().includes(q)
      )
    }

    if (sortOrder === 'asc') {
      return [...rows].sort((a, b) => a.full_name.localeCompare(b.full_name))
    }
    if (sortOrder === 'desc') {
      return [...rows].sort((a, b) => b.full_name.localeCompare(a.full_name))
    }

    return rows
  }, [computedPayroll.rows, searchQuery, sortOrder])

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = e.target.value // Format YYYY-MM
    if (!newMonth) return

    setSelectedMonth(newMonth)

    // Tell the server to fetch data for this new month
    router.push(`/reports?month=${newMonth}`)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      // Pass the computed values to the Server Action
      const [yearStr, monthStr] = selectedMonth.split('-')
      await generateAction({
        month: parseInt(monthStr, 10),
        year: parseInt(yearStr, 10),
        computedRows: computedPayroll.rows
      })
    } catch (e) {
      console.error('Failed to generate payroll:', e)
      alert('An error occurred generating the payroll.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportBulkPdf = async () => {
    setIsExportingBulk(true)
    try {
      const [{ default: PayrollSummaryPDF }, { pdf }] = await Promise.all([
        import('@/components/pdf/PayrollSummaryPDF'),
        import('@react-pdf/renderer'),
      ])
      const blob = await pdf(
        <PayrollSummaryPDF
          month={selectedMonth}
          companyName={companyName}
          rows={computedPayroll.rows as PayrollRow[]}
          prevBalances={prevBalances}
          totalNetPayout={remainingTotals.net}
          paidByEmployee={paidByEmployee}
        />
      ).toBlob()
      downloadPdf(blob, `payroll-${selectedMonth}.pdf`)
    } catch {
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsExportingBulk(false)
    }
  }

  const handleExportEmployeePdf = async (row: PayrollRow) => {
    setExportingEmployeeId(row.employee_id)
    try {
      const emp = employees.find(e => e.id === row.employee_id)
      if (!emp) return
      const pb = prevBalances[row.employee_id] ?? 0
      const od = pb > 0 && paidUpToDay
        ? Math.max(0, daysInPrevMonth - paidUpToDay)
        : 0
      const prevMonthName = format(new Date(
        parseInt(prevMonth.split('-')[0], 10),
        parseInt(prevMonth.split('-')[1], 10) - 1
      ), 'MMMM yyyy')
      const [{ default: EmployeeDetailPDF }, { pdf }] = await Promise.all([
        import('@/components/pdf/EmployeeDetailPDF'),
        import('@react-pdf/renderer'),
      ])
      const blob = await pdf(
        <EmployeeDetailPDF
          month={selectedMonth}
          companyName={companyName}
          row={row}
          monthlySalary={emp.monthly_salary}
          daysInMonth={actualDaysInMonth}
          prevBalance={pb}
          outstandingDays={od}
          prevMonthName={prevMonthName}
        />
      ).toBlob()
      downloadPdf(blob, `payroll-${row.display_id}-${selectedMonth}.pdf`)
    } catch {
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setExportingEmployeeId(null)
    }
  }

  return (
    <>
      <div className="px-8 pt-8 pb-7 flex items-end justify-between" style={{ backgroundColor: '#1C2333' }}>
        <div>
          <p className="text-xs font-semibold uppercase mb-1.5" style={{ color: '#6B7A99', letterSpacing: '0.1em' }}>Finance</p>
          <h1 className="font-display text-4xl font-extrabold text-white" style={{ letterSpacing: '-0.5px' }}>Monthly Payroll Report</h1>
          <p className="mt-1 text-sm" style={{ color: '#6B7A99' }}>Interactive dashboard for {selectedMonth}</p>
        </div>
        <div className="flex items-center gap-3 mb-1">
          <Link
            href={`/reports/comparison?month=${selectedMonth}`}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
          >
            Compare →
          </Link>
          <button
            onClick={handleExportBulkPdf}
            disabled={isExportingBulk || computedPayroll.rows.length === 0}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
          >
            {isExportingBulk ? 'Generating...' : 'Export PDF'}
          </button>
          {userRole === 'admin' && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating || computedPayroll.rows.length === 0}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#D4A847', color: '#1C2333' }}
            >
              {isGenerating ? 'Generating...' : 'Generate Payroll'}
            </button>
          )}
        </div>
      </div>

      <div className="px-8 py-6">
      {/* Control Panel & Summary Section */}
      <div className="mb-8 overflow-hidden rounded-xl border bg-white shadow-sm p-6">
        <div className="flex flex-col lg:flex-row gap-8 lg:items-center justify-between">
          
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-6">
            <div>
              <label htmlFor="month-select" className="block text-sm font-medium leading-6 text-gray-900">Select Month</label>
              <div className="mt-2">
                <input
                  type="month"
                  id="month-select"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  className="block w-full rounded-md border-0 py-1.5 bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>
            <div>
              <label htmlFor="days-select" className="block text-sm font-medium leading-6 text-gray-900">Days in Month</label>
              <div className="mt-2">
                <input
                  type="number"
                  id="days-select"
                  min="1"
                  max="31"
                  value={actualDaysInMonth}
                  readOnly
                  className="block rounded-md border-0 py-1.5 text-gray-500 shadow-sm ring-1 ring-inset ring-gray-300 bg-gray-50 sm:text-sm sm:leading-6 w-32 cursor-not-allowed"
                  title="Based on actual days in selected month"
                />
              </div>
            </div>
            <div>
              <label htmlFor="paid-up-to" className="block text-sm font-medium leading-6 text-gray-900">
                Prev. month paid up to
              </label>
              <div className="mt-2">
                <input
                  type="number"
                  id="paid-up-to"
                  min={1}
                  max={daysInPrevMonth}
                  value={paidUpToDay ?? ''}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10)
                    setPaidUpToDay(isNaN(val) ? null : Math.min(val, daysInPrevMonth))
                  }}
                  placeholder="e.g. 25"
                  className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 w-28 px-3"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Summary */}
          <div className="flex flex-col sm:flex-row gap-6 lg:gap-12 bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-medium">Total Payable</span>
              <span className="text-xl font-bold text-green-600">{formatINR(remainingTotals.totalRemaining)}</span>
            </div>

            <div className="w-px bg-gray-200 hidden sm:block"></div>

            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-medium">Total Recoverable</span>
              <span className="text-xl font-bold text-red-600">
                {remainingTotals.totalRecoverable > 0 ? `-${formatINR(remainingTotals.totalRecoverable)}` : formatINR(0)}
              </span>
            </div>

            <div className="w-px bg-gray-200 hidden sm:block"></div>

            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-medium">Remaining to Pay</span>
              <span className={`text-2xl font-black ${remainingTotals.net < 0 ? 'text-red-700' : 'text-gray-900'}`}>
                {remainingTotals.net < 0 ? `-${formatINR(Math.abs(remainingTotals.net))}` : formatINR(remainingTotals.net)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search employee…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="block w-64 rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        />
        <button
          onClick={() =>
            setSortOrder(s => s === 'default' ? 'asc' : s === 'asc' ? 'desc' : 'default')
          }
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          {sortOrder === 'default' ? 'Default sort' : sortOrder === 'asc' ? 'A → Z' : 'Z → A'}
        </button>
      </div>

      {/* Dynamic Table */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm mb-12">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Earnings</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Overtime</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Advances</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Payable</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pay</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-sm text-gray-500">
                  {searchQuery.trim()
                    ? 'No employees match your search.'
                    : 'No active employees found to calculate payroll for.'}
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.employee_id} className="hover:bg-gray-50 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {row.full_name} <span className="text-gray-400 text-xs font-normal block">{row.display_id}</span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500 font-medium">{row.total_worked_days}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-700 font-medium">{formatINR(row.earned_salary)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">{formatINR(row.total_overtime_amount)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-red-500">
                    {row.total_deduction_amount > 0 ? `-${formatINR(row.total_deduction_amount)}` : '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-orange-500">
                    {(() => {
                      const outstanding = outstandingByEmployee[row.employee_id]?.totalOutstanding ?? 0
                      return outstanding > 0 ? formatINR(outstanding) : '-'
                    })()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold">
                    {(() => {
                      const paid = paidByEmployee[row.employee_id] ?? 0
                      const remaining = row.final_payable_salary - paid
                      if (row.final_payable_salary < 0) {
                        return <span className="text-red-600">Recover ({formatINR(Math.abs(row.final_payable_salary))})</span>
                      }
                      if (remaining < 0) {
                        return (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-red-600 font-bold">{formatINR(Math.abs(remaining))}</span>
                            <span className="text-[10px] font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded-full">Overpaid</span>
                          </span>
                        )
                      }
                      if (remaining === 0) {
                        return (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-gray-400 line-through">{formatINR(row.final_payable_salary)}</span>
                            <span className="text-[10px] font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full">Settled</span>
                          </span>
                        )
                      }
                      return <span className="text-green-600">{formatINR(remaining)}</span>
                    })()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    {userRole === 'admin' && row.final_payable_salary > 0 && (() => {
                      const paid = paidByEmployee[row.employee_id] ?? 0
                      const remaining = row.final_payable_salary - paid
                      return (
                        <button
                          onClick={() => setPaymentModal({ row: row as PayrollRow, payable: row.final_payable_salary + row.total_advances })}
                          disabled={remaining <= 0}
                          className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
                            remaining <= 0
                              ? 'bg-green-100 text-green-700 cursor-default'
                              : 'bg-indigo-600 text-white hover:bg-indigo-500'
                          }`}
                        >
                          {remaining <= 0 ? 'Paid' : 'Pay'}
                        </button>
                      )
                    })()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => handleExportEmployeePdf(row as PayrollRow)}
                      disabled={!!exportingEmployeeId}
                      title="Download employee PDF"
                      className="text-gray-400 hover:text-indigo-600 disabled:opacity-40 transition-colors"
                    >
                      {exportingEmployeeId === row.employee_id ? '...' : '↓'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {paymentModal && (
        <PaymentModal
          employee={{
            id: paymentModal.row.employee_id,
            full_name: paymentModal.row.full_name,
            employee_id: paymentModal.row.display_id,
          }}
          month={selectedMonth}
          currentMonthPayable={paymentModal.payable}
          companyId={companyId}
          outstandingAdvances={outstandingByEmployee[paymentModal.row.employee_id] ?? { totalOutstanding: 0, advances: [] }}
          onClose={() => setPaymentModal(null)}
          onPaymentRecorded={async () => {
            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient() as unknown as any
            const { data } = await supabase
              .from('payments')
              .select('*')
              .eq('company_id', companyId)
              .eq('month', selectedMonth)
            if (data) setLocalPayments(data)
            router.refresh()
          }}
        />
      )}
      </div>
    </>
  )
}
