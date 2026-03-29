import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { MAX_REFERRALS } from '@/lib/plans'

export async function POST(req: NextRequest) {
  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

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

  // Find referral code owner
  const { data: refCode } = await adminClient
    .from('referral_codes')
    .select('company_id')
    .eq('code', code.toUpperCase())
    .maybeSingle()

  if (!refCode) return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
  if ((refCode as any).company_id === companyId) {
    return NextResponse.json({ error: 'Cannot use your own referral code' }, { status: 400 })
  }

  // Check referrer hasn't hit the monthly cap (3 per calendar month)
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

  const { data: existing } = await adminClient
    .from('referral_discounts')
    .select('id')
    .eq('referrer_company_id', (refCode as any).company_id)
    .gte('created_at', monthStart)
    .lt('created_at', monthEnd)

  if ((existing ?? []).length >= MAX_REFERRALS) {
    return NextResponse.json({ error: 'Referrer has reached the 3-referral monthly limit' }, { status: 400 })
  }

  // Check this company hasn't already been referred
  const { data: alreadyReferred } = await adminClient
    .from('referral_discounts')
    .select('id')
    .eq('referred_company_id', companyId)
    .maybeSingle()

  if (alreadyReferred) {
    return NextResponse.json({ error: 'Your account has already been referred' }, { status: 400 })
  }

  const { error } = await adminClient.from('referral_discounts').insert({
    referrer_company_id: (refCode as any).company_id,
    referred_company_id: companyId,
    active: false,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
