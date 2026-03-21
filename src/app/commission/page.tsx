import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CommissionItem } from '@/types'
import CommissionItemsManager from './components/CommissionItemsManager'

export default async function CommissionPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const userId = user!.id

  const { data: profileData } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', userId)
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

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#F7F6F3' }}>
      <CommissionItemsManager items={commissionItems} companyId={companyId} userRole={userRole} />
    </div>
  )
}
