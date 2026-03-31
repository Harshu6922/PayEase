import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRazorpay } from '@/lib/razorpay'
import { PLANS, REFERRAL_DISCOUNT_RS, MAX_REFERRALS, type PlanId } from '@/lib/plans'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { plan, promoCode } = await req.json() as { plan: PlanId; promoCode?: string }
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

  // Validate promo code if provided
  let promoDiscountRs = 0
  let validatedPromo: { id: string; discount_type: string; discount_value: number; uses_count: number } | null = null
  if (promoCode) {
    const { data: promo } = await adminClient
      .from('promo_codes')
      .select('id, discount_type, discount_value, max_uses, uses_count, expires_at, active')
      .eq('code', promoCode.toUpperCase().trim())
      .eq('active', true)
      .maybeSingle()

    if (promo && !(promo.expires_at && new Date(promo.expires_at) < new Date())
        && !(promo.max_uses !== null && promo.uses_count >= promo.max_uses)) {
      validatedPromo = promo
      if (promo.discount_type === 'fixed') {
        promoDiscountRs = Number(promo.discount_value)
      } else {
        promoDiscountRs = Math.round(PLANS[plan].priceRs * Number(promo.discount_value) / 100)
      }
    }
  }

  const totalDiscountRs = referralDiscountRs + promoDiscountRs
  const finalPriceRs = Math.max(0, PLANS[plan].priceRs - totalDiscountRs)
  const finalPricePaise = finalPriceRs * 100

  // Use discounted plan or base plan
  let planId = PLANS[plan].razorpayPlanId

  const razorpay = getRazorpay()

  if (totalDiscountRs > 0 && finalPricePaise > 0) {
    const discountDesc = [
      referralDiscountRs > 0 ? `₹${referralDiscountRs} referral` : '',
      promoDiscountRs > 0 ? `₹${promoDiscountRs} promo` : '',
    ].filter(Boolean).join(' + ')
    const tempPlan = await razorpay.plans.create({
      period: 'monthly',
      interval: 1,
      item: {
        name: `${PLANS[plan].name} (${discountDesc} discount)`,
        amount: finalPricePaise,
        currency: 'INR',
        description: `PayEase ${PLANS[plan].name} plan with ${discountDesc} discount`,
      },
    } as any)
    planId = (tempPlan as any).id
  }

  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    total_count: 120, // 10 years
    quantity: 1,
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

  // Increment promo code usage
  if (validatedPromo) {
    await adminClient
      .from('promo_codes')
      .update({ uses_count: validatedPromo.uses_count + 1 })
      .eq('id', validatedPromo.id)
  }

  return NextResponse.json({
    subscriptionId: (subscription as any).id,
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    amount: finalPricePaise,
    plan,
    discountRs: totalDiscountRs,
  })
}
