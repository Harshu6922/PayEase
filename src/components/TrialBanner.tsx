import { createClient } from '@/lib/supabase/server'
import { getCompanySubscription } from '@/lib/subscription'
import TrialBannerUI from './TrialBannerUI'

export default async function TrialBanner() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles').select('company_id').eq('id', user.id).maybeSingle()
    const companyId = (profile as any)?.company_id
    if (!companyId) return null

    const subscription = await getCompanySubscription(companyId)
    if (!subscription || subscription.status !== 'trial') return null

    return <TrialBannerUI daysLeft={subscription.daysLeftInTrial} />
  } catch {
    return null
  }
}
