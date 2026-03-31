import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import PayrollDashboard from '@/components/PayrollDashboard'
import { redirect } from 'next/navigation'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  const profile = profileData as any
  const companyId = profile?.company_id
  const userRole: 'admin' | 'viewer' = profile?.role ?? 'viewer'
  if (!companyId) {
    return (
      <div className="min-h-screen bg-[#0F0A1E] flex items-center justify-center">
        <p className="text-[#EF4444] text-sm">No company associated with this profile.</p>
      </div>
    )
  }

  const { data: companyData } = await supabase
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .maybeSingle();
  const companyName = (companyData as any)?.name ?? 'My Company';

  // Handle Date Parameters
  const today = new Date()
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const selectedMonthStr = searchParams?.month || defaultMonth

  const [yearStr, monthStr] = selectedMonthStr.split('-')
  const currentYear = parseInt(yearStr, 10)
  const currentMonth = parseInt(monthStr, 10)

  // Bounds for query
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
  const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${daysInMonth}`

  // Fetch Raw Employees (all worker types)
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, employee_id, full_name, company_id, monthly_salary, worker_type, daily_rate, standard_working_hours')
    .eq('company_id', companyId)
    .eq('is_active', true)

  if (empErr) console.error('[reports] employees error:', empErr.message)

  // Fetch Raw Attendance for salaried workers
  const { data: attendance } = await supabase
    .from('attendance_records')
    .select('employee_id, date, worked_hours, overtime_hours, overtime_amount, deduction_amount')
    .eq('company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate)

  // Fetch work entries for commission workers (total_amount is pre-calculated at log time)
  const { data: workEntries, error: weErr } = await supabase
    .from('work_entries')
    .select('employee_id, item_id, quantity, date, total_amount')
    .eq('company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate)

  if (weErr) console.error('[reports] work_entries error:', weErr.message)

  // agentRates not needed for earnings (using stored total_amount), kept for future use
  const { data: agentRates } = await supabase
    .from('agent_item_rates')
    .select('employee_id, item_id, rate')
    .eq('company_id', companyId)

  // Fetch legacy daily_attendance for daily workers (historical data before migration)
  const { data: dailyAttendance } = await supabase
    .from('daily_attendance')
    .select('employee_id, date, pay_amount')
    .eq('company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate)

  // Fetch ALL outstanding (unrepaid) advances per employee
  const { data: advancesRaw } = await supabase
    .from('employee_advances')
    .select(`
      id, employee_id, amount, advance_date,
      advance_repayments(amount)
    `)
    .eq('company_id', companyId)

  // Build outstandingByEmployee map
  const outstandingByEmployee: Record<string, { totalOutstanding: number; advances: { id: string; remaining: number; advance_date: string }[] }> = {}
  ;(advancesRaw || []).forEach((a: any) => {
    const repaid = (a.advance_repayments || []).reduce((s: number, r: any) => s + Number(r.amount), 0)
    const remaining = Number(a.amount) - repaid
    if (remaining <= 0) return  // settled, skip
    if (!outstandingByEmployee[a.employee_id]) {
      outstandingByEmployee[a.employee_id] = { totalOutstanding: 0, advances: [] }
    }
    outstandingByEmployee[a.employee_id].totalOutstanding += remaining
    outstandingByEmployee[a.employee_id].advances.push({
      id: a.id,
      remaining,
      advance_date: a.advance_date,
    })
  })
  // Sort advances oldest-first for FIFO allocation (once, after all advances collected)
  Object.values(outstandingByEmployee).forEach(entry => {
    entry.advances.sort((x, y) => x.advance_date.localeCompare(y.advance_date))
  })

  // Fetch payments for this month (for balance display in Pay column)
  const { data: monthPayments } = await supabase
    .from('payments')
    .select('*')
    .eq('company_id', companyId)
    .eq('month', selectedMonthStr)

  // Fetch advance repayments made this month via salary deduction
  const { data: monthAdvanceRepayments } = await supabase
    .from('advance_repayments')
    .select('employee_id, amount')
    .eq('company_id', companyId)
    .eq('method', 'salary_deduction')
    .gte('repayment_date', startDate)
    .lte('repayment_date', endDate)

  const advanceRepaidThisMonth: Record<string, number> = {}
  ;(monthAdvanceRepayments || []).forEach((r: any) => {
    advanceRepaidThisMonth[r.employee_id] = (advanceRepaidThisMonth[r.employee_id] ?? 0) + Number(r.amount)
  })

  // Action for saving the computed dashboard
  async function generatePayrollAction(payload: { month: number, year: number, computedRows: any[] }) {
    'use server'
    const supabaseAction = await createClient()
    const db = supabaseAction as any;

    const { data: { user } } = await db.auth.getUser()
    if (!user) return

    const { data: prof } = await db
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!prof?.company_id) return

    const summariesToUpsert = payload.computedRows.map(row => ({
      company_id: prof.company_id,
      employee_id: row.employee_id,
      month: payload.month,
      year: payload.year,
      total_worked_days: row.total_worked_days,
      total_worked_hours: 0, // Ignored in simple logic
      total_overtime_hours: 0, // Ignored
      total_overtime_amount: row.total_overtime_amount,
      total_deduction_amount: row.total_deduction_amount,
      final_payable_salary: row.final_payable_salary
    }))

    if (summariesToUpsert.length > 0) {
      await db.from('payroll_summaries').upsert(summariesToUpsert, { onConflict: 'employee_id, month, year' })
    }

    revalidatePath('/reports')
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0F0A1E]">
      <PayrollDashboard
        initialMonth={selectedMonthStr}
        employees={(employees || []) as any[]}
        attendance={(attendance || []) as any[]}
        workEntries={(workEntries || []) as any[]}
        agentRates={(agentRates || []) as any[]}
        dailyAttendance={(dailyAttendance || []) as any[]}
        outstandingByEmployee={outstandingByEmployee}
        companyName={companyName}
        companyId={companyId}
        monthPayments={(monthPayments || []) as any[]}
        advanceRepaidThisMonth={advanceRepaidThisMonth}
        generateAction={generatePayrollAction}
        userRole={userRole}
      />
    </div>
  )
}
