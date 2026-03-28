import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CommissionItem } from '@/types'
import CommissionItemsManager from './components/CommissionItemsManager'

export default async function CommissionPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .maybeSingle()

  const profile = profileData as any
  const companyId = profile?.company_id
  if (!companyId) redirect('/login')
  const userRole: 'admin' | 'viewer' = profile?.role ?? 'viewer'

  const { data: items } = await supabase
    .from('commission_items')
    .select('*')
    .eq('company_id', companyId)
    .order('name')

  const commissionItems: CommissionItem[] = (items || []) as CommissionItem[]

  return <CommissionItemsManager items={commissionItems} companyId={companyId} userRole={userRole} />
}
