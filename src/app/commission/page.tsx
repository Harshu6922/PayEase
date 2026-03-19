import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CommissionItem } from '@/types'
import CommissionItemsManager from './components/CommissionItemsManager'

export default async function CommissionPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // user is guaranteed non-null here; redirect() throws above
  const userId = user!.id

  const { data: profileData } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .maybeSingle()

  const profile = profileData as { company_id: string | null } | null
  const companyId = profile?.company_id
  if (!companyId) redirect('/login')

  const { data: items } = await supabase
    .from('commission_items')
    .select('*')
    .eq('company_id', companyId)
    .order('name')

  const commissionItems: CommissionItem[] = (items || []) as CommissionItem[]

  return (
    <CommissionItemsManager items={commissionItems} companyId={companyId} />
  )
}
