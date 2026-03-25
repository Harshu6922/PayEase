import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { generateSnapshot } from '@/lib/snapshot'

export async function POST(_req: NextRequest, { params }: { params: { companyId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await (supabase as any).from('profiles').select('company_id, role').eq('id', user.id).maybeSingle()
  if (profile?.company_id !== params.companyId || profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) as any

  // Rate limit: once per hour
  const { data: latest } = await db.from('business_snapshots')
    .select('generated_at')
    .eq('company_id', params.companyId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latest && Date.now() - new Date(latest.generated_at).getTime() < 60 * 60 * 1000) {
    return NextResponse.json({ error: 'Rate limited. Try again in an hour.', last_generated: latest.generated_at }, { status: 429 })
  }

  const data = await generateSnapshot(params.companyId)
  await db.from('business_snapshots').upsert(
    { company_id: params.companyId, snapshot_date: data.generated_at.split('T')[0], generated_at: data.generated_at, data },
    { onConflict: 'company_id,snapshot_date' }
  )
  return NextResponse.json({ ok: true, generated_at: data.generated_at })
}
