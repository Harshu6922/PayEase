import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = ['/', '/login', '/signup', '/billing', '/api/razorpay/webhook', '/api/auth/signup', '/api/auth/setup-company', '/onboarding', '/auth', '/contact', '/api/contact', '/viewer', '/api/viewers', '/api/cron']

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)
  const { pathname } = request.nextUrl

  // Skip public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    // If logged-in user visits /login or /signup, send to dashboard
    if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
      const supabaseCheck = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name: string) => request.cookies.get(name)?.value, set: () => {}, remove: () => {} } }
      )
      const { data: { user } } = await supabaseCheck.auth.getUser()
      if (user) return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  }

  // Check subscription status for protected routes
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return response

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.company_id) {
    if (!pathname.startsWith('/onboarding')) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
    return response
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at')
    .eq('company_id', profile.company_id)
    .maybeSingle()

  if (!sub) return response

  let isLocked = sub.status === 'locked' || sub.status === 'cancelled'
  if (sub.status === 'trial' && sub.trial_ends_at) {
    if (new Date(sub.trial_ends_at) < new Date()) isLocked = true
  }

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
