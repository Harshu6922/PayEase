'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// companyId is fetched from the session server-side (not accepted as a parameter)
// to prevent a malicious client from inviting users into a different company.
export async function inviteUser(email: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!(profile as any)?.company_id) return { error: 'No company found' }
  if ((profile as any).role !== 'admin') return { error: 'Only admins can invite users' }

  const adminClient = getAdminClient()
  const origin = headers().get('origin') ?? ''
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { company_id: (profile as any).company_id },
    redirectTo: `${origin}/auth/callback?next=/onboarding`,
  })
  if (error) return { error: error.message }
  return { error: null }
}

export async function changeRole(userId: string, newRole: 'admin' | 'viewer', companyId: string): Promise<{ error: string | null }> {
  // Must use service-role client: profiles_update_own RLS only allows self-updates.
  // Admins updating other members' roles must bypass RLS.
  const adminClient = getAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)
    .eq('company_id', companyId)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { error: null }
}

export async function removeMember(userId: string): Promise<{ error: string | null }> {
  // Deleting the auth user cascades to profiles via FK.
  // Do NOT delete profiles row directly.
  const adminClient = getAdminClient()
  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { error: null }
}
