import { createClient } from '@/lib/supabase/server'
import { formatINR } from '@/lib/payroll-utils'
import { Employee } from '@/types'
import AddEmployeeModal from './components/AddEmployeeModal'
import EditEmployeeModal from './components/EditEmployeeModal'
import ToggleActiveButton from './components/ToggleActiveButton'
import Link from 'next/link'


export default async function EmployeesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = user
    ? await supabase.from('profiles').select('company_id, role').eq('id', user.id).maybeSingle()
    : { data: null }
  const userRole: 'admin' | 'viewer' = (profileData as any)?.role ?? 'viewer'

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        <div className="mt-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3 text-sm text-red-700">
              <p>Error loading employees: {error.message}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const employees: Employee[] = (data || []) as Employee[]

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your company's workforce.
          </p>
        </div>
        {userRole === 'admin' && <AddEmployeeModal />}
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Salary</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              {userRole === 'admin' && (
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={userRole === 'admin' ? 5 : 4} className="px-6 py-8 text-center text-sm text-gray-500">
                  No employees found. Add your first employee to get started.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    <Link href={`/employees/${emp.id}`} className="hover:text-indigo-600 hover:underline transition-colors">
                      {emp.full_name}
                    </Link>
                    {(emp as any).notes && (
                      <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{(emp as any).notes}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{emp.employee_id}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{formatINR(emp.monthly_salary)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${emp.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {userRole === 'admin' && (
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <EditEmployeeModal employee={emp} />
                      <ToggleActiveButton id={emp.id} isActive={emp.is_active} />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
