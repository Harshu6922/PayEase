import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRazorpay } from '@/lib/razorpay'
import { PLANS, REFERRAL_DISCOUNT_RS, MAX_REFERRALS, type PlanId } from '@/lib/plans'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { plan, promoCode } = await req.json() as { plan: PlanId; promoCode?: string | null }
  if (!PLANS[plan]) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!(profile as any)?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })
  const companyId = (profile as any).company_id

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Calculate referral discount
  const { data: discounts } = await adminClient
    .from('referral_discounts')
    .select('id')
    .eq('referrer_company_id', companyId)
    .eq('active', true)

  const activeReferrals = Math.min((discounts ?? []).length, MAX_REFERRALS)
  const referralDiscountRs = activeReferrals * REFERRAL_DISCOUNT_RS

  // Calculate promo discount
  let promoDiscountRs = 0
  let promoCodeId: string | null = null
  if (promoCode) {
    const { data: promo } = await adminClient
      .from('promo_codes')
      .select('id, discount_type, discount_value, max_uses, uses_count, expires_at')
      .eq('code', promoCode.toUpperCase().trim())
      .eq('active', true)
      .maybeSingle()

    if (promo &&
      !(promo.expires_at && new Date(promo.expires_at) < new Date()) &&
      !(promo.max_uses !== null && promo.uses_count >= promo.max_uses)
    ) {
      const { data: alreadyUsed } = await adminClient
        .from('promo_code_uses')
        .select('id')
        .eq('promo_code_id', promo.id)
        .eq('company_id', companyId)
        .maybeSingle()

      if (!alreadyUsed) {
        promoDiscountRs = promo.discount_type === 'percent'
          ? Math.floor(PLANS[plan].priceRs * promo.discount_value / 100)
          : promo.discount_value
        promoCodeId = promo.id
      }
    }
  }

  const discountRs = referralDiscountRs + promoDiscountRs
  const finalPriceRs = Math.max(0, PLANS[plan].priceRs - discountRs)
  const finalPricePaise = finalPriceRs * 100

  // Use discounted plan or base plan
  let planId = PLANS[plan].razorpayPlanId

  const razorpay = getRazorpay()

  if (discountRs > 0 && finalPricePaise > 0) {
    // Create a one-time plan at the discounted price
    const tempPlan = await razorpay.plans.create({
      period: 'monthly',
      interval: 1,
      item: {
        name: `${PLANS[plan].name} (Referral Discount)`,
        amount: finalPricePaise,
        currency: 'INR',
        description: `PayEase ${PLANS[plan].name} plan with ₹${discountRs} referral discount`,
      },
    } as any)
    planId = (tempPlan as any).id
  }

  // start_at = 7 days from now → free trial period before first charge
  const startAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60

  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    total_count: 120, // 10 years
    quantity: 1,
    start_at: startAt,
  } as any)

  // Save subscription ID to DB
  await adminClient
    .from('subscriptions')
    .update({
      razorpay_subscription_id: (subscription as any).id,
      razorpay_plan_id: planId,
      plan,
    })
    .eq('company_id', companyId)

  // Record promo code usage and increment counter
  if (promoCodeId) {
    await adminClient.from('promo_code_uses').insert({ promo_code_id: promoCodeId, company_id: companyId })
    const { data: promoRow } = await adminClient.from('promo_codes').select('uses_count').eq('id', promoCodeId).single()
    if (promoRow) {
      await adminClient.from('promo_codes').update({ uses_count: (promoRow as any).uses_count + 1 }).eq('id', promoCodeId)
    }
  }

  return NextResponse.json({
    subscriptionId: (subscription as any).id,
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    amount: finalPricePaise,
    plan,
    discountRs,
  })
}
