import { getServerSession } from '@/lib/supabase/session'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const { user, companyId, userRole, supabase } = await getServerSession()
  if (!companyId) redirect('/login')
  if (userRole !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: companyData }, { data: members }, { data: { users: authUsers } }] = await Promise.all([
    supabase.from('companies').select('name').eq('id', companyId).maybeSingle(),
    supabase.from('profiles').select('id, full_name, role').eq('company_id', companyId),
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const emailMap: Record<string, string> = {}
  for (const au of authUsers ?? []) emailMap[au.id] = au.email ?? ''

  const membersWithEmail = ((members ?? []) as any[]).map(m => ({ ...m, email: emailMap[m.id] ?? '' }))

  return (
    <SettingsClient
      companyName={(companyData as any)?.name ?? 'My Company'}
      companyId={companyId}
      currentUserId={user.id}
      userEmail={user.email ?? ''}
      members={membersWithEmail}
    />
  )
}
