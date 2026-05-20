import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { hashPassword } from '@/lib/viewer-auth'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) as any
}

async function requireAdmin(supabase: any): Promise<{ userId: string; companyId: string } | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('company_id, role').eq('id', user.id).maybeSingle()
  if (!data?.company_id || data?.role !== 'admin') return null
  return { userId: user.id, companyId: data.company_id }
}

export async function GET() {
  const supabase = await createClient()
  const ctx = await requireAdmin(supabase)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await getAdmin().from('company_viewers')
    .select('phone, role, created_at')
    .eq('company_id', ctx.companyId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ viewers: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { phone, role, password } = await req.json()
  if (typeof phone !== 'string' || typeof role !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  // Input validation
  if (phone.length < 6 || phone.length > 20) return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
  if (password.length < 8 || password.length > 128) return NextResponse.json({ error: 'Password must be 8-128 chars' }, { status: 400 })
  if (!['ca', 'manager', 'partner'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const supabase = await createClient()
  const ctx = await requireAdmin(supabase)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await getAdmin().from('company_viewers').insert({
    company_id: ctx.companyId, phone, role, password_hash: hashPassword(password),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
