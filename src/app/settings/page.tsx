import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('company_id, role, full_name')
    .eq('id', user.id)
    .single()

  const profile = profileData as any
  if (!profile?.company_id) return <div className="p-8 text-red-600">No company associated with this profile.</div>

  // Viewers cannot access settings
  if (profile.role !== 'admin') redirect('/dashboard')

  const { data: companyData } = await supabase
    .from('companies')
    .select('name')
    .eq('id', profile.company_id)
    .maybeSingle()

  // Fetch all profiles in company (anon client + RLS is fine — profiles_read allows this)
  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('company_id', profile.company_id)

  // Get emails from auth.users — requires service role client
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  const emailMap: Record<string, string> = {}
  for (const au of authUsers ?? []) {
    emailMap[au.id] = au.email ?? ''
  }

  const membersWithEmail = ((members ?? []) as any[]).map(m => ({
    ...m,
    email: emailMap[m.id] ?? '',
  }))

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#F7F6F3' }}>
      <SettingsClient
        companyName={(companyData as any)?.name ?? 'My Company'}
        companyId={profile.company_id}
        currentUserId={user.id}
        members={membersWithEmail}
      />
    </div>
  )
}
