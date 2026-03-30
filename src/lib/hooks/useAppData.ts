import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

const supabase = createClient()

// Fetches and caches company ID + role — shared across all hooks
async function fetchProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('company_id, role').eq('id', user.id).maybeSingle()
  return data as { company_id: string; role: string } | null
}

export function useProfile() {
  return useSWR('profile', fetchProfile, { revalidateOnFocus: false })
}

export function useEmployees() {
  const { data: profile } = useProfile()
  return useSWR(
    profile?.company_id ? ['employees', profile.company_id] : null,
    async ([, companyId]) => {
      const { data } = await supabase.from('employees').select('*').eq('company_id', companyId).order('created_at', { ascending: false })
      return data ?? []
    },
    { revalidateOnFocus: false }
  )
}

export function useAttendanceEmployees() {
  const { data: profile } = useProfile()
  return useSWR(
    profile?.company_id ? ['attendance-employees', profile.company_id] : null,
    async ([, companyId]) => {
      const { data } = await supabase.from('employees').select('*').eq('company_id', companyId).eq('is_active', true).order('full_name')
      return data ?? []
    },
    { revalidateOnFocus: false }
  )
}

export function useDashboard() {
  const { data: profile } = useProfile()
  const companyId = profile?.company_id
  return useSWR(
    companyId ? ['dashboard', companyId] : null,
    async ([, cid]) => {
      const today = new Date().toISOString().split('T')[0]
      const currentMonth = today.slice(0, 7)
      const [
        { count: totalEmployees },
        { count: salaryEmployees },
        { count: commissionEmployees },
        { count: dailyEmployees },
        { count: todaysAttendance },
        { data: advancesData, count: advancesCount },
        { data: expensesData },
        { data: topEmployees },
      ] = await Promise.all([
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', cid).eq('is_active', true),
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', cid).eq('is_active', true).eq('worker_type', 'salaried'),
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', cid).eq('is_active', true).eq('worker_type', 'commission'),
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', cid).eq('is_active', true).eq('worker_type', 'daily'),
        supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('company_id', cid).eq('date', today),
        supabase.from('advances').select('amount', { count: 'exact' }).eq('company_id', cid).eq('status', 'outstanding'),
        supabase.from('expenses').select('amount').eq('company_id', cid).gte('date', `${currentMonth}-01`),
        supabase.from('employees').select('id, full_name, worker_type, monthly_salary').eq('company_id', cid).eq('is_active', true).order('full_name').limit(5),
      ])
      return {
        totalEmployees: totalEmployees ?? 0,
        salaryEmployees: salaryEmployees ?? 0,
        commissionEmployees: commissionEmployees ?? 0,
        dailyEmployees: dailyEmployees ?? 0,
        todaysAttendance: todaysAttendance ?? 0,
        totalAdvances: advancesData?.reduce((s, a: any) => s + (a.amount ?? 0), 0) ?? 0,
        advancesCount: advancesCount ?? 0,
        totalExpenses: expensesData?.reduce((s, e: any) => s + (e.amount ?? 0), 0) ?? 0,
        topEmployees: (topEmployees ?? []) as any[],
      }
    },
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )
}

export function useAdvances() {
  const { data: profile } = useProfile()
  return useSWR(
    profile?.company_id ? ['advances', profile.company_id] : null,
    async ([, companyId]) => {
      const now = new Date()
      const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const startOfMon = `${monthPrefix}-01`
      const endOfMon = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

      const [{ data: employees }, { data: advancesRaw }, { data: monthRepayments }] = await Promise.all([
        supabase.from('employees').select('id, full_name, employee_id').eq('company_id', companyId).eq('is_active', true).order('full_name'),
        supabase.from('employee_advances').select('id, employee_id, company_id, amount, advance_date, note, employees(full_name, employee_id), advance_repayments(amount)').eq('company_id', companyId).order('advance_date', { ascending: false }),
        supabase.from('advance_repayments').select('amount').eq('company_id', companyId).gte('repayment_date', startOfMon).lte('repayment_date', endOfMon),
      ])

      const advances = (advancesRaw || []).map((a: any) => {
        const repaid_total = (a.advance_repayments || []).reduce((s: number, r: any) => s + Number(r.amount), 0)
        return {
          id: a.id, employee_id: a.employee_id, company_id: a.company_id,
          amount: Number(a.amount), advance_date: a.advance_date, note: a.note,
          repaid_total, remaining: Number(a.amount) - repaid_total,
          employee_name: a.employees?.full_name ?? '—',
          employee_display_id: a.employees?.employee_id ?? '—',
        }
      })

      const totalOutstanding = advances.reduce((s, a) => s + (a.remaining > 0 ? a.remaining : 0), 0)
      const givenThisMonth = advances.filter(a => a.advance_date.startsWith(monthPrefix)).reduce((s, a) => s + a.amount, 0)
      const recoveredThisMonth = (monthRepayments || []).reduce((s: number, r: any) => s + Number(r.amount), 0)

      return { advances, employees: employees ?? [], totalOutstanding, givenThisMonth, recoveredThisMonth }
    },
    { revalidateOnFocus: false, revalidateOnMount: true }
  )
}

export function useExpenses(month: string) {
  const { data: profile } = useProfile()
  return useSWR(
    profile?.company_id ? ['expenses', profile.company_id, month] : null,
    async ([, companyId, m]) => {
      const [year, mon] = m.split('-').map(Number)
      const startDate = `${m}-01`
      const endDate = `${m}-${new Date(year, mon, 0).getDate()}`

      const [{ data: expenses }, { data: templates }] = await Promise.all([
        supabase.from('expenses').select('*').eq('company_id', companyId).gte('date', startDate).lte('date', endDate).order('date', { ascending: false }),
        supabase.from('expense_templates').select('*').eq('company_id', companyId).order('created_at', { ascending: true }),
      ])
      return { expenses: (expenses || []) as any[], templates: (templates || []) as any[] }
    },
    { revalidateOnFocus: false, revalidateOnMount: true }
  )
}

export function usePayments(month: string) {
  const { data: profile } = useProfile()
  return useSWR(
    profile?.company_id ? ['payments', profile.company_id, month] : null,
    async ([, companyId, m]) => {
      const [year, mon] = m.split('-').map(Number)
      const startDate = `${m}-01`
      const endDate = `${m}-${new Date(year, mon, 0).getDate()}`

      const [{ data: payments }, { data: advances }, { data: employees }] = await Promise.all([
        supabase.from('payments').select('id, employee_id, amount, payment_date, note, month').eq('company_id', companyId).eq('month', m).order('payment_date', { ascending: false }),
        supabase.from('employee_advances').select('id, employee_id, amount, advance_date, note').eq('company_id', companyId).gte('advance_date', startDate).lte('advance_date', endDate).order('advance_date', { ascending: false }),
        supabase.from('employees').select('id, full_name, employee_id, worker_type').eq('company_id', companyId).eq('is_active', true),
      ])
      return {
        payments: (payments || []) as any[],
        advances: (advances || []) as any[],
        employees: (employees || []) as any[],
      }
    },
    { revalidateOnFocus: false, revalidateOnMount: true }
  )
}

export function useCommissionItems() {
  const { data: profile } = useProfile()
  return useSWR(
    profile?.company_id ? ['commission-items', profile.company_id] : null,
    async ([, companyId]) => {
      const { data } = await supabase.from('commission_items').select('*').eq('company_id', companyId).order('name')
      return (data || []) as any[]
    },
    { revalidateOnFocus: false }
  )
}

export function useWorkEntries() {
  const { data: profile } = useProfile()
  return useSWR(
    profile?.company_id ? ['work-entries-workers', profile.company_id] : null,
    async ([, companyId]) => {
      const [{ data: companyData }, { data: workers }] = await Promise.all([
        supabase.from('companies').select('name').eq('id', companyId).maybeSingle(),
        supabase.from('employees').select('id, full_name, employee_id').eq('company_id', companyId).eq('worker_type', 'commission').eq('is_active', true).order('full_name'),
      ])
      return {
        companyName: (companyData as any)?.name ?? 'My Company',
        workers: (workers || []) as { id: string; full_name: string; employee_id: string }[],
      }
    },
    { revalidateOnFocus: false }
  )
}

export function useDailyWorkers() {
  const { data: profile } = useProfile()
  return useSWR(
    profile?.company_id ? ['daily-workers', profile.company_id] : null,
    async ([, companyId]) => {
      const { data } = await supabase.from('employees').select('*').eq('company_id', companyId).eq('worker_type', 'daily').eq('is_active', true).order('full_name')
      return (data || []) as any[]
    },
    { revalidateOnFocus: false }
  )
}

export function useAdvanceRepayments() {
  const { data: profile } = useProfile()
  return useSWR(
    profile?.company_id ? ['advance-repayments', profile.company_id] : null,
    async ([, companyId]) => {
      const { data: raw } = await supabase
        .from('advance_repayments')
        .select('id, amount, repayment_date, method, note, employee_advances(amount, advance_date), employees(full_name, employee_id)')
        .eq('company_id', companyId)
        .order('repayment_date', { ascending: false })

      return (raw || []).map((r: any) => ({
        id: r.id,
        amount: Number(r.amount),
        repayment_date: r.repayment_date,
        method: r.method,
        note: r.note ?? null,
        advance_amount: Number(r.employee_advances?.amount ?? 0),
        advance_date: r.employee_advances?.advance_date ?? null,
        employee_name: r.employees?.full_name ?? '—',
        employee_display_id: r.employees?.employee_id ?? '—',
      }))
    },
    { revalidateOnFocus: false, revalidateOnMount: true }
  )
}

export function useCharts() {
  const { data: profile } = useProfile()
  return useSWR(
    profile?.company_id ? ['charts', profile.company_id] : null,
    async ([, companyId]) => {
      const today = new Date()
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(today, 5 - i)
        return { year: d.getFullYear(), month: d.getMonth() + 1, label: format(d, 'MMM yyyy') }
      })
      const startDate = format(startOfMonth(subMonths(today, 5)), 'yyyy-MM-dd')
      const endDate = format(endOfMonth(today), 'yyyy-MM-dd')

      const [{ data: expenses }, { data: summaries }] = await Promise.all([
        supabase.from('expenses').select('amount, category, date').eq('company_id', companyId).gte('date', startDate).lte('date', endDate),
        supabase.from('payroll_summaries').select('final_payable_salary, month, year, employees(worker_type)').eq('company_id', companyId).or(months.map(m => `and(year.eq.${m.year},month.eq.${m.month})`).join(',')),
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
      return { expenseBarData, expenseRawData: (expenses ?? []) as any[], payrollBarData, summariesRaw: (summaries ?? []) as any[], months, defaultMonth: currentMonthStr }
    },
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )
}

export function useReports(month: string) {
  const { data: profile } = useProfile()
  return useSWR(
    profile?.company_id ? ['reports', profile.company_id, month] : null,
    async ([, companyId, selectedMonthStr]) => {
      const [yearStr, monthStr] = selectedMonthStr.split('-')
      const currentYear = parseInt(yearStr, 10)
      const currentMonth = parseInt(monthStr, 10)
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${daysInMonth}`

      const [
        { data: companyData },
        { data: employees },
        { data: attendance },
        { data: workEntries },
        { data: agentRates },
        { data: dailyAttendance },
        { data: advancesRaw },
        { data: monthPayments },
        { data: monthAdvanceRepayments },
      ] = await Promise.all([
        supabase.from('companies').select('name').eq('id', companyId).maybeSingle(),
        supabase.from('employees').select('id, employee_id, full_name, company_id, monthly_salary, worker_type, daily_rate, standard_working_hours').eq('company_id', companyId).eq('is_active', true),
        supabase.from('attendance_records').select('employee_id, date, worked_hours, overtime_hours, overtime_amount, deduction_amount').eq('company_id', companyId).gte('date', startDate).lte('date', endDate),
        supabase.from('work_entries').select('employee_id, item_id, quantity, date, total_amount').eq('company_id', companyId).gte('date', startDate).lte('date', endDate),
        supabase.from('agent_item_rates').select('employee_id, item_id, rate').eq('company_id', companyId),
        supabase.from('daily_attendance').select('employee_id, date, hours_worked, pay_amount').eq('company_id', companyId).gte('date', startDate).lte('date', endDate),
        supabase.from('employee_advances').select('id, employee_id, amount, advance_date, advance_repayments(amount)').eq('company_id', companyId),
        supabase.from('payments').select('*').eq('company_id', companyId).eq('month', selectedMonthStr),
        supabase.from('advance_repayments').select('employee_id, amount').eq('company_id', companyId).eq('method', 'salary_deduction').gte('repayment_date', startDate).lte('repayment_date', endDate),
      ])

      const companyName = (companyData as any)?.name ?? 'My Company'

      const outstandingByEmployee: Record<string, { totalOutstanding: number; advances: { id: string; remaining: number; advance_date: string }[] }> = {}
      ;(advancesRaw || []).forEach((a: any) => {
        const repaid = (a.advance_repayments || []).reduce((s: number, r: any) => s + Number(r.amount), 0)
        const remaining = Number(a.amount) - repaid
        if (remaining <= 0) return
        if (!outstandingByEmployee[a.employee_id]) {
          outstandingByEmployee[a.employee_id] = { totalOutstanding: 0, advances: [] }
        }
        outstandingByEmployee[a.employee_id].totalOutstanding += remaining
        outstandingByEmployee[a.employee_id].advances.push({ id: a.id, remaining, advance_date: a.advance_date })
      })
      Object.values(outstandingByEmployee).forEach(entry => {
        entry.advances.sort((x, y) => x.advance_date.localeCompare(y.advance_date))
      })

      const advanceRepaidThisMonth: Record<string, number> = {}
      ;(monthAdvanceRepayments || []).forEach((r: any) => {
        advanceRepaidThisMonth[r.employee_id] = (advanceRepaidThisMonth[r.employee_id] ?? 0) + Number(r.amount)
      })

      return {
        companyName,
        companyId,
        employees: (employees || []) as any[],
        attendance: (attendance || []) as any[],
        workEntries: (workEntries || []) as any[],
        agentRates: (agentRates || []) as any[],
        dailyAttendance: (dailyAttendance || []) as any[],
        outstandingByEmployee,
        monthPayments: (monthPayments || []) as any[],
        advanceRepaidThisMonth,
      }
    },
    { revalidateOnFocus: false, revalidateOnMount: true }
  )
}
