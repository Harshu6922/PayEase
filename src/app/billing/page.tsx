import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCompanySubscription, getReferralDiscount } from '@/lib/subscription'
import BillingClient from './BillingClient'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!(profile as any)?.company_id) redirect('/login')

  const companyId = (profile as any).company_id

  const [subscription, referralDiscount] = await Promise.all([
    getCompanySubscription(companyId),
    getReferralDiscount(companyId),
  ])

  const { data: refCode } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('company_id', companyId)
    .maybeSingle()

  const { data: referralCountData } = await supabase
    .from('referral_discounts')
    .select('id')
    .eq('referrer_company_id', companyId)
    .eq('active', true)

  return (
    <BillingClient
      subscription={subscription}
      referralCode={(refCode as any)?.code ?? null}
      activeReferrals={(referralCountData ?? []).length}
      referralDiscountRs={referralDiscount}
      companyId={companyId}
    />
  )
}
