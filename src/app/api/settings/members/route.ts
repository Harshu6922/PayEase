import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('company_id, role').eq('id', user.id).maybeSingle()
  if (!profile?.company_id || profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: companyData }, { data: members }, { data: { users: authUsers } }] = await Promise.all([
    supabase.from('companies').select('name').eq('id', profile.company_id).maybeSingle(),
    supabase.from('profiles').select('id, full_name, role').eq('company_id', profile.company_id),
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const emailMap: Record<string, string> = {}
  for (const au of authUsers ?? []) emailMap[au.id] = au.email ?? ''

  return NextResponse.json({
    companyName: (companyData as any)?.name ?? 'My Company',
    companyId: profile.company_id,
    currentUserId: user.id,
    userEmail: user.email ?? '',
    members: ((members ?? []) as any[]).map(m => ({ ...m, email: emailMap[m.id] ?? '' })),
  })
}
