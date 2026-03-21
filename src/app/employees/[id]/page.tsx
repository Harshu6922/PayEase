import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Employee, CommissionItem, AgentItemRate } from '@/types'
import CommissionRatesSection from './components/CommissionRatesSection'

export default async function EmployeeDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()

  const profile = profileData as { company_id: string | null } | null
  const companyId = profile?.company_id
  if (!companyId) redirect('/login')

  const { data: employeeData } = await supabase
    .from('employees')
    .select('*')
    .eq('id', params.id)
    .eq('company_id', companyId)
    .maybeSingle()

  const employee = employeeData as Employee | null
  if (!employee) {
    redirect('/employees')
  }

  const { data: itemsData } = await supabase
    .from('commission_items')
    .select('*')
    .eq('company_id', companyId)
    .order('name')

  const commissionItems: CommissionItem[] = (itemsData || []) as CommissionItem[]

  let agentRates: AgentItemRate[] = []
  if (employee.worker_type === 'commission') {
    const { data: ratesData } = await supabase
      .from('agent_item_rates')
      .select('*, commission_items(id, name, default_rate)')
      .eq('employee_id', params.id)

    agentRates = (ratesData || []) as AgentItemRate[]
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <a href="/employees" className="text-blue-600 hover:text-blue-800">← Back to Employees</a>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{employee.full_name}</h1>
      <p className="text-gray-500 mb-6">{employee.employee_id} · {employee.worker_type === 'commission' ? 'Commission Worker' : 'Salaried'}</p>

      {/* Basic info card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Employee Details</h2>
        <dl className="grid grid-cols-2 gap-4">
          <div><dt className="text-gray-500 text-sm">Monthly Salary</dt><dd className="font-medium">Rs. {employee.monthly_salary.toLocaleString()}</dd></div>
          <div><dt className="text-gray-500 text-sm">Working Hours/Day</dt><dd className="font-medium">{employee.standard_working_hours}h</dd></div>
          <div><dt className="text-gray-500 text-sm">Joining Date</dt><dd className="font-medium">{employee.joining_date}</dd></div>
          <div><dt className="text-gray-500 text-sm">Status</dt><dd className="font-medium">{employee.is_active ? 'Active' : 'Inactive'}</dd></div>
        </dl>
      </div>

      {/* Commission section — only for commission workers */}
      {employee.worker_type === 'commission' && (
        <CommissionRatesSection
          employee={employee}
          commissionItems={commissionItems}
          agentRates={agentRates}
        />
      )}
    </div>
  )
}
