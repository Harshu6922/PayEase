import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle()
  if (!profile?.company_id) return NextResponse.json({ error: 'No company' }, { status: 403 })

  const { month, year, computedRows } = await request.json()

  const summariesToUpsert = computedRows.map((row: any) => ({
    company_id: profile.company_id,
    employee_id: row.employee_id,
    month,
    year,
    total_worked_days: row.total_worked_days,
    total_worked_hours: 0,
    total_overtime_hours: 0,
    total_overtime_amount: row.total_overtime_amount,
    total_deduction_amount: row.total_deduction_amount,
    final_payable_salary: row.final_payable_salary,
  }))

  if (summariesToUpsert.length > 0) {
    const { error } = await supabase.from('payroll_summaries').upsert(summariesToUpsert, { onConflict: 'employee_id, month, year' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
