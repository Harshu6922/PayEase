'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { recomputeEmployeesAttendance } from '@/lib/recompute-attendance'

function normalizeDivisor(value: number | null): number | null {
  if (value == null || Number.isNaN(value)) return null
  const n = Math.trunc(value)
  if (n < 1 || n > 31) return null
  return n
}

type AdminCtx = { error: string; companyId?: undefined } | { error: null; companyId: string }

async function requireAdminCompany(): Promise<AdminCtx> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: profile } = await supabase
    .from('profiles').select('company_id, role').eq('id', user.id).single()
  const companyId = (profile as any)?.company_id
  if (!companyId) return { error: 'No company found' }
  if ((profile as any).role !== 'admin') return { error: 'Only admins allowed' }
  return { error: null, companyId }
}

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// companyId is fetched from the session server-side (not accepted as a parameter)
// to prevent a malicious client from inviting users into a different company.
export async function inviteUser(email: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!(profile as any)?.company_id) return { error: 'No company found' }
  if ((profile as any).role !== 'admin') return { error: 'Only admins can invite users' }

  const adminClient = getAdminClient()
  const origin = headers().get('origin') ?? ''
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { company_id: (profile as any).company_id },
    redirectTo: `${origin}/auth/callback?next=/onboarding`,
  })
  if (error) return { error: error.message }
  return { error: null }
}

export async function changeRole(userId: string, newRole: 'admin' | 'viewer', companyId: string): Promise<{ error: string | null }> {
  // Must use service-role client: profiles_update_own RLS only allows self-updates.
  // Admins updating other members' roles must bypass RLS.
  const adminClient = getAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)
    .eq('company_id', companyId)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { error: null }
}

export async function updateMyName(name: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ full_name: name.trim() })
    .eq('id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { error: null }
}

// Saves the company-wide default divisor that NEW employees inherit.
// Does not touch existing employees (use applySalaryDivisorToAll for that).
export async function saveDefaultSalaryDivisor(value: number | null): Promise<{ error: string | null }> {
  const ctx = await requireAdminCompany()
  if (ctx.error) return { error: ctx.error }
  const divisor = normalizeDivisor(value)
  const adminClient = getAdminClient()
  const { error } = await adminClient
    .from('companies')
    .update({ default_salary_divisor: divisor })
    .eq('id', ctx.companyId)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { error: null }
}

// Sets the company default AND applies the divisor to every salaried employee,
// then rescales their stored attendance so current + previous months stay
// consistent. Returns how many attendance rows were updated.
export async function applySalaryDivisorToAll(
  value: number | null
): Promise<{ error: string | null; updated?: number; employees?: number }> {
  const ctx = await requireAdminCompany()
  if (ctx.error) return { error: ctx.error }
  const divisor = normalizeDivisor(value)
  const adminClient = getAdminClient()

  // Persist the default and push it onto every salaried employee.
  const { error: companyErr } = await adminClient
    .from('companies')
    .update({ default_salary_divisor: divisor })
    .eq('id', ctx.companyId)
  if (companyErr) return { error: companyErr.message }

  const { error: empErr } = await adminClient
    .from('employees')
    .update({ salary_divisor: divisor })
    .eq('company_id', ctx.companyId)
    .eq('worker_type', 'salaried')
  if (empErr) return { error: empErr.message }

  const { data: employees, error: fetchErr } = await adminClient
    .from('employees')
    .select('id, monthly_salary, standard_working_hours, salary_divisor, worker_type')
    .eq('company_id', ctx.companyId)
    .eq('worker_type', 'salaried')
  if (fetchErr) return { error: fetchErr.message }

  try {
    const updated = await recomputeEmployeesAttendance(adminClient, (employees ?? []) as any)
    revalidatePath('/settings')
    revalidatePath('/dashboard')
    return { error: null, updated, employees: employees?.length ?? 0 }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Recompute failed' }
  }
}

export async function removeMember(userId: string): Promise<{ error: string | null }> {
  // Deleting the auth user cascades to profiles via FK.
  // Do NOT delete profiles row directly.
  const adminClient = getAdminClient()
  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { error: null }
}
