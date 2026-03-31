'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { formatINR } from '@/lib/payroll-utils'
import { format } from 'date-fns'
import { getPrevMonth, calcPrevBalance, downloadPdf } from '@/lib/pdf-utils'
import type { PayrollRow, Payment } from '@/types'
import PaymentModal from '@/components/PaymentModal'
import { ChevronLeft, ChevronRight, Search, FileText, Banknote, Users, TrendingDown, Download } from 'lucide-react'
import { fadeInUp, staggerContainer } from '@/lib/animations'

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

interface LegacyDailyRecord {
  employee_id: string
  date: string
  pay_amount: number
}

interface PayrollDashboardProps {
  initialMonth: string // YYYY-MM
  employees: Employee[]
  attendance: AttendanceRecord[]
  workEntries: WorkEntry[]
  agentRates: AgentRate[]
  dailyAttendance?: LegacyDailyRecord[]
  outstandingByEmployee: Record<string, { totalOutstanding: number; advances: { id: string; remaining: number; advance_date: string }[] }>
  generateAction: (data: any) => Promise<void>
  companyName: string
  companyId: string
  monthPayments: Payment[]
  advanceRepaidThisMonth?: Record<string, number>
  userRole?: 'admin' | 'viewer'
}

// Calculation Engine pure function
function calculatePayroll(
  employees: Employee[],
  attendance: AttendanceRecord[],
  workEntries: WorkEntry[],
  agentRates: AgentRate[],
  workingDays: number,
  outstandingByEmployee: Record<string, { totalOutstanding: number; advances: { id: string; remaining: number; advance_date: string }[] }> = {},
  legacyDaily: LegacyDailyRecord[] = []
) {
  let totalPayable = 0
  let totalRecoverable = 0

  const rows = employees.map(emp => {
    let total_worked_days = 0
    let earned_salary = 0
    let total_overtime_amount = 0
    let total_deduction_amount = 0

    if (emp.worker_type === 'commission') {
      const empEntries = workEntries.filter(e => e.employee_id === emp.id)
      earned_salary = empEntries.reduce((sum, e) => sum + Number(e.total_amount ?? 0), 0)
      const uniqueDates = new Set(empEntries.map(e => e.date).filter(Boolean))
      total_worked_days = uniqueDates.size

    } else if (emp.worker_type === 'daily') {
      // New records from attendance_records
      const newAtt = attendance.filter(a => a.employee_id === emp.id && Number(a.worked_hours) > 0)
      const newDates = new Set(newAtt.map(a => a.date))
      newAtt.forEach(record => {
        total_overtime_amount += Number(record.overtime_amount || 0)
        total_deduction_amount += Number(record.deduction_amount || 0)
      })
      const newDaysEarned = newAtt.length * Number(emp.daily_rate ?? 0)

      // Legacy records from daily_attendance (exclude dates already in attendance_records)
      const legacy = legacyDaily.filter(a => a.employee_id === emp.id && !newDates.has(a.date) && Number(a.pay_amount) > 0)
      const legacyEarned = legacy.reduce((s, a) => s + Number(a.pay_amount), 0)

      total_worked_days = newAtt.length + legacy.length
      earned_salary = newDaysEarned + legacyEarned

    } else {
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
    const final_payable_salary = Math.round((earned_salary + total_overtime_amount - total_deduction_amount - advance_deduction) * 100) / 100

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

  rows.sort((a, b) => b.final_payable_salary - a.final_payable_salary)

  const netPayout = totalPayable - totalRecoverable

  return { rows, totalPayable, totalRecoverable, netPayout }
}

function getDaysInMonth(monthStr: string) {
  const parts = monthStr.split('-')
  if (parts.length !== 2) return 30
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  if (isNaN(year) || isNaN(month)) return 30
  return new Date(year, month, 0).getDate()
}

function formatMonth(monthStr: string) {
  const [y, m] = monthStr.split('-')
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function prevMonthStr(monthStr: string) {
  const [y, m] = monthStr.split('-')
  const d = new Date(parseInt(y), parseInt(m) - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMonthStr(monthStr: string) {
  const [y, m] = monthStr.split('-')
  const d = new Date(parseInt(y), parseInt(m), 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

const avatarGradient: Record<string, string> = {
  salaried: 'from-[#bd9dff] to-[#8a4cfc]',
  commission: 'from-[#d3c5f5] to-[#4b4168]',
  daily: 'from-[#dad8ee] to-[#d3c5f5]',
}

const avatarText: Record<string, string> = {
  salaried: 'text-[#000000]',
  commission: 'text-[#382e54]',
  daily: 'text-[#4b455c]',
}

const typeBadge: Record<string, string> = {
  salaried: 'bg-[#4b4168] text-[#d7c9f9]',
  commission: 'bg-[#28213e] text-[#afa7c2]',
  daily: 'bg-[#2f2747] text-[#ebe1fe]',
}

export default function PayrollDashboard({
  initialMonth,
  employees,
  attendance,
  workEntries,
  agentRates,
  dailyAttendance = [],
  outstandingByEmployee,
  generateAction,
  companyName,
  companyId,
  monthPayments,
  advanceRepaidThisMonth = {},
  userRole = 'admin',
}: PayrollDashboardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

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

  useEffect(() => {
    setLocalPayments(monthPayments)
  }, [monthPayments])

  const actualDaysInMonth = getDaysInMonth(selectedMonth)
  const prevMonth = useMemo(() => getPrevMonth(selectedMonth), [selectedMonth])
  const daysInPrevMonth = useMemo(() => getDaysInMonth(prevMonth), [prevMonth])

  const computedPayroll = useMemo(() => {
    return calculatePayroll(employees, attendance, workEntries, agentRates, actualDaysInMonth, outstandingByEmployee, dailyAttendance)
  }, [employees, attendance, workEntries, agentRates, actualDaysInMonth, outstandingByEmployee, dailyAttendance])

  const prevBalances = useMemo((): Record<string, number> => {
    if (!paidUpToDay) return {}
    return Object.fromEntries(
      employees.map(emp => [
        emp.id,
        calcPrevBalance(emp.monthly_salary, prevMonth, paidUpToDay)
      ])
    )
  }, [paidUpToDay, prevMonth, employees])

  const paidByEmployee = useMemo(() => {
    const map: Record<string, number> = {}
    localPayments.forEach(p => {
      map[p.employee_id] = (map[p.employee_id] ?? 0) + Number(p.amount)
    })
    Object.entries(advanceRepaidThisMonth).forEach(([empId, amount]) => {
      map[empId] = (map[empId] ?? 0) + amount
    })
    return map
  }, [localPayments, advanceRepaidThisMonth])

  const remainingTotals = useMemo(() => {
    let totalRemaining = 0
    let totalRecoverable = 0
    computedPayroll.rows.forEach(row => {
      if (row.final_payable_salary < 0) {
        totalRecoverable += Math.abs(row.final_payable_salary)
      } else {
        const paid = paidByEmployee[row.employee_id] ?? 0
        const remaining = Math.round((row.final_payable_salary - paid) * 100) / 100
        if (remaining > 0) totalRemaining += remaining
      }
    })
    return { totalRemaining, totalRecoverable, net: totalRemaining - totalRecoverable }
  }, [computedPayroll.rows, paidByEmployee])

  const employeesPaidCount = useMemo(() => {
    return computedPayroll.rows.filter(row => {
      if (row.final_payable_salary <= 0) return false
      const paid = paidByEmployee[row.employee_id] ?? 0
      return Math.round((row.final_payable_salary - paid) * 100) / 100 <= 0
    }).length
  }, [computedPayroll.rows, paidByEmployee])

  const totalDeductions = useMemo(() => {
    return computedPayroll.rows.reduce((sum, row) => sum + row.total_deduction_amount + row.total_advances, 0)
  }, [computedPayroll.rows])

  const filteredRows = useMemo(() => {
    let rows = computedPayroll.rows
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      rows = rows.filter(r =>
        r.full_name.toLowerCase().includes(q) ||
        r.display_id.toLowerCase().includes(q)
      )
    }
    if (sortOrder === 'asc') return [...rows].sort((a, b) => a.full_name.localeCompare(b.full_name))
    if (sortOrder === 'desc') return [...rows].sort((a, b) => b.full_name.localeCompare(a.full_name))
    return rows
  }, [computedPayroll.rows, searchQuery, sortOrder])

  const navigateMonth = (dir: 'prev' | 'next') => {
    const newMonth = dir === 'prev' ? prevMonthStr(selectedMonth) : nextMonthStr(selectedMonth)
    setSelectedMonth(newMonth)
    startTransition(() => { router.push(`/reports?month=${newMonth}`) })
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
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
      const od = pb > 0 && paidUpToDay ? Math.max(0, daysInPrevMonth - paidUpToDay) : 0
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
    <div className="min-h-screen bg-[#100b1f] pb-20">

      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed top-[-10%] left-[-10%] w-[60%] h-[60%] z-0"
        style={{ background: 'radial-gradient(circle, rgba(189,157,255,0.06) 0%, transparent 70%)' }}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-16">

        {/* Page Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight text-[#ebe1fe]">
              Payroll Reports
            </h1>
            <p className="mt-2 text-[#afa7c2] text-sm">
              {companyName} · salary calculations &amp; payments
            </p>
          </div>

          {/* Month navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 rounded-xl border border-[#bd9dff]/10 text-[#afa7c2] hover:text-[#ebe1fe] hover:border-[#bd9dff]/30 transition-all"
              style={{ background: 'rgba(28,22,46,0.4)' }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div
              className="px-5 py-2.5 rounded-xl font-semibold text-sm min-w-[160px] text-center transition-opacity"
              style={{ background: 'rgba(28,22,46,0.6)', border: '1px solid rgba(189,157,255,0.15)', color: '#ebe1fe', opacity: isPending ? 0.5 : 1 }}
            >
              {isPending ? '…' : formatMonth(selectedMonth)}
            </div>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 rounded-xl border border-[#bd9dff]/10 text-[#afa7c2] hover:text-[#ebe1fe] hover:border-[#bd9dff]/30 transition-all"
              style={{ background: 'rgba(28,22,46,0.4)' }}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Summary Cards */}
        <motion.section
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12"
        >
          {/* Total Payable */}
          <motion.div
            variants={fadeInUp}
            className="p-6 rounded-2xl"
            style={{
              background: 'rgba(28,22,46,0.6)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(189,157,255,0.1)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#afa7c2] text-sm font-medium">Total Payable</span>
              <div className="p-2 rounded-lg" style={{ background: 'rgba(212,168,71,0.1)' }}>
                <Banknote className="h-4 w-4 text-[#D4A847]" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#D4A847] mb-1">
              {formatINR(computedPayroll.totalPayable)}
            </div>
            <p className="text-[#afa7c2] text-xs font-medium">
              {formatINR(remainingTotals.totalRemaining)} remaining to pay
            </p>
          </motion.div>

          {/* Employees Paid */}
          <motion.div
            variants={fadeInUp}
            className="p-6 rounded-2xl"
            style={{
              background: 'rgba(28,22,46,0.6)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(189,157,255,0.1)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#afa7c2] text-sm font-medium">Employees Paid</span>
              <div className="p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)' }}>
                <Users className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-emerald-400 mb-1">
              {employeesPaidCount} / {computedPayroll.rows.length}
            </div>
            <p className="text-[#afa7c2] text-xs font-medium">
              {computedPayroll.rows.length - employeesPaidCount} pending payment
            </p>
          </motion.div>

          {/* Total Deductions */}
          <motion.div
            variants={fadeInUp}
            className="p-6 rounded-2xl"
            style={{
              background: 'rgba(28,22,46,0.6)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(189,157,255,0.1)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#afa7c2] text-sm font-medium">Total Deductions</span>
              <div className="p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <TrendingDown className="h-4 w-4 text-red-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-red-400 mb-1">
              {formatINR(totalDeductions)}
            </div>
            <p className="text-[#afa7c2] text-xs font-medium">
              Includes advances &amp; absences
            </p>
          </motion.div>
        </motion.section>

        {/* Table Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(28,22,46,0.6)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(189,157,255,0.1)',
          }}
        >
          {/* Table toolbar */}
          <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#4b455c]/20">
            <h2 className="text-lg font-bold text-[#ebe1fe]">Salary Breakdown</h2>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(189,157,255,0.05)', border: '1px solid rgba(189,157,255,0.1)' }}
              >
                <Search className="h-4 w-4 text-[#afa7c2] flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-[#ebe1fe] text-sm placeholder:text-[#afa7c2]/50 w-36"
                />
              </div>

              {/* Sort */}
              <button
                onClick={() => setSortOrder(s => s === 'default' ? 'asc' : s === 'asc' ? 'desc' : 'default')}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-[#afa7c2] hover:text-[#ebe1fe] transition-colors"
                style={{ background: 'rgba(189,157,255,0.05)', border: '1px solid rgba(189,157,255,0.1)' }}
              >
                {sortOrder === 'default' ? 'Default' : sortOrder === 'asc' ? 'A → Z' : 'Z → A'}
              </button>

              {/* Export PDF */}
              <button
                onClick={handleExportBulkPdf}
                disabled={isExportingBulk || computedPayroll.rows.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#afa7c2] hover:text-[#ebe1fe] disabled:opacity-40 transition-colors"
                style={{ background: 'rgba(189,157,255,0.05)', border: '1px solid rgba(189,157,255,0.1)' }}
              >
                <Download className="h-4 w-4" />
                {isExportingBulk ? 'Exporting...' : 'Export PDF'}
              </button>

              {/* Generate Payroll */}
              {userRole === 'admin' && (
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || computedPayroll.rows.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40 transition-all hover:shadow-[0_0_20px_rgba(212,168,71,0.3)] active:scale-95"
                  style={{ background: '#D4A847', color: '#1C1000' }}
                >
                  <FileText className="h-4 w-4" />
                  {isGenerating ? 'Generating...' : 'Generate Payroll'}
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="text-[#afa7c2] text-[11px] font-bold tracking-widest uppercase border-b border-[#4b455c]/10">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4 text-center">Type</th>
                  <th className="px-6 py-4 text-right">Days</th>
                  <th className="px-6 py-4 text-right">Deductions</th>
                  <th className="px-6 py-4 text-right">Net Payable</th>
                  <th className="px-6 py-4 text-right">Amount Left</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#4b455c]/10">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-sm text-[#afa7c2]">
                      {searchQuery.trim()
                        ? 'No employees match your search.'
                        : 'No active employees found to calculate payroll for.'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const paid = paidByEmployee[row.employee_id] ?? 0
                    const remaining = Math.round((row.final_payable_salary - paid) * 100) / 100
                    const isFullyPaid = remaining <= 0 && row.final_payable_salary > 0
                    const isOverpaid = remaining < 0
                    const isRecover = row.final_payable_salary < 0

                    return (
                      <tr
                        key={row.employee_id}
                        className="hover:bg-[#bd9dff]/[0.03] transition-colors"
                      >
                        {/* Employee */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient[row.worker_type] ?? 'from-[#bd9dff] to-[#8a4cfc]'} flex items-center justify-center font-bold text-xs flex-shrink-0 ${avatarText[row.worker_type] ?? 'text-black'}`}>
                              {initials(row.full_name)}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-[#ebe1fe]">{row.full_name}</p>
                              <p className="font-mono text-[10px] text-[#afa7c2] uppercase tracking-widest">{row.display_id}</p>
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${typeBadge[row.worker_type] ?? 'bg-[#28213e] text-[#afa7c2]'}`}>
                            {row.worker_type}
                          </span>
                        </td>

                        {/* Days */}
                        <td className="px-6 py-4 text-right text-sm font-semibold text-[#ebe1fe]">
                          {row.total_worked_days}
                        </td>

                        {/* Deductions */}
                        <td className="px-6 py-4 text-right text-sm font-semibold text-red-400">
                          {(row.total_deduction_amount + row.total_advances) > 0
                            ? `-${formatINR(row.total_deduction_amount + row.total_advances)}`
                            : <span className="text-[#afa7c2]">—</span>
                          }
                        </td>

                        {/* Net Payable */}
                        <td className="px-6 py-4 text-right">
                          {isRecover ? (
                            <span className="text-sm font-bold text-red-400">
                              -{formatINR(Math.abs(row.final_payable_salary))}
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-[#D4A847]">
                              {formatINR(row.final_payable_salary)}
                            </span>
                          )}
                        </td>

                        {/* Amount Left */}
                        <td className="px-6 py-4 text-right">
                          {isRecover ? (
                            <span className="text-sm font-bold text-red-400">Recover</span>
                          ) : isOverpaid ? (
                            <span className="text-sm font-bold text-amber-400">
                              +{formatINR(Math.abs(remaining))} over
                            </span>
                          ) : isFullyPaid ? (
                            <span className="text-sm font-semibold text-[#afa7c2] line-through">
                              {formatINR(0)}
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-[#ebe1fe]">
                              {formatINR(remaining)}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 text-center">
                          {isRecover ? (
                            <span className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-500/10 text-red-400">
                              Recover
                            </span>
                          ) : isOverpaid ? (
                            <span className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-500/10 text-amber-400">
                              Overpaid
                            </span>
                          ) : isFullyPaid ? (
                            <span className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-500/10 text-emerald-400">
                              Paid
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-500/10 text-amber-400">
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {userRole === 'admin' && row.final_payable_salary > 0 && (
                              <button
                                onClick={() => setPaymentModal({ row: row as PayrollRow, payable: row.final_payable_salary + row.total_advances })}
                                disabled={remaining <= 0}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  remaining <= 0
                                    ? 'bg-emerald-500/10 text-emerald-400 cursor-default'
                                    : 'bg-[#bd9dff] text-[#000000] hover:shadow-[0_0_12px_rgba(189,157,255,0.3)] active:scale-95'
                                }`}
                              >
                                {remaining <= 0 ? 'Paid' : 'Pay'}
                              </button>
                            )}
                            <button
                              onClick={() => handleExportEmployeePdf(row as PayrollRow)}
                              disabled={!!exportingEmployeeId}
                              title="Download PDF"
                              className="p-1.5 rounded-lg text-[#afa7c2] hover:text-[#ebe1fe] hover:bg-[#bd9dff]/10 disabled:opacity-40 transition-all"
                            >
                              {exportingEmployeeId === row.employee_id ? (
                                <span className="text-xs">...</span>
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>

              {/* Footer totals */}
              {filteredRows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-[#bd9dff]/10" style={{ background: 'rgba(189,157,255,0.03)' }}>
                    <td className="px-6 py-4 text-sm font-bold text-[#afa7c2] uppercase tracking-wider" colSpan={3}>
                      Totals ({filteredRows.length} employees)
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-red-400">
                      -{formatINR(totalDeductions)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-[#D4A847]">
                      {formatINR(computedPayroll.totalPayable)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-[#ebe1fe]">
                      {formatINR(remainingTotals.totalRemaining)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-bold text-[#afa7c2]">
                        {employeesPaidCount}/{computedPayroll.rows.length} paid
                      </span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </motion.div>

      </main>

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
  )
}
