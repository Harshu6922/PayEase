import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('company_id').eq('id', user.id).maybeSingle()
  const companyId = (profile as any)?.company_id
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const { data } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle()

  return NextResponse.json({ settings: data })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('company_id, role').eq('id', user.id).maybeSingle()
  const companyId = (profile as any)?.company_id
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })
  if ((profile as any)?.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const body = await req.json()
  const { enabled, whatsapp_token, whatsapp_phone_number_id, template_name, send_time,
    sms_api_key, admin_digest_enabled, admin_digest_phone } = body

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await adminClient
    .from('notification_settings')
    .upsert({
      company_id: companyId,
      enabled: enabled ?? false,
      whatsapp_token: whatsapp_token ?? null,
      whatsapp_phone_number_id: whatsapp_phone_number_id ?? null,
      template_name: template_name || 'daily_employee_update',
      send_time: send_time || '18:00',
      sms_api_key: sms_api_key ?? null,
      admin_digest_enabled: admin_digest_enabled ?? false,
      admin_digest_phone: admin_digest_phone ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
