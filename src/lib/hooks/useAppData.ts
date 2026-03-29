import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'

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
