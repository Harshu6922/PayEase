import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ) as any

  const { data: session } = await db
    .from('employee_sessions')
    .select('employee_id, company_id')
    .eq('token', token)
    .gt('token_expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { employee_id, company_id } = session

  const [{ data: emp }, { data: company }] = await Promise.all([
    db.from('employees')
      .select('id, full_name, employee_id, worker_type, monthly_salary, daily_rate, standard_working_hours, joining_date, is_active, phone_number')
      .eq('id', employee_id).maybeSingle(),
    db.from('companies').select('name').eq('id', company_id).maybeSingle(),
  ])

  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 7) + '-01'

  const [{ data: attendance }, { data: advances }, { data: payments }, { data: workEntries }] = await Promise.all([
    db.from('attendance_records')
      .select('date, status, start_time, end_time')
      .eq('employee_id', employee_id)
      .gte('date', monthStart)
      .order('date', { ascending: false }),
    db.from('employee_advances')
      .select('amount, advance_date, is_repaid')
      .eq('employee_id', employee_id)
      .order('advance_date', { ascending: false }),
    db.from('payments')
      .select('amount, payment_date, note')
      .eq('employee_id', employee_id)
      .order('payment_date', { ascending: false })
      .limit(5),
    emp.worker_type === 'commission'
      ? db.from('work_entries').select('total_amount').eq('employee_id', employee_id)
          .gte('date', monthStart).lte('date', today)
      : Promise.resolve({ data: [] }),
  ])

  // Calculate days present this month
  const daysPresent = (attendance ?? []).reduce(
    (sum: number, a: any) => sum + (a.status === 'Half Day' ? 0.5 : a.status === 'Present' ? 1 : 0), 0
  )

  // Monthly earnings
  let monthlyEarnings = 0
  if (emp.worker_type === 'salaried') {
    monthlyEarnings = Math.round((daysPresent / 26) * (emp.monthly_salary ?? 0))
  } else if (emp.worker_type === 'daily') {
    monthlyEarnings = Math.round(daysPresent * (emp.daily_rate ?? 0))
  } else if (emp.worker_type === 'commission') {
    monthlyEarnings = (workEntries ?? []).reduce((s: number, e: any) => s + Number(e.total_amount ?? 0), 0)
  }

  // Pending advance balance
  const advanceBalance = (advances ?? [])
    .filter((a: any) => !a.is_repaid)
    .reduce((s: number, a: any) => s + Number(a.amount ?? 0), 0)

  return NextResponse.json({
    employee: emp,
    companyName: company?.name ?? 'Your Company',
    daysPresent,
    monthlyEarnings,
    advanceBalance,
    attendance: attendance ?? [],
    payments: payments ?? [],
  })
}
