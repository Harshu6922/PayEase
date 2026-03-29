import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyPassword, generateToken } from '@/lib/viewer-auth'
import { isRateLimited, clearRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const { phone, business_id, password } = await req.json()
  if (!phone || !business_id || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (business_id.length > 40 || phone.length > 20 || password.length > 128) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const rateLimitKey = `viewer_login:${business_id}:${phone}`
  if (await isRateLimited(rateLimitKey)) {
    return NextResponse.json({ error: 'Too many attempts. Please try again in 15 minutes.' }, { status: 429 })
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) as any

  const { data: viewer } = await db.from('company_viewers')
    .select('role, password_hash')
    .eq('company_id', business_id)
    .eq('phone', phone)
    .maybeSingle()

  if (!viewer || !verifyPassword(password, viewer.password_hash)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  await db.from('viewer_sessions').insert({
    company_id: business_id,
    phone,
    role: viewer.role,
    token,
    token_expires_at: expiresAt,
  })

  await clearRateLimit(rateLimitKey)

  return NextResponse.json({ token, role: viewer.role, business_id })
}
