import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import ChartsView from './ChartsView'

export default async function ChartsPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const companyId = (profileData as any)?.company_id
  if (!companyId) return <div className="p-8 text-red-600">No company associated with this profile.</div>

  // Build last-6-months range (handles year boundaries correctly)
  const today = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(today, 5 - i)
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: format(d, 'MMM yyyy'),
    }
  })

  const startDate = format(startOfMonth(subMonths(today, 5)), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(today), 'yyyy-MM-dd')

  // Fetch expenses for last 6 months
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, category, date')
    .eq('company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate)

  // Fetch payroll summaries — employees(worker_type) is a FK embed returning a single object
  const { data: summaries } = await supabase
    .from('payroll_summaries')
    .select('final_payable_salary, month, year, employees(worker_type)')
    .eq('company_id', companyId)
    .or(months.map(m => `and(year.eq.${m.year},month.eq.${m.month})`).join(','))

  // Aggregate expense bar chart: total per month
  const expenseByMonth: Record<string, number> = {}
  for (const e of (expenses ?? []) as any[]) {
    const d = new Date(e.date)
    const label = format(d, 'MMM yyyy')
    expenseByMonth[label] = (expenseByMonth[label] ?? 0) + Number(e.amount)
  }
  const expenseBarData = months.map(m => ({ name: m.label, total: expenseByMonth[m.label] ?? 0 }))

  // Aggregate payroll bar chart: total per month summed across all employees
  const payrollByMonth: Record<string, number> = {}
  for (const row of (summaries ?? []) as any[]) {
    const label = months.find(m => m.year === row.year && m.month === row.month)?.label ?? ''
    if (label) payrollByMonth[label] = (payrollByMonth[label] ?? 0) + Number(row.final_payable_salary)
  }
  const payrollBarData = months.map(m => ({ name: m.label, total: payrollByMonth[m.label] ?? 0 }))

  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#F7F6F3' }}>
      <ChartsView
        expenseBarData={expenseBarData}
        expenseRawData={(expenses ?? []) as any[]}
        payrollBarData={payrollBarData}
        summariesRaw={(summaries ?? []) as any[]}
        months={months}
        defaultMonth={currentMonthStr}
      />
    </div>
  )
}
