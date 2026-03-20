import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

export default async function OnboardingPage() {
  const supabase = await createClient()

  // Get session (established by /auth/callback before redirect here)
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) redirect('/login')

  // Check if profile already exists (idempotent — safe to visit multiple times)
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, company_id')
    .eq('id', user.id)
    .maybeSingle()

  if (existing?.company_id) {
    // Profile already set up — go to dashboard
    redirect('/dashboard')
  }

  // Read company_id from invite metadata — requires service role (anon getUser()
  // does not expose user_metadata set by inviteUserByEmail)
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: { user: adminUser }, error: adminErr } = await adminClient.auth.admin.getUserById(user.id)
  if (adminErr || !adminUser) redirect('/login?error=onboarding_failed')

  const companyId = adminUser.user_metadata?.company_id
  if (!companyId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Invite error</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            This invite link is missing company information. Please ask your admin to resend the invite.
          </p>
        </div>
      </div>
    )
  }

  // Insert profile with viewer role via service role client (bypasses RLS — no INSERT policy on profiles)
  const { error: insertErr } = await adminClient
    .from('profiles')
    .insert({ id: user.id, company_id: companyId, role: 'viewer' })

  if (insertErr) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Setup failed</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{insertErr.message}</p>
        </div>
      </div>
    )
  }

  redirect('/dashboard')
}
