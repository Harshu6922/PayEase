import { createClient } from '@/lib/supabase/server'
import { PLANS, REFERRAL_DISCOUNT_RS, MAX_REFERRALS, type PlanId } from './plans'

export type SubscriptionStatus = 'trial' | 'active' | 'locked' | 'cancelled'

export interface CompanySubscription {
  plan: PlanId
  status: SubscriptionStatus
  trialEndsAt: Date | null
  employeeLimit: number
  daysLeftInTrial: number | null
  isLocked: boolean
  razorpaySubscriptionId: string | null
}

export async function getCompanySubscription(companyId: string): Promise<CompanySubscription | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle()

  if (!data) return null

  const row = data as any
  const plan = (row.plan as PlanId) ?? 'starter'
  let status = row.status as SubscriptionStatus

  // Auto-lock if trial expired and still on trial
  if (status === 'trial' && row.trial_ends_at) {
    const trialEnd = new Date(row.trial_ends_at)
    if (trialEnd < new Date()) {
      status = 'locked'
      // Update in DB (fire-and-forget)
      ;(supabase as any).from('subscriptions').update({ status: 'locked' }).eq('company_id', companyId)
    }
  }

  const trialEndsAt = row.trial_ends_at ? new Date(row.trial_ends_at) : null
  const daysLeftInTrial =
    status === 'trial' && trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000))
      : null

  return {
    plan,
    status,
    trialEndsAt,
    employeeLimit: PLANS[plan].employeeLimit,
    daysLeftInTrial,
    isLocked: status === 'locked' || status === 'cancelled',
    razorpaySubscriptionId: row.razorpay_subscription_id ?? null,
  }
}

export async function getReferralDiscount(companyId: string): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('referral_discounts')
    .select('id')
    .eq('referrer_company_id', companyId)
    .eq('active', true)

  const activeReferrals = Math.min((data ?? []).length, MAX_REFERRALS)
  return activeReferrals * REFERRAL_DISCOUNT_RS
}
