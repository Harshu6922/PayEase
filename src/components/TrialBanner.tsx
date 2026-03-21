import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function TrialBanner() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles').select('company_id').eq('id', user.id).maybeSingle()
    if (!(profile as any)?.company_id) return null

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, trial_ends_at')
      .eq('company_id', (profile as any).company_id)
      .maybeSingle()

    const row = sub as { status: string; trial_ends_at: string } | null
    if (!row || row.status !== 'trial' || !row.trial_ends_at) return null

    const daysLeft = Math.max(0, Math.ceil(
      (new Date(row.trial_ends_at).getTime() - Date.now()) / 86400000
    ))

    if (daysLeft <= 0) return null

    return (
      <div className="bg-amber-500 text-amber-950 text-xs font-medium px-4 py-1.5 flex items-center justify-between">
        <span>
          Free trial — <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong> remaining
        </span>
        <Link href="/billing" className="underline underline-offset-2 font-semibold hover:text-amber-900">
          Subscribe now →
        </Link>
      </div>
    )
  } catch {
    return null
  }
}
