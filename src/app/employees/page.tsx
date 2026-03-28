import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Employee } from '@/types'
import { PLANS, type PlanId } from '@/lib/plans'
import EmployeeListClient from './components/EmployeeListClient'

export default async function EmployeesPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('company_id, role').eq('id', user.id).maybeSingle()


  const userRole: 'admin' | 'viewer' = (profileData as any)?.role ?? 'viewer'
  const companyId = (profileData as any)?.company_id

  const [{ data, error }, { data: subData }] = await Promise.all([
    supabase.from('employees').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
    companyId
      ? supabase.from('subscriptions').select('plan, razorpay_subscription_id').eq('company_id', companyId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#100b1f]">
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-6 py-4">
          Error loading employees: {error.message}
        </div>
      </div>
    )
  }

  const employees: Employee[] = (data || []) as Employee[]
  const planId: PlanId = ((subData as any)?.plan ?? 'starter') as PlanId
  const isSubscribed = !!((subData as any)?.razorpay_subscription_id)
  const employeeLimit = isSubscribed ? (PLANS[planId]?.employeeLimit ?? 15) : 1
  const activeEmployeeCount = employees.filter(e => e.is_active).length
  const atSeatLimit = activeEmployeeCount >= employeeLimit

  return (
    <EmployeeListClient
      employees={employees}
      userRole={userRole}
      atSeatLimit={atSeatLimit}
      employeeLimit={employeeLimit}
      isSubscribed={isSubscribed}
    />
  )
}
