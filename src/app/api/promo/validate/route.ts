import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const adminClient = () => createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'No code provided' }, { status: 400 })

  const { data: promo } = await adminClient()
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('active', true)
    .maybeSingle()

  if (!promo) return NextResponse.json({ error: 'Invalid or inactive promo code' }, { status: 404 })

  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This promo code has expired' }, { status: 400 })
  }

  if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) {
    return NextResponse.json({ error: 'This promo code has reached its usage limit' }, { status: 400 })
  }

  return NextResponse.json({
    valid: true,
    discount_type: promo.discount_type,
    discount_value: promo.discount_value,
  })
}
