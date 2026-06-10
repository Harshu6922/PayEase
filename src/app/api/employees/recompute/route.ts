import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { recomputeEmployeesAttendance } from '@/lib/recompute-attendance'

/**
 * Recomputes (rescales) stored attendance rows after a salary_divisor change,
 * so current and previous months reflect the new per-day rate. Pass
 * { employeeId } to target one employee, or omit it to recompute every
 * salaried employee in the caller's company. Admin only.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('company_id, role').eq('id', user.id).maybeSingle()
  const companyId = (profile as any)?.company_id
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })
  if ((profile as any)?.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const employeeId: string | undefined = body?.employeeId

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Target salaried employees in this company (only they use a divisor).
  let empQuery = admin
    .from('employees')
    .select('id, monthly_salary, standard_working_hours, salary_divisor, worker_type')
    .eq('company_id', companyId)
    .eq('worker_type', 'salaried')
  if (employeeId) empQuery = empQuery.eq('id', employeeId)

  const { data: employees, error: empErr } = await empQuery
  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 })

  try {
    const updated = await recomputeEmployeesAttendance(admin, (employees ?? []) as any)
    return NextResponse.json({ success: true, updated, employees: employees?.length ?? 0 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Recompute failed' }, { status: 500 })
  }
}
