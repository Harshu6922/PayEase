import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'

export async function POST(req: NextRequest) {
  const { email, password, companyName, referralCode } = await req.json()

  if (!email || !password || !companyName) {
    return NextResponse.json({ error: 'Email, password and company name are required' }, { status: 400 })
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

  // 4. Create subscription (pending — trial starts after autopay mandate is set up)
  await adminClient.from('subscriptions').insert({
    company_id: companyId,
    plan: 'starter',
    status: 'pending',
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
