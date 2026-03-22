import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import OnboardingForm from './OnboardingForm'

export default async function OnboardingPage() {
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) redirect('/login')

  // Already set up — go to dashboard
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, company_id')
    .eq('id', user.id)
    .maybeSingle()

  if ((existing as any)?.company_id) redirect('/dashboard')

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: { user: adminUser } } = await adminClient.auth.admin.getUserById(user.id)

  const inviteCompanyId = adminUser?.user_metadata?.company_id

  // Invited user — auto-setup with viewer role
  if (inviteCompanyId) {
    await adminClient.from('profiles').insert({
      id: user.id,
      company_id: inviteCompanyId,
      role: 'viewer',
    })
    redirect('/dashboard')
  }

  // Google OAuth or new user — show company name form
  return <OnboardingForm userId={user.id} email={user.email ?? ''} />
}
