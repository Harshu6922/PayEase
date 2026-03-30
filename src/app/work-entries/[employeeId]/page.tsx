'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { format } from 'date-fns'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useAppData'
import WorkEntryManager from './components/WorkEntryManager'
import type { Employee, AgentItemRate, WorkEntry } from '@/types'

const supabase = createClient()

function WorkerDetailContent() {
  const params = useParams<{ employeeId: string }>()
  const searchParams = useSearchParams()
  const month = searchParams.get('month') ?? format(new Date(), 'yyyy-MM')

  const { data: profile } = useProfile()
  const companyId = profile?.company_id

  const { data } = useSWR(
    companyId ? ['work-entry-detail', params.employeeId, companyId, month] : null,
    async ([, employeeId, cid, m]) => {
      const [yearStr, monthStr] = m.split('-')
      const year = parseInt(yearStr, 10)
      const monthNum = parseInt(monthStr, 10)
      const daysInMonth = new Date(year, monthNum, 0).getDate()
      const firstDay = `${m}-01`
      const lastDay = `${m}-${String(daysInMonth).padStart(2, '0')}`

      const [
        { data: companyData },
        { data: empData },
        { data: allItems },
        { data: customRates },
        { data: entriesData },
      ] = await Promise.all([
        supabase.from('companies').select('name').eq('id', cid).maybeSingle(),
        supabase.from('employees').select('*').eq('id', employeeId).eq('company_id', cid).eq('worker_type', 'commission').maybeSingle(),
        supabase.from('commission_items').select('id, name, default_rate').eq('company_id', cid),
        supabase.from('agent_item_rates').select('*, commission_items(id, name, default_rate)').eq('employee_id', employeeId),
        supabase.from('work_entries').select('*').eq('employee_id', employeeId).eq('company_id', cid).gte('date', firstDay).lte('date', lastDay).order('date', { ascending: false }),
      ])

      if (!empData) return null

      const customRateMap: Record<string, number> = {}
      ;(customRates || []).forEach((r: any) => { customRateMap[r.item_id] = r.commission_rate })

      const agentRates: AgentItemRate[] = (allItems || []).map((item: any) => ({
        id: item.id,
        created_at: '',
        item_id: item.id,
        employee_id: employeeId,
        commission_rate: customRateMap[item.id] ?? item.default_rate,
        commission_items: { id: item.id, name: item.name, default_rate: item.default_rate },
      }))

      return {
        employee: empData as unknown as Employee,
        agentRates,
        initialEntries: (entriesData || []) as unknown as WorkEntry[],
        companyName: (companyData as any)?.name ?? 'My Company',
      }
    },
    { revalidateOnFocus: false }
  )

  if (!data) return null

  return (
    <WorkEntryManager
      employee={data.employee}
      agentRates={data.agentRates}
      initialEntries={data.initialEntries}
      month={month}
      companyId={companyId!}
      companyName={data.companyName}
    />
  )
}

export default function WorkerDetailPage() {
  return (
    <Suspense fallback={null}>
      <WorkerDetailContent />
    </Suspense>
  )
}
