import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function DELETE(_req: NextRequest, { params }: { params: { phone: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await (supabase as any).from('profiles').select('company_id').eq('id', user.id).maybeSingle()
  if (!profile?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const phone = decodeURIComponent(params.phone)
  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) as any

  await db.from('viewer_sessions').delete().eq('company_id', profile.company_id).eq('phone', phone)
  const { error } = await db.from('company_viewers').delete().eq('company_id', profile.company_id).eq('phone', phone)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
