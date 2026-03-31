import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function validateSecret(req: NextRequest) {
  return req.headers.get('x-super-admin-secret') === process.env.SUPER_ADMIN_SECRET
}

const adminClient = () => createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  if (!validateSecret(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data } = await adminClient().from('promo_codes').select('*').order('created_at', { ascending: false })
  return NextResponse.json({ promos: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!validateSecret(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { code, discount_type, discount_value, max_uses, expires_at } = body

  if (!code || !discount_type || !discount_value) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data, error } = await adminClient().from('promo_codes').insert({
    code: code.toUpperCase().trim(),
    discount_type,
    discount_value: Number(discount_value),
    max_uses: max_uses ? Number(max_uses) : null,
    expires_at: expires_at || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ promo: data })
}

export async function PATCH(req: NextRequest) {
  if (!validateSecret(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id, active } = await req.json()
  await adminClient().from('promo_codes').update({ active }).eq('id', id)
  return NextResponse.json({ ok: true })
}
