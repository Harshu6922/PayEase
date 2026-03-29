import { createClient } from './server'
import { redirect } from 'next/navigation'

export async function getServerSession() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .maybeSingle()

  const companyId: string | null = (profile as any)?.company_id ?? null
  const userRole: 'admin' | 'viewer' = (profile as any)?.role ?? 'viewer'

  return { user, companyId, userRole, supabase }
}
