import type { SupabaseClient } from '@supabase/supabase-js'
import { recomputeAttendanceRow } from './payroll-backfill'
import { Employee } from '@/types'

type DivisorEmployee = Pick<
  Employee,
  'id' | 'monthly_salary' | 'standard_working_hours' | 'salary_divisor' | 'worker_type'
>

/**
 * Rescales every stored attendance row for the given employees to match their
 * current `salary_divisor` (see recomputeAttendanceRow). Returns the number of
 * rows actually changed. Requires a service-role client (writes bypass RLS).
 */
export async function recomputeEmployeesAttendance(
  admin: SupabaseClient,
  employees: DivisorEmployee[]
): Promise<number> {
  let updated = 0

  for (const emp of employees) {
    const { data: rows, error } = await admin
      .from('attendance_records')
      .select('id, status, date, daily_wage, hourly_rate, worked_hours, daily_pay, overtime_hours, overtime_amount, deduction_hours, deduction_amount')
      .eq('employee_id', emp.id)
    if (error) throw new Error(error.message)

    for (const row of rows ?? []) {
      const next = recomputeAttendanceRow(emp as unknown as Employee, row as any)
      const changed =
        next.daily_wage !== Number((row as any).daily_wage) ||
        next.hourly_rate !== Number((row as any).hourly_rate) ||
        next.daily_pay !== Number((row as any).daily_pay) ||
        next.overtime_amount !== Number((row as any).overtime_amount) ||
        next.deduction_amount !== Number((row as any).deduction_amount)
      if (!changed) continue

      const { error: updErr } = await admin
        .from('attendance_records')
        .update(next)
        .eq('id', (row as any).id)
      if (updErr) throw new Error(updErr.message)
      updated++
    }
  }

  return updated
}
