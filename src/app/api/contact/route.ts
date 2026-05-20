import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isRateLimited } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const { name, email, issueType, message } = await req.json()

  // Strict validation matches the RLS WITH CHECK constraints on contact_submissions.
  if (typeof name !== 'string' || typeof email !== 'string' || typeof issueType !== 'string' || typeof message !== 'string') {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }
  if (name.trim().length < 1 || name.length > 100) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
  }
  if (email.length < 5 || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }
  if (issueType.length === 0 || issueType.length > 50) {
    return NextResponse.json({ error: 'Invalid issue type' }, { status: 400 })
  }
  if (message.trim().length < 1 || message.length > 5000) {
    return NextResponse.json({ error: 'Message must be 1-5000 chars' }, { status: 400 })
  }

  // Rate-limit anonymous contact spam by IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (await isRateLimited(`contact:${ip}`, { maxAttempts: 5, windowMs: 60 * 60 * 1000 })) {
    return NextResponse.json({ error: 'Too many submissions. Please try later.' }, { status: 429 })
  }

  const supabase = await createClient()

  // Optionally attach company_id if user is logged in
  const { data: { user } } = await supabase.auth.getUser()
  let companyId: string | null = null
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle()
    companyId = (profile as any)?.company_id ?? null
  }

  const { error } = await (supabase as any).from('contact_submissions').insert({
    name,
    email,
    issue_type: issueType,
    message,
    company_id: companyId,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
