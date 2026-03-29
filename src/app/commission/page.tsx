import { getServerSession } from '@/lib/supabase/session'
import { redirect } from 'next/navigation'
import { CommissionItem } from '@/types'
import CommissionItemsManager from './components/CommissionItemsManager'

export default async function CommissionPage() {
  const { companyId, userRole, supabase } = await getServerSession()
  if (!companyId) redirect('/login')

  const { data: items } = await supabase
    .from('commission_items').select('*').eq('company_id', companyId).order('name')

  return (
    <CommissionItemsManager
      items={(items || []) as CommissionItem[]}
      companyId={companyId}
      userRole={userRole}
    />
  )
}
