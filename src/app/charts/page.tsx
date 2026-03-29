import { getServerSession } from '@/lib/supabase/session'
import { redirect } from 'next/navigation'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import ChartsView from './ChartsView'

export default async function ChartsPage() {
  const { companyId, supabase } = await getServerSession()
  if (!companyId) redirect('/login')

  const today = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(today, 5 - i)
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: format(d, 'MMM yyyy') }
  })

  const startDate = format(startOfMonth(subMonths(today, 5)), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(today), 'yyyy-MM-dd')

  const [{ data: expenses }, { data: summaries }] = await Promise.all([
    supabase.from('expenses').select('amount, category, date')
      .eq('company_id', companyId).gte('date', startDate).lte('date', endDate),
    supabase.from('payroll_summaries')
      .select('final_payable_salary, month, year, employees(worker_type)')
      .eq('company_id', companyId)
      .or(months.map(m => `and(year.eq.${m.year},month.eq.${m.month})`).join(',')),
  ])

  const expenseByMonth: Record<string, number> = {}
  for (const e of (expenses ?? []) as any[]) {
    const label = format(new Date(e.date), 'MMM yyyy')
    expenseByMonth[label] = (expenseByMonth[label] ?? 0) + Number(e.amount)
  }
  const expenseBarData = months.map(m => ({ name: m.label, total: expenseByMonth[m.label] ?? 0 }))

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
