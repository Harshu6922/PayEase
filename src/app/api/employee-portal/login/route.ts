import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { verifyPassword, generateToken } from '@/lib/viewer-auth'
import { isRateLimited, clearRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const { company_id, employee_display_id, password } = await req.json()

  if (!company_id || !employee_display_id || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const rateLimitKey = `emp_login:${company_id}:${employee_display_id.toLowerCase()}`
  if (await isRateLimited(rateLimitKey)) {
    return NextResponse.json({ error: 'Too many attempts. Please try again in 15 minutes.' }, { status: 429 })
  }

  const db = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ) as any

  const { data: employee } = await db
    .from('employees')
    .select('id, full_name, portal_password_hash')
    .eq('company_id', company_id)
    .eq('employee_id', employee_display_id)
    .eq('is_active', true)
    .maybeSingle()

  if (!employee || !employee.portal_password_hash) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  if (!verifyPassword(password, employee.portal_password_hash)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = generateToken()
  const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  await db.from('employee_sessions').insert({
    employee_id: employee.id,
    company_id,
    token,
    token_expires_at: tokenExpiresAt,
  })

  await clearRateLimit(rateLimitKey)

  return NextResponse.json({
    token,
    employee_name: employee.full_name,
    employee_uuid: employee.id,
  })
}
