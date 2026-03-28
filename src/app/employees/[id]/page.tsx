import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import type { Employee, CommissionItem, AgentItemRate } from '@/types'
import CommissionRatesSection from './components/CommissionRatesSection'
import EmployeeAttendanceSection from './components/EmployeeAttendanceSection'

const AVATAR_COLORS = [
  '#7c3aed','#0d9488','#b45309','#be185d','#1d4ed8',
  '#9333ea','#0891b2','#c2410c','#15803d','#4338ca',
]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function getInitials(name: string) {
  const p = name.trim().split(' ')
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase()
}

const glassCard: React.CSSProperties = {
  background: 'rgba(28,22,46,0.6)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(189,157,255,0.1)',
}

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('company_id').eq('id', user.id).maybeSingle()
  const companyId = (profileData as { company_id: string | null } | null)?.company_id
  if (!companyId) redirect('/login')

  const { data: employeeData } = await supabase
    .from('employees').select('*').eq('id', params.id).eq('company_id', companyId).maybeSingle()
  const employee = employeeData as Employee | null
  if (!employee) redirect('/employees')

  const { data: itemsData } = await supabase
    .from('commission_items').select('*').eq('company_id', companyId).order('name')
  const commissionItems: CommissionItem[] = (itemsData || []) as CommissionItem[]

  let agentRates: AgentItemRate[] = []
  if (employee.worker_type === 'commission') {
    const { data: ratesData } = await supabase
      .from('agent_item_rates').select('*, commission_items(id, name, default_rate)').eq('employee_id', params.id)
    agentRates = (ratesData || []) as AgentItemRate[]
  }

  const workerTypeLabel =
    employee.worker_type === 'commission' ? 'Commission' :
    employee.worker_type === 'daily' ? 'Daily Worker' : 'Salaried'

  const joiningDate = employee.joining_date
    ? format(new Date(employee.joining_date + 'T00:00:00'), 'd MMM yyyy')
    : '—'

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F0A1E' }}>
      {/* Ambient glow */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none -z-10"
        style={{ background: 'radial-gradient(circle, rgba(189,157,255,0.15) 0%, transparent 70%)' }} />

      <div className="max-w-5xl mx-auto px-6 pt-12 pb-16 space-y-8">
        {/* Back link */}
        <a href="/employees" className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: '#bd9dff' }}>
          ← Back to Employees
        </a>

        {/* Profile header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
              style={{ background: avatarColor(employee.full_name) }}>
              {getInitials(employee.full_name)}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-extrabold text-3xl tracking-tight" style={{ color: '#ebe1fe' }}>
                  {employee.full_name}
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                  style={{ background: 'rgba(189,157,255,0.12)', color: '#bd9dff', border: '1px solid rgba(189,157,255,0.2)' }}>
                  {workerTypeLabel}
                </span>
              </div>
              <p className="text-sm font-medium" style={{ color: '#afa7c2' }}>
                ID: {employee.employee_id}
              </p>
            </div>
          </div>
          <a href={`/employees`} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 self-start md:self-auto"
            style={{ border: '1px solid rgba(189,157,255,0.3)', color: '#bd9dff' }}>
            ← Back
          </a>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl flex flex-col justify-between h-28" style={glassCard}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#afa7c2' }}>Monthly Salary</span>
            <span className="text-xl font-bold" style={{ color: '#D4A847' }}>
              ₹{Number(employee.monthly_salary).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="p-5 rounded-2xl flex flex-col justify-between h-28" style={glassCard}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#afa7c2' }}>Working Hrs/Day</span>
            <span className="text-xl font-bold" style={{ color: '#ebe1fe' }}>{employee.standard_working_hours}h</span>
          </div>
          <div className="p-5 rounded-2xl flex flex-col justify-between h-28" style={glassCard}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#afa7c2' }}>Joining Date</span>
            <span className="text-xl font-bold" style={{ color: '#ebe1fe' }}>{joiningDate}</span>
          </div>
          <div className="p-5 rounded-2xl flex flex-col justify-between h-28" style={glassCard}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#afa7c2' }}>Status</span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: employee.is_active ? '#34d399' : '#ff6e84' }} />
              <span className="text-xl font-bold" style={{ color: employee.is_active ? '#34d399' : '#ff6e84' }}>
                {employee.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Commission rates — commission workers */}
        {employee.worker_type === 'commission' && (
          <CommissionRatesSection
            employee={employee}
            commissionItems={commissionItems}
            agentRates={agentRates}
          />
        )}

        {/* Attendance — salaried and daily workers */}
        {(employee.worker_type === 'salaried' || employee.worker_type === 'daily') && (
          <EmployeeAttendanceSection employee={employee} companyId={companyId} />
        )}
      </div>
    </div>
  )
}
