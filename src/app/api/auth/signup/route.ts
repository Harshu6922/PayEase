import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'

export async function POST(req: NextRequest) {
  const { email, password, companyName, referralCode } = await req.json()

  // Strict input validation
  if (typeof email !== 'string' || typeof password !== 'string' || typeof companyName !== 'string') {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  if (email.length < 5 || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: 'Password must be 8-128 characters' }, { status: 400 })
  }
  if (companyName.trim().length < 2 || companyName.length > 100) {
    return NextResponse.json({ error: 'Company name must be 2-100 characters' }, { status: 400 })
  }
  if (referralCode !== undefined && (typeof referralCode !== 'string' || referralCode.length > 64)) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 })
  }

  const { isRateLimited } = await import('@/lib/rate-limit')
  const rateLimitKey = `signup:${email.toLowerCase().trim()}`
  if (await isRateLimited(rateLimitKey)) {
    return NextResponse.json({ error: 'Too many attempts. Please try again in 15 minutes.' }, { status: 429 })
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Create auth user
  const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authErr || !authData.user) {
    return NextResponse.json({ error: authErr?.message ?? 'Failed to create user' }, { status: 400 })
  }

  const userId = authData.user.id

  // 2. Create company
  const { data: company, error: companyErr } = await adminClient
    .from('companies')
    .insert({ name: companyName })
    .select('id')
    .single()

  if (companyErr || !company) {
    // Rollback user
    await adminClient.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: companyErr?.message ?? 'Failed to create company' }, { status: 500 })
  }

  const companyId = company.id

  // 3. Create profile (admin)
  const { error: profileErr } = await adminClient
    .from('profiles')
    .insert({ id: userId, company_id: companyId, role: 'admin' })

  if (profileErr) {
    await adminClient.auth.admin.deleteUser(userId)
    await adminClient.from('companies').delete().eq('id', companyId)
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  // 4. Create subscription (7-day trial)
  await adminClient.from('subscriptions').insert({
    company_id: companyId,
    plan: 'starter',
    status: 'trial',
    trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  })

  // 5. Generate referral code
  const code = nanoid(8).toUpperCase()
  await adminClient.from('referral_codes').insert({ company_id: companyId, code })

  // 6. Apply referral code if provided
  if (referralCode) {
    const { data: refCodeRow } = await adminClient
      .from('referral_codes')
      .select('company_id')
      .eq('code', referralCode.toUpperCase())
      .maybeSingle()

    if (refCodeRow && refCodeRow.company_id !== companyId) {
      const { MAX_REFERRALS } = await import('@/lib/plans')
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
      const { data: existing } = await adminClient
        .from('referral_discounts')
        .select('id')
        .eq('referrer_company_id', refCodeRow.company_id)
        .gte('created_at', monthStart)
        .lt('created_at', monthEnd)
      if ((existing ?? []).length < MAX_REFERRALS) {
        await adminClient.from('referral_discounts').insert({
          referrer_company_id: refCodeRow.company_id,
          referred_company_id: companyId,
          active: false,
        })
      }
    }
  }

  // Send welcome email
  try {
    const { sendWelcomeEmail } = await import('@/lib/email')
    await sendWelcomeEmail(email, companyName)
  } catch {}

  return NextResponse.json({ success: true })
}
