import { createClient } from '@/lib/supabase/server'
import { formatINR } from '@/lib/payroll-utils'
import { Employee } from '@/types'
import AddEmployeeModal from './components/AddEmployeeModal'
import EditEmployeeModal from './components/EditEmployeeModal'
import ToggleActiveButton from './components/ToggleActiveButton'
import DeleteEmployeeButton from './components/DeleteEmployeeButton'
import Link from 'next/link'
import PageShell from '@/components/PageShell'
import { PLANS, type PlanId } from '@/lib/plans'

export default async function EmployeesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = user
    ? await supabase.from('profiles').select('company_id, role').eq('id', user.id).maybeSingle()
    : { data: null }
  const userRole: 'admin' | 'viewer' = (profileData as any)?.role ?? 'viewer'
  const companyId = (profileData as any)?.company_id

  const [{ data, error }, { data: subData }] = await Promise.all([
    supabase.from('employees').select('*').order('created_at', { ascending: false }),
    companyId
      ? supabase.from('subscriptions').select('plan, razorpay_subscription_id').eq('company_id', companyId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (error) {
    return (
      <PageShell title="Employees">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Error loading employees: {error.message}
        </div>
      </PageShell>
    )
  }

  const employees: Employee[] = (data || []) as Employee[]
  const planId: PlanId = ((subData as any)?.plan ?? 'starter') as PlanId
  const isSubscribed = !!((subData as any)?.razorpay_subscription_id)
  const employeeLimit = isSubscribed ? (PLANS[planId]?.employeeLimit ?? 15) : 1
  const activeEmployeeCount = employees.filter(e => e.is_active).length
  const atSeatLimit = activeEmployeeCount >= employeeLimit

  return (
    <PageShell
      title="Employees"
      subtitle="Workforce"
      actions={userRole === 'admin' ? <AddEmployeeModal atSeatLimit={atSeatLimit} employeeLimit={employeeLimit} isSubscribed={isSubscribed} /> : undefined}
    >
      <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: '#EDECEA' }}>
        <table className="min-w-full divide-y divide-gray-100">
          <thead style={{ backgroundColor: '#F7F6F3' }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Employee</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Monthly Salary</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Status</th>
              {userRole === 'admin' && (
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={userRole === 'admin' ? 5 : 4} className="px-6 py-8 text-center text-sm" style={{ color: '#9CA3AF' }}>
                  No employees found. Add your first employee to get started.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium" style={{ color: '#1A1F36' }}>
                    <Link href={`/employees/${emp.id}`} className="hover:underline" style={{ color: '#1A1F36' }}>
                      {emp.full_name}
                    </Link>
                    {(emp as any).notes && (
                      <p className="text-xs mt-0.5 max-w-xs truncate" style={{ color: '#9CA3AF' }}>{(emp as any).notes}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm" style={{ color: '#6B7280' }}>{emp.employee_id}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium" style={{ color: '#1A1F36' }}>{formatINR(emp.monthly_salary)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${emp.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {userRole === 'admin' && (
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <EditEmployeeModal employee={emp} />
                      <ToggleActiveButton id={emp.id} isActive={emp.is_active} />
                      <DeleteEmployeeButton id={emp.id} name={emp.full_name} />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  )
}
