import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const PUBLIC_PATHS = ['/', '/login', '/signup', '/billing', '/api/razorpay/webhook', '/api/auth/signup', '/api/auth/setup-company', '/onboarding', '/auth', '/contact', '/api/contact', '/viewer', '/api/viewers', '/api/cron', '/super-admin', '/api/super-admin', '/verify-mfa']

// Each Supabase call in middleware is time-boxed. If Supabase is slow/asleep,
// we resolve with a fallback instead of letting the edge function hang until
// Vercel kills it with a site-wide MIDDLEWARE_INVOCATION_TIMEOUT (504).
const SUPABASE_TIMEOUT_MS = 3000

function withTimeout<T>(p: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>(resolve => {
    let settled = false
    const done = (v: T) => { if (!settled) { settled = true; clearTimeout(timer); resolve(v) } }
    const timer = setTimeout(() => done(fallback), ms)
    Promise.resolve(p).then(done, () => done(fallback))
  })
}

const isPublic = (pathname: string) =>
  PUBLIC_PATHS.some(p => (p === '/' ? pathname === '/' : pathname.startsWith(p)))

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove: (name: string, options: CookieOptions) => {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Single, time-boxed auth check (the previous middleware made this call up to
  // three times per request). timedOut=true means Supabase was too slow — we
  // then fail OPEN rather than 504 or wrongly bounce the user to /login.
  const auth = await withTimeout(
    supabase.auth.getUser().then(r => ({ user: r.data.user, timedOut: false })),
    SUPABASE_TIMEOUT_MS,
    { user: null as null | Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'], timedOut: true }
  )
  const user = auth.user

  // Public paths: keep the session fresh and bounce signed-in users into the app.
  if (isPublic(pathname)) {
    if (user && (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  }

  // Protected paths.
  if (auth.timedOut) return response // Supabase slow → let the page render/handle auth itself.
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  // Enforce MFA if enrolled (time-boxed; skip on slowness rather than hang).
  const aal = await withTimeout(
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(r => r.data),
    SUPABASE_TIMEOUT_MS,
    null
  )
  if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    return NextResponse.redirect(new URL('/verify-mfa', request.url))
  }

  // Profile + subscription gating (time-boxed; fail open if the DB is slow).
  const profile = (await withTimeout(
    supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle().then(r => r.data),
    SUPABASE_TIMEOUT_MS,
    null
  )) as { company_id?: string } | null

  if (profile === null) return response // DB slow/unknown → don't trap the user behind a 504.
  if (!profile.company_id) {
    if (!pathname.startsWith('/onboarding')) return NextResponse.redirect(new URL('/onboarding', request.url))
    return response
  }

  const sub = (await withTimeout(
    supabase.from('subscriptions').select('status, trial_ends_at').eq('company_id', profile.company_id).maybeSingle().then(r => r.data),
    SUPABASE_TIMEOUT_MS,
    null
  )) as { status?: string; trial_ends_at?: string | null } | null

  if (!sub) return response

  let isLocked = sub.status === 'locked' || sub.status === 'cancelled'
  if (sub.status === 'trial' && sub.trial_ends_at && new Date(sub.trial_ends_at) < new Date()) isLocked = true
  if (isLocked && !pathname.startsWith('/billing')) {
    return NextResponse.redirect(new URL('/billing', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
