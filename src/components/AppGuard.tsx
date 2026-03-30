'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'
import Prefetcher from './Prefetcher'

const supabase = createClient()

const UNGUARDED = ['/billing', '/onboarding', '/verify-mfa', '/super-admin']

async function fetchGuardData() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: aal }] = await Promise.all([
    supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ])

  const companyId = (profile as any)?.company_id ?? null
  if (!companyId) return { needsOnboarding: true, needsBilling: false, needsMfa: false }

  const { data: sub } = await supabase
    .from('subscriptions').select('status, trial_ends_at').eq('company_id', companyId).maybeSingle()

  const status = (sub as any)?.status
  const trialEnd = (sub as any)?.trial_ends_at
  const isLocked = status === 'locked' || status === 'cancelled' || status === 'pending' ||
    (status === 'trial' && trialEnd && new Date(trialEnd) < new Date())

  const needsMfa = aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2'

  return { needsOnboarding: false, needsBilling: isLocked, needsMfa }
}

export default function AppGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isUnguarded = UNGUARDED.some(p => pathname.startsWith(p))

  const { data } = useSWR(isUnguarded ? null : 'guard', fetchGuardData, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  useEffect(() => {
    if (!data || isUnguarded) return
    if (data.needsMfa) { router.replace('/verify-mfa'); return }
    if (data.needsOnboarding) { router.replace('/onboarding'); return }
    if (data.needsBilling) { router.replace('/billing'); return }
  }, [data, isUnguarded, router])

  return (
    <>
      {!isUnguarded && <Prefetcher />}
      {children}
    </>
  )
}
