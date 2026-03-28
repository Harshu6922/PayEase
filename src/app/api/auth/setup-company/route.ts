import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import { MAX_REFERRALS } from '@/lib/plans'

export async function POST(req: NextRequest) {
  const { companyName, ownerName, city, teamSize, referralCode } = await req.json()
  if (!companyName) return NextResponse.json({ error: 'Company name required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check profile doesn't already exist
  const { data: existing } = await adminClient
    .from('profiles').select('company_id').eq('id', user.id).maybeSingle()
  if ((existing as any)?.company_id) {
    return NextResponse.json({ error: 'Company already set up' }, { status: 400 })
  }

  // Create company
  const { data: company, error: companyErr } = await adminClient
    .from('companies').insert({
      name: companyName,
      ...(ownerName && { owner_name: ownerName }),
      ...(city && { city }),
      ...(teamSize && { team_size: teamSize }),
    }).select('id').single()
  if (companyErr || !company) {
    return NextResponse.json({ error: companyErr?.message ?? 'Failed to create company' }, { status: 500 })
  }

  const companyId = company.id

  // Create profile
  await adminClient.from('profiles').insert({ id: user.id, company_id: companyId, role: 'admin' })

  // Create trial subscription
  await adminClient.from('subscriptions').insert({
    company_id: companyId,
    plan: 'starter',
    status: 'trial',
    trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  })

  // Generate referral code
  const code = nanoid(8).toUpperCase()
  await adminClient.from('referral_codes').insert({ company_id: companyId, code })

  // Apply referral code if provided
  if (referralCode) {
    const { data: refRow } = await adminClient
      .from('referral_codes').select('company_id').eq('code', referralCode.toUpperCase()).maybeSingle()
    if (refRow && (refRow as any).company_id !== companyId) {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
      const { data: existing } = await adminClient
        .from('referral_discounts').select('id')
        .eq('referrer_company_id', (refRow as any).company_id)
        .gte('created_at', monthStart)
        .lt('created_at', monthEnd)
      if ((existing ?? []).length < MAX_REFERRALS) {
        await adminClient.from('referral_discounts').insert({
          referrer_company_id: (refRow as any).company_id,
          referred_company_id: companyId,
          active: true,
        })
      }
    }
  }

  return NextResponse.json({ success: true })
}
