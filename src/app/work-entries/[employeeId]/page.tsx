import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, getDaysInMonth } from 'date-fns'
import WorkEntryManager from './components/WorkEntryManager'
import type { Employee, AgentItemRate, WorkEntry } from '@/types'

export default async function WorkerDetailPage({
  params,
  searchParams,
}: {
  params: { employeeId: string }
  searchParams: { month?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('company_id').eq('id', user.id).maybeSingle()
  const companyId = (profileData as { company_id: string | null } | null)?.company_id
  if (!companyId) redirect('/login')

  const { data: companyData } = await supabase
    .from('companies').select('name').eq('id', companyId).maybeSingle()
  const companyName = (companyData as { name: string } | null)?.name ?? 'My Company'

  // Default to current month
  const month = searchParams.month ?? format(new Date(), 'yyyy-MM')
  const [yearStr, monthStr] = month.split('-')
  const year = parseInt(yearStr, 10)
  const monthNum = parseInt(monthStr, 10)
  const daysInMonth = getDaysInMonth(new Date(year, monthNum - 1))
  const firstDay = `${month}-01`
  const lastDay = `${month}-${String(daysInMonth).padStart(2, '0')}`

  // Fetch employee (must belong to company and be commission type)
  const { data: empData } = await supabase
    .from('employees')
    .select('*')
    .eq('id', params.employeeId)
    .eq('company_id', companyId)
    .eq('worker_type', 'commission')
    .maybeSingle()

  if (!empData) redirect('/work-entries')
  const employee = empData as unknown as Employee

  // Fetch all commission items for this company
  const { data: allItems } = await supabase
    .from('commission_items')
    .select('id, name, default_rate')
    .eq('company_id', companyId)

  // Fetch any custom rates set for this employee
  const { data: customRates } = await supabase
    .from('agent_item_rates')
    .select('*, commission_items(id, name, default_rate)')
    .eq('employee_id', params.employeeId)

  const customRateMap: Record<string, number> = {}
  ;(customRates || []).forEach((r: any) => { customRateMap[r.item_id] = r.commission_rate })

  // Build agentRates: use custom rate if set, else fall back to item's default_rate
  const agentRates: AgentItemRate[] = (allItems || []).map((item: any) => ({
    item_id: item.id,
    employee_id: params.employeeId,
    commission_rate: customRateMap[item.id] ?? item.default_rate,
    commission_items: { id: item.id, name: item.name, default_rate: item.default_rate },
  }))

  // Fetch work entries for the month
  const { data: entriesData } = await supabase
    .from('work_entries')
    .select('*')
    .eq('employee_id', params.employeeId)
    .eq('company_id', companyId)
    .gte('date', firstDay)
    .lte('date', lastDay)
    .order('date', { ascending: false })
  const initialEntries = (entriesData || []) as unknown as WorkEntry[]

  return (
    <WorkEntryManager
      employee={employee}
      agentRates={agentRates}
      initialEntries={initialEntries}
      month={month}
      companyId={companyId}
      companyName={companyName}
    />
  )
}
