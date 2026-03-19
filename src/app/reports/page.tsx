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
    .select('company_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as any
  const companyId = profile?.company_id
  if (!companyId) {
    return <div className="p-8 text-red-600">No company associated with this profile.</div>
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

  // Fetch Raw Employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_id, full_name, company_id, monthly_salary')
    .eq('company_id', companyId)
    .eq('is_active', true)

  // Fetch Raw Attendance for this exact month spread
  const { data: attendance } = await supabase
    .from('attendance_records')
    .select('employee_id, date, worked_hours, overtime_hours, overtime_amount, deduction_amount')
    .eq('company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate)

  // Fetch Advances for this exact month spread
  const { data: advances } = await supabase
    .from('employee_advances')
    .select('employee_id, amount')
    .eq('company_id', companyId)
    .gte('advance_date', startDate)
    .lte('advance_date', endDate)

  // Fetch payments for this month (for balance display in Pay column)
  const { data: monthPayments } = await supabase
    .from('payments')
    .select('*')
    .eq('company_id', companyId)
    .eq('month', selectedMonthStr)

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
    <div className="p-8">
      <PayrollDashboard
        initialMonth={selectedMonthStr}
        employees={(employees || []) as any[]}
        attendance={(attendance || []) as any[]}
        advances={(advances || []) as any[]}
        companyName={companyName}
        companyId={companyId}
        monthPayments={(monthPayments || []) as any[]}
        generateAction={generatePayrollAction}
      />
    </div>
  )
}
