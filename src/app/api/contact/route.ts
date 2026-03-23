import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { name, email, issueType, message } = await req.json()
  if (!name || !email || !issueType || !message) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
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
