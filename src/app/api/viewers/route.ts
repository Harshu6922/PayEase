import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { hashPassword } from '@/lib/viewer-auth'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) as any
}

async function getCompanyId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('company_id').eq('id', userId).maybeSingle()
  return data?.company_id ?? null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const companyId = await getCompanyId(supabase, user.id)
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const { data } = await getAdmin().from('company_viewers')
    .select('phone, role, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ viewers: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { phone, role, password } = await req.json()
  if (!phone || !role || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (!['ca', 'manager', 'partner'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const companyId = await getCompanyId(supabase, user.id)
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const { error } = await getAdmin().from('company_viewers').insert({
    company_id: companyId, phone, role, password_hash: hashPassword(password),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
