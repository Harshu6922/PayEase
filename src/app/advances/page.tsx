import { createClient } from '@/lib/supabase/server'
import { formatINR } from '@/lib/payroll-utils'
import AddAdvanceModal from './components/AddAdvanceModal'
import { EmployeeAdvance } from '@/types'

interface EmployeeAdvanceWithEmployee extends EmployeeAdvance {
  employees: {
    full_name: string;
    employee_id: string;
  } | null;
}

export default async function AdvancesPage() {
  const supabase = await createClient()

  // Fetch employees for the modal dropdown
  const { data: employeesData } = await supabase
    .from('employees')
    .select('id, full_name, employee_id')
    .eq('is_active', true)
    .order('full_name')

  // Fetch recent advances
  const { data: advancesData } = await supabase
    .from('employee_advances')
    .select('*, employees(full_name, employee_id)')
    .order('advance_date', { ascending: false })

  const employees = employeesData || []
  const advances = (advancesData || []) as unknown as EmployeeAdvanceWithEmployee[]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Advances</h1>
          <p className="mt-1 text-sm text-gray-500">
            Record and track salary advances given to employees.
          </p>
        </div>
        <AddAdvanceModal employees={employees} />
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {advances.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                  No advances recorded yet.
                </td>
              </tr>
            ) : (
              advances.map((adv) => (
                <tr key={adv.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {adv.employees?.full_name} <span className="text-gray-400 text-xs text-normal block">{adv.employees?.employee_id}</span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {adv.advance_date}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-gray-900 text-right">
                    {formatINR(adv.amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {adv.note || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
