import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ) as any
}

export async function generateSnapshot(companyId: string) {
  const db = getAdmin()
  const today = new Date()
  const month = today.toISOString().slice(0, 7)
  const todayStr = today.toISOString().split('T')[0]
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

  const [
    { data: employees },
    { data: attendance },
    { data: workEntries },
    { data: payments },
    { data: advances },
    { data: todayAtt },
  ] = await Promise.all([
    db.from('employees').select('id,full_name,worker_type,monthly_salary,daily_rate').eq('company_id', companyId).eq('is_active', true),
    db.from('attendance_records').select('employee_id,worked_hours,overtime_amount,deduction_amount').eq('company_id', companyId).like('date', `${month}%`),
    db.from('work_entries').select('employee_id,total_amount').eq('company_id', companyId).like('date', `${month}%`),
    db.from('payments').select('employee_id,amount').eq('company_id', companyId).eq('month', month),
    db.from('employee_advances').select('employee_id,amount,repaid_amount').eq('company_id', companyId),
    db.from('attendance_records').select('employee_id').eq('company_id', companyId).eq('date', todayStr),
  ])

  const emp = employees ?? []

  const outstanding: Record<string, number> = {}
  for (const a of advances ?? []) {
    const v = Number(a.amount) - Number(a.repaid_amount ?? 0)
    if (v > 0) outstanding[a.employee_id] = (outstanding[a.employee_id] ?? 0) + v
  }

  const paid: Record<string, number> = {}
  for (const p of payments ?? []) paid[p.employee_id] = (paid[p.employee_id] ?? 0) + Number(p.amount)

  const todayIds = new Set((todayAtt ?? []).map((a: any) => a.employee_id))

  const payroll = emp.map((e: any) => {
    let earned = 0
    if (e.worker_type === 'commission') {
      earned = (workEntries ?? []).filter((w: any) => w.employee_id === e.id)
        .reduce((s: number, w: any) => s + Number(w.total_amount ?? 0), 0)
    } else if (e.worker_type === 'daily') {
      const att = (attendance ?? []).filter((a: any) => a.employee_id === e.id)
      const worked = att.filter((a: any) => Number(a.worked_hours) > 0).length
      const ot = att.reduce((s: number, a: any) => s + Number(a.overtime_amount ?? 0), 0)
      const ded = att.reduce((s: number, a: any) => s + Number(a.deduction_amount ?? 0), 0)
      earned = Math.round((Number(e.daily_rate ?? 0) * worked + ot - ded) * 100) / 100
    } else {
      const att = (attendance ?? []).filter((a: any) => a.employee_id === e.id)
      const worked = att.filter((a: any) => Number(a.worked_hours) > 0).length
      const ot = att.reduce((s: number, a: any) => s + Number(a.overtime_amount ?? 0), 0)
      const ded = att.reduce((s: number, a: any) => s + Number(a.deduction_amount ?? 0), 0)
      earned = Math.round((Number(e.monthly_salary) / daysInMonth * worked + ot - ded) * 100) / 100
    }
    const adv = outstanding[e.id] ?? 0
    return {
      employee_id: e.id,
      full_name: e.full_name,
      worker_type: e.worker_type,
      monthly_salary: Number(e.monthly_salary),
      earned_salary: Math.round(earned * 100) / 100,
      advance_deduction: Math.round(adv * 100) / 100,
      final_payable_salary: Math.round((earned - adv) * 100) / 100,
      paid_this_month: Math.round((paid[e.id] ?? 0) * 100) / 100,
    }
  })

  const totalPaid = Object.values(paid).reduce((s, v) => s + v, 0)
  const due15 = new Date(today.getFullYear(), today.getMonth() + 1, 15).toISOString().split('T')[0]

  return {
    month,
    generated_at: new Date().toISOString(),
    metrics: {
      total_paid_this_month: Math.round(totalPaid * 100) / 100,
      active_employees: emp.length,
      present_today: todayIds.size,
      attendance_percentage: emp.length > 0 ? Math.round(todayIds.size / emp.length * 100) : 0,
    },
    payroll,
    employees: emp.map((e: any) => ({
      id: e.id, full_name: e.full_name, worker_type: e.worker_type, monthly_salary: Number(e.monthly_salary),
    })),
    attendance: {
      present_today: emp.filter((e: any) => todayIds.has(e.id)).map((e: any) => ({ employee_id: e.id, full_name: e.full_name })),
      monthly_summary: emp.map((e: any) => ({
        employee_id: e.id,
        full_name: e.full_name,
        days_worked: (attendance ?? []).filter((a: any) => a.employee_id === e.id && Number(a.worked_hours) > 0).length,
      })),
    },
    compliance: {
      pf_due_date: due15,
      esi_due_date: due15,
      note: `PF & ESI challans due by 15th (${due15})`,
    },
  }
}

export async function runNightlySnapshots() {
  const db = getAdmin()
  const { data: companies } = await db.from('companies').select('id')
  if (!companies?.length) return { processed: 0 }

  let processed = 0
  for (const { id } of companies) {
    try {
      const data = await generateSnapshot(id)
      await db.from('business_snapshots').upsert(
        { company_id: id, snapshot_date: data.generated_at.split('T')[0], generated_at: data.generated_at, data },
        { onConflict: 'company_id,snapshot_date' }
      )
      processed++
    } catch (e) {
      console.error(`Snapshot failed for ${id}:`, e)
    }
  }

  // Clean expired viewer sessions (older than 7 days)
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  await db.from('viewer_sessions').delete().lt('token_expires_at', cutoff)

  return { processed }
}
