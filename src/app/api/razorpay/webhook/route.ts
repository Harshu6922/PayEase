import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''

  // Verify webhook signature
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')

  if (expectedSig !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)
  const subId = event?.payload?.subscription?.entity?.id

  if (!subId) return NextResponse.json({ ok: true })

  // Find company by subscription ID
  const { data: sub } = await adminClient
    .from('subscriptions')
    .select('company_id')
    .eq('razorpay_subscription_id', subId)
    .maybeSingle()

  if (!sub) return NextResponse.json({ ok: true })

  switch (event.event) {
    case 'subscription.activated':
    case 'subscription.charged': {
      const periodEnd = event?.payload?.subscription?.entity?.current_end
      await adminClient.from('subscriptions').update({
        status: 'active',
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      }).eq('company_id', sub.company_id)

      // Activate referral discount for the referrer now that referred company has paid
      await adminClient.from('referral_discounts')
        .update({ active: true })
        .eq('referred_company_id', sub.company_id)
        .eq('active', false)
      break
    }
    case 'subscription.cancelled':
    case 'subscription.expired': {
      await adminClient.from('subscriptions').update({
        status: 'cancelled',
      }).eq('company_id', sub.company_id)

      // Deactivate referral discounts where this company is the referred one
      await adminClient.from('referral_discounts')
        .update({ active: false })
        .eq('referred_company_id', sub.company_id)
      break
    }
    case 'subscription.pending':
    case 'subscription.halted': {
      await adminClient.from('subscriptions').update({
        status: 'locked',
      }).eq('company_id', sub.company_id)
      break
    }
  }

  return NextResponse.json({ ok: true })
}
