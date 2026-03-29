import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { PLANS, type PlanId } from '@/lib/plans'

export async function POST(req: NextRequest) {
  const { code, plan } = await req.json() as { code: string; plan: PlanId }
  if (!code || !plan || !PLANS[plan]) {
    return NextResponse.json({ valid: false, error: 'Invalid request' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ valid: false, error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('company_id').eq('id', user.id).maybeSingle()
  const companyId = (profile as any)?.company_id
  if (!companyId) return NextResponse.json({ valid: false, error: 'No company' }, { status: 400 })

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch promo code
  const { data: promo } = await adminClient
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('active', true)
    .maybeSingle()

  if (!promo) return NextResponse.json({ valid: false, error: 'Invalid or expired promo code' })

  // Check expiry
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: 'This promo code has expired' })
  }

  // Check max uses
  if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) {
    return NextResponse.json({ valid: false, error: 'This promo code has reached its usage limit' })
  }

  // Check if this company already used it
  const { data: existing } = await adminClient
    .from('promo_code_uses')
    .select('id')
    .eq('promo_code_id', promo.id)
    .eq('company_id', companyId)
    .maybeSingle()

  if (existing) return NextResponse.json({ valid: false, error: 'You have already used this promo code' })

  // Calculate discount
  const planPrice = PLANS[plan].priceRs
  const discountRs = promo.discount_type === 'percent'
    ? Math.floor(planPrice * promo.discount_value / 100)
    : promo.discount_value

  return NextResponse.json({
    valid: true,
    promoId: promo.id,
    discountRs: Math.min(discountRs, planPrice),
    discountType: promo.discount_type,
    discountValue: promo.discount_value,
    message: promo.discount_type === 'percent'
      ? `${promo.discount_value}% off applied!`
      : `₹${promo.discount_value} off applied!`,
  })
}
